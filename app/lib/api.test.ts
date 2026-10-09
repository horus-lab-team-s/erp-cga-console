import { beforeEach, describe, expect, it, vi } from "vitest";

import { appeler, BASE_API, ErreurApi, telecharger, TEMOIN_SESSION } from "./api";

/**
 * Le client du backend, éprouvé sur ce qu'il promet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EST LE PREMIER
 *
 * Tout ce que la console affiche passe par `appeler`. Un défaut ici ne casse pas
 * un écran : il en casse trente, et de façons différentes selon la route. C'est
 * aussi le seul endroit où se décide ce que l'utilisateur LIT quand ça rate —
 * « 422 Unprocessable Entity » ou « le montant doit être positif ».
 *
 * ⚠️ LES ADRESSES EMPLOYÉES ICI SONT DE VRAIES ROUTES, ET CE N'EST PAS UN
 * DÉTAIL DE RÉALISME.
 *
 * `outils/contrat_des_ecrans.py` parcourt TOUS les fichiers TypeScript du
 * dépôt — les cas d'essai compris — et confronte chaque appel aux routes du
 * serveur. Une adresse inventée pour l'exemple y est relevée « aucune route ne
 * correspond », et le banc d'essai casse alors l'outil de vérification du
 * projet. Constaté : « /comptabilite/export », écrit pour illustrer un
 * téléchargement, n'existe pas.
 *
 * ⚠️ `next/headers` EST DOUBLÉ. `cookies()` lève hors d'un contexte de requête,
 * ce qui est voulu en production et impraticable ici. La doublure rend un
 * magasin minimal ; ce qui est vérifié, c'est que le témoin part — ou ne part
 * pas — sous le bon nom.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Un dossier d'essai, employé dans les adresses **paramétrées**.
 *
 * ⚠️ `outils/contrat_des_ecrans.py` lit la FORME de l'adresse : `${...}` lui dit
 * « ici, un paramètre », et il retrouve la route `{entreprise}`. Une valeur
 * concrète écrite en dur ne correspond à aucune route déclarée, et l'outil la
 * relève — à juste titre.
 */
const DOSSIER = "M081234567890P";

const temoinPose = vi.fn<(nom: string) => { value: string } | undefined>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nom: string) => temoinPose(nom) }),
}));

/** Une réponse du backend, aussi proche que possible de la vraie. */
function reponse(
  corps: unknown,
  { statut = 200, entetes = {} }: { statut?: number; entetes?: Record<string, string> } = {},
): Response {
  const texte = typeof corps === "string" ? corps : JSON.stringify(corps);
  return new Response(statut === 204 ? null : texte, {
    status: statut,
    headers: { "content-type": "application/json", ...entetes },
  });
}

function doublerFetch(...reponses: Response[]) {
  const doublure = vi.fn<typeof fetch>();
  for (const r of reponses) doublure.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

beforeEach(() => {
  temoinPose.mockReset();
  temoinPose.mockReturnValue(undefined);
});

describe("Le témoin de session", () => {
  it("ne part pas sur une route publique", async () => {
    temoinPose.mockReturnValue({ value: "jeton-de-session" });
    const f = doublerFetch(reponse({ ok: true }));

    await appeler("/souscription/services");

    const entetes = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    // ⚠️ La vitrine consomme les mêmes fonctions que la console. Envoyer le
    // témoin « au cas où » le ferait voyager sur des routes publiques.
    expect(entetes.Cookie).toBeUndefined();
  });

  it("part sous le nom que le backend attend quand la route l'exige", async () => {
    temoinPose.mockReturnValue({ value: "jeton-de-session" });
    const f = doublerFetch(reponse({ ok: true }));

    await appeler("/portefeuille/entreprises", { authentifie: true });

    const entetes = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(entetes.Cookie).toBe(`${TEMOIN_SESSION}=jeton-de-session`);
    // ⚠️ Le nom est aligné sur `NOM_TEMOIN` du contexte K. S'il dérive d'un
    // côté, la session est ignorée en silence et l'écran dit « session absente »
    // alors que l'utilisateur vient de se connecter.
    expect(TEMOIN_SESSION).toBe("cga_session");
  });

  it("n'invente pas d'en-tête quand aucune session n'est ouverte", async () => {
    const f = doublerFetch(reponse({ ok: true }));

    await appeler("/portefeuille/entreprises", { authentifie: true });

    const entetes = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(entetes.Cookie).toBeUndefined();
  });
});

describe("Ce que l'utilisateur lit quand ça rate", () => {
  it("rend le motif écrit par le backend, pas le statut", async () => {
    doublerFetch(reponse({ detail: "Exercice déjà clos" }, { statut: 409 }));

    await expect(appeler(`/cloture/dossiers/${DOSSIER}/exercices/${"2025"}/cloture`, { methode: "POST" })).rejects.toThrow(
      "Exercice déjà clos",
    );
  });

  it("porte le statut, pour que l'appelant distingue un refus d'une absence", async () => {
    doublerFetch(reponse({ detail: "Dossier inconnu" }, { statut: 404 }));

    // ⚠️ Le backend rend 404 — et non 403 — sur un dossier d'un autre locataire :
    // dire « interdit » confirmerait son existence. L'interface doit donc pouvoir
    // lire le statut sans le déduire du texte.
    await expect(appeler(`/portefeuille/entreprises/${DOSSIER}`)).rejects.toMatchObject({
      name: "ErreurApi",
      statut: 404,
    });
  });

  it("dépiaute une erreur de validation FastAPI jusqu'à la phrase lisible", async () => {
    doublerFetch(
      reponse(
        {
          detail: [
            { msg: "Value error, le montant doit être positif", loc: ["body", "conditions", 1] },
            { msg: "un second message, qu'on n'affiche pas", loc: ["body"] },
          ],
        },
        { statut: 422 },
      ),
    );

    // L'enrobage `Value error, ` de pydantic est ôté ; le chemin reste, parce
    // qu'il dit QUELLE ligne du formulaire est en cause.
    await expect(appeler(`/comptabilite/dossiers/${DOSSIER}/ecritures`, { methode: "POST" })).rejects.toThrow(
      "le montant doit être positif (body → conditions → 1)",
    );
  });

  it("garde le statut quand le corps n'est pas du JSON", async () => {
    // Une passerelle en panne rend du HTML. Le client ne doit pas s'y casser :
    // une exception de lecture ici masquerait la vraie erreur.
    doublerFetch(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(appeler("/sante")).rejects.toThrow("502");
  });

  it("dit quoi faire quand le backend est éteint", async () => {
    const doublure = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", doublure);

    // ⚠️ « TypeError: fetch failed » n'apprend rien à qui démarre le projet.
    // Le message nomme l'adresse essayée et la commande qui manque.
    const erreur = await appeler("/sante").catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ErreurApi);
    expect((erreur as ErreurApi).statut).toBeNull();
    expect((erreur as ErreurApi).message).toContain(BASE_API);
    expect((erreur as ErreurApi).message).toContain("uvicorn");
  });
});

describe("Les réponses qui n'en sont pas tout à fait", () => {
  it("rend `undefined` sur un 204 sans lire de corps", async () => {
    doublerFetch(new Response(null, { status: 204 }));

    // ⚠️ Un 204 n'a pas de corps. Tenter de le lire en JSON lève « Unexpected
    // end of JSON input », et l'écran annonce une erreur là où tout s'est bien
    // passé.
    await expect(appeler("/transverse/session", { methode: "DELETE" })).resolves.toBeUndefined();
  });

  it("rend le corps d'un 429 déclaré comme une réponse", async () => {
    doublerFetch(reponse({ etat: "suspect", motif: "latence" }, { statut: 429 }));

    // La convention de Consul : 429 « suspect », 503 « en panne », avec le motif
    // dans le corps. Sans `accepter`, le client lèverait et l'écran perdrait la
    // seule chose à lire.
    await expect(appeler(`/transverse/services/${"consul"}/sante`, { accepter: [429, 503] })).resolves.toEqual({
      etat: "suspect",
      motif: "latence",
    });
  });

  it("lève quand même sur un statut non déclaré", async () => {
    doublerFetch(reponse({ detail: "interdit" }, { statut: 403 }));

    await expect(appeler(`/transverse/services/${"consul"}/sante`, { accepter: [429] })).rejects.toThrow("interdit");
  });
});

describe("Ce qui part sur le réseau", () => {
  it("ne met aucun cache par défaut", async () => {
    const f = doublerFetch(reponse({}));

    await appeler("/pilotage/tableau-de-bord");

    // ⚠️ Presque tout ici dépend d'une date ou d'un droit. Une réponse en cache,
    // c'est un verdict périmé après un changement de règle — ou les dossiers
    // d'un collaborateur montrés à un autre.
    expect((f.mock.calls[0][1] as RequestInit).cache).toBe("no-store");
  });

  it("n'active le cache que là où on le demande, en secondes", async () => {
    const f = doublerFetch(reponse({}));

    await appeler("/conformite/regles", { cache: 3600 });

    const options = f.mock.calls[0][1] as RequestInit & { next?: { revalidate: number } };
    expect(options.next?.revalidate).toBe(3600);
    expect(options.cache).toBeUndefined();
  });

  it("sérialise le corps et annonce du JSON", async () => {
    const f = doublerFetch(reponse({}));

    await appeler(`/comptabilite/dossiers/${DOSSIER}/ecritures`, { methode: "POST", corps: { montant: 1500 } });

    const options = f.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.body).toBe('{"montant":1500}');
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("laisse `fetch` poser la frontière d'un envoi de fichier", async () => {
    const f = doublerFetch(reponse({}));
    const formulaire = new FormData();
    formulaire.append("fichier", new Blob(["x"]), "facture.pdf");

    await appeler("/collecte/pieces", { methode: "POST", formulaire });

    const options = f.mock.calls[0][1] as RequestInit;
    expect(options.body).toBe(formulaire);
    // ⚠️ Poser `Content-Type: multipart/form-data` à la main OMET la frontière,
    // que seul `fetch` connaît. Le backend reçoit alors un corps qu'il ne sait
    // pas découper, et rend 422 sur un fichier parfaitement valide.
    expect((options.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });
});

describe("Le téléchargement d'un fichier", () => {
  it("rend les octets intacts, sans les décoder", async () => {
    // « é » en cp1252, l'encodage qu'attend Sage. Décodé en UTF-8 puis
    // réencodé, il deviendrait « Ã© » — et le client ne le verrait qu'après
    // l'import dans son logiciel.
    const octetsSource = new Uint8Array([0x44, 0x65, 0x62, 0x69, 0x74, 0xe9]);
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(octetsSource, {
          status: 200,
          headers: {
            "content-type": "text/csv; charset=cp1252",
            "content-disposition": 'attachment; filename="export-sage.csv"',
          },
        }),
      ),
    );

    const fichier = await telecharger("/conformite/derogations/export");

    expect(Array.from(fichier.octets)).toEqual(Array.from(octetsSource));
    expect(fichier.typeMime).toBe("text/csv; charset=cp1252");
    expect(fichier.nom).toBe("export-sage.csv");
  });

  it("se rabat sur un nom quelconque plutôt que de rendre `undefined`", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 })),
    );

    // Un nom manquant ferait enregistrer un fichier appelé « undefined ».
    await expect(telecharger("/conformite/derogations/export")).resolves.toMatchObject({ nom: "export" });
  });

  it("transmet le témoin, parce qu'un export est toujours nominatif", async () => {
    temoinPose.mockReturnValue({ value: "jeton" });
    const f = doublerFetch(new Response(new Uint8Array([1]), { status: 200 }));

    await telecharger("/conformite/derogations/export");

    const entetes = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(entetes.Cookie).toBe(`${TEMOIN_SESSION}=jeton`);
  });

  it("rend le motif du refus, pas un fichier vide", async () => {
    doublerFetch(reponse({ detail: "Exercice non clos" }, { statut: 409 }));

    // Sans ce chemin, un refus produirait un fichier de zéro octet que le
    // client ouvrirait sans comprendre.
    await expect(telecharger("/conformite/derogations/export")).rejects.toThrow("Exercice non clos");
  });
});
