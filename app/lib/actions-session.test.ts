import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * L'ouverture et la fermeture de session, éprouvées sur leurs invariants.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI EST EN JEU ICI
 *
 * Trois défauts déjà rencontrés sur ce fichier, et aucun ne se voit en
 * relecture :
 *
 *   · un témoin `Secure` posé sur une connexion EN CLAIR : la connexion
 *     réussit, la redirection part, et la page suivante renvoie à l'écran de
 *     connexion. Aucune erreur, aucune trace ;
 *   · un message d'échec reformulé : le backend rend délibérément le MÊME
 *     message pour « compte inconnu » et « mot de passe faux ». Le préciser
 *     rouvrirait l'oracle d'énumération qu'il prend soin de refermer ;
 *   · une déconnexion qui efface le témoin AVANT de fermer la session côté
 *     serveur : la session reste vivante et plus personne ne sait laquelle
 *     révoquer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const poser = vi.fn();
const effacer = vi.fn();
const lireTemoin = vi.fn<(nom: string) => { value: string } | undefined>();
const lireEntete = vi.fn<(nom: string) => string | null>();
const rediriger = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: poser, delete: effacer, get: lireTemoin }),
  headers: async () => ({ get: lireEntete }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/i18n/navigation", () => ({
  // ⚠️ Le vrai `redirect` interrompt l'exécution en LEVANT. La doublure fait de
  // même : sans cela, le code après l'appel s'exécuterait ici alors qu'il ne
  // s'exécute jamais en production, et le cas mesurerait autre chose que la
  // réalité.
  redirect: (cible: unknown) => {
    rediriger(cible);
    throw new Error("REDIRECTION");
  },
}));

const { connexion, deconnexion, definirMotDePasse, demanderReinitialisation } = await import(
  "./actions-session"
);

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
}

function doublerFetch(reponses: { corps: unknown; statut?: number }[]) {
  const doublure = vi.fn<typeof fetch>();
  for (const { corps, statut = 200 } of reponses) {
    doublure.mockResolvedValueOnce(
      new Response(statut === 204 ? null : JSON.stringify(corps), {
        status: statut,
        headers: { "content-type": "application/json" },
      }),
    );
  }
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

/** Ce que rend `POST /transverse/session`. */
const acces = {
  compte: "a.bouba",
  locataire: "cabinet-brcg",
  session: "jeton-de-session",
  nom_complet: "Aïcha BOUBA",
  roles: ["REVISEUR"],
  permissions: [],
  dossiers: null,
  facteur_fort: false,
  second_facteur_enrole: false,
  a_la_date: "2026-09-24",
  transverse: false,
  interne: true,
};

/** `redirect` lève : tous les appels qui aboutissent finissent ainsi. */
async function jusquALaRedirection(travail: Promise<unknown>) {
  await expect(travail).rejects.toThrow("REDIRECTION");
}

beforeEach(() => {
  poser.mockReset();
  effacer.mockReset();
  rediriger.mockReset();
  lireTemoin.mockReset().mockReturnValue(undefined);
  lireEntete.mockReset().mockReturnValue(null);
});

describe("Ouvrir une session", () => {
  it("refuse une saisie vide sans déranger le backend", async () => {
    const f = doublerFetch([]);

    const etat = await connexion({ echec: null }, formulaire({ courriel: "", motDePasse: "" }));

    expect(etat.echec).toBe("Renseigner l'adresse et le mot de passe.");
    // ⚠️ Aucun appel : un formulaire vide envoyé au backend consomme un essai
    // du compteur de limitation, et deux ou trois distractions suffiraient à
    // verrouiller quelqu'un qui n'a encore rien tenté.
    expect(f).not.toHaveBeenCalled();
  });

  it("ne reformule jamais le refus du backend", async () => {
    doublerFetch([{ corps: { detail: "Identifiants invalides." }, statut: 401 }]);

    const etat = await connexion(
      { echec: null },
      formulaire({ courriel: "inconnu@example.cm", motDePasse: "x" }),
    );

    // Le même message pour « compte inconnu », « mot de passe faux », « compte
    // suspendu ». Le préciser dirait à un attaquant quelles adresses existent.
    expect(etat.echec).toBe("Identifiants invalides.");
    expect(poser).not.toHaveBeenCalled();
  });

  it("pose un témoin inaccessible au JavaScript de la page", async () => {
    doublerFetch([{ corps: acces }]);

    await jusquALaRedirection(
      connexion({ echec: null }, formulaire({ courriel: "a.bouba@cga-brcg.cm", motDePasse: "s" })),
    );

    const [nom, valeur, options] = poser.mock.calls[0];
    expect(nom).toBe("cga_session");
    expect(valeur).toBe("jeton-de-session");
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    // Douze heures, alignées sur `DUREE_SESSION` du backend. Un témoin qui
    // survivrait à la session laisserait l'écran croire l'utilisateur connecté.
    expect(options.maxAge).toBe(12 * 60 * 60);
  });

  it("ne pose PAS `Secure` sur une connexion en clair", async () => {
    doublerFetch([{ corps: acces }]);
    lireEntete.mockReturnValue(null); // aucun mandataire, donc du clair

    await jusquALaRedirection(
      connexion({ echec: null }, formulaire({ courriel: "a@b.cm", motDePasse: "s" })),
    );

    // ⚠️ LE DÉFAUT LE PLUS SILENCIEUX DE CE FICHIER. Posé `Secure` en clair, le
    // navigateur accepte le témoin et REFUSE de le renvoyer : la connexion
    // réussit, puis la page suivante renvoie à l'écran de connexion. Aucune
    // erreur nulle part.
    expect(poser.mock.calls[0][2].secure).toBe(false);
  });

  it("pose `Secure` dès que le mandataire annonce du HTTPS", async () => {
    doublerFetch([{ corps: acces }]);
    lireEntete.mockReturnValue("https");

    await jusquALaRedirection(
      connexion({ echec: null }, formulaire({ courriel: "a@b.cm", motDePasse: "s" })),
    );

    expect(poser.mock.calls[0][2].secure).toBe(true);
  });

  it("lit le premier maillon d'une chaîne de mandataires", async () => {
    doublerFetch([{ corps: acces }]);
    // Deux mandataires en série : « https,http ». Le premier dit le transport
    // du navigateur, les suivants celui du réseau interne.
    lireEntete.mockReturnValue("https,http");

    await jusquALaRedirection(
      connexion({ echec: null }, formulaire({ courriel: "a@b.cm", motDePasse: "s" })),
    );

    expect(poser.mock.calls[0][2].secure).toBe(true);
  });

  it("route le salarié vers l'espace de travail et l'adhérent vers le sien", async () => {
    doublerFetch([{ corps: acces }]);
    await jusquALaRedirection(
      connexion({ echec: null }, formulaire({ courriel: "a@b.cm", motDePasse: "s" })),
    );
    expect(rediriger).toHaveBeenCalledWith({ href: "/tableau-de-bord", locale: "fr" });

    rediriger.mockReset();
    doublerFetch([{ corps: { ...acces, interne: false } }]);
    await jusquALaRedirection(
      connexion({ echec: null }, formulaire({ courriel: "jp@b.cm", motDePasse: "s" })),
    );
    // Un adhérent qui atterrirait sur l'espace de travail y verrait des écrans
    // dont aucune donnée ne le concerne.
    expect(rediriger).toHaveBeenCalledWith({ href: "/mon-espace", locale: "fr" });
  });
});

describe("Fermer une session", () => {
  it("ferme côté serveur AVANT d'effacer le témoin", async () => {
    lireTemoin.mockReturnValue({ value: "jeton-de-session" });
    const ordre: string[] = [];
    // ⚠️ Une implémentation, pas une valeur « une seule fois » : les deux se
    // cumulent mal — la valeur en attente est rendue SANS exécuter
    // l'implémentation, et le marqueur ne serait jamais posé.
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async () => {
        ordre.push("fermeture");
        return new Response(null, { status: 204 });
      }),
    );
    effacer.mockImplementation(() => ordre.push("effacement"));

    await jusquALaRedirection(deconnexion());

    // ⚠️ L'ordre inverse laisserait une session VIVANTE que plus personne ne
    // peut fermer : le témoin effacé, on ne sait même plus laquelle révoquer.
    expect(ordre).toEqual(["fermeture", "effacement"]);
  });

  it("efface le témoin même quand la session avait déjà expiré", async () => {
    lireTemoin.mockReturnValue({ value: "jeton-perime" });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")));

    await jusquALaRedirection(deconnexion());

    // Refuser la déconnexion parce que la session a expiré donnerait une erreur
    // à quelqu'un qui a fait exactement ce qu'il fallait.
    expect(effacer).toHaveBeenCalledWith("cga_session");
    expect(rediriger).toHaveBeenCalledWith({ href: "/connexion", locale: "fr" });
  });

  it("n'appelle pas le backend quand aucun témoin n'est posé", async () => {
    const f = doublerFetch([]);

    await jusquALaRedirection(deconnexion());

    expect(f).not.toHaveBeenCalled();
    expect(effacer).toHaveBeenCalledWith("cga_session");
  });
});

describe("Définir son mot de passe depuis un lien", () => {
  it("vérifie la confirmation AVANT de consommer le jeton", async () => {
    const f = doublerFetch([]);

    const etat = await definirMotDePasse(
      { echec: null },
      formulaire({ jeton: "abc", motDePasse: "un-secret", confirmation: "un-secrey" }),
    );

    expect(etat.echec).toBe("Les deux saisies diffèrent. Vérifiez avant de valider.");
    // ⚠️ LE LIEN EST À USAGE UNIQUE. Le laisser consommer par une faute de
    // frappe obligerait l'adhérent qui vient de payer à en redemander un.
    expect(f).not.toHaveBeenCalled();
  });

  it("dit que le lien est incomplet plutôt que d'appeler avec un jeton vide", async () => {
    const f = doublerFetch([]);

    const etat = await definirMotDePasse(
      { echec: null },
      formulaire({ jeton: "", motDePasse: "s", confirmation: "s" }),
    );

    expect(etat.echec).toContain("Ouvrez-le depuis le courriel");
    expect(f).not.toHaveBeenCalled();
  });

  it("montre le motif du backend tel quel, ici", async () => {
    doublerFetch([{ corps: { detail: "Ce lien a expiré." }, statut: 400 }]);

    const etat = await definirMotDePasse(
      { echec: null },
      formulaire({ jeton: "abc", motDePasse: "s", confirmation: "s" }),
    );

    // ⚠️ L'INVERSE EXACT DE LA CONNEXION, et c'est voulu : celui qui détient le
    // lien est légitime. Un refus sans motif le ferait essayer au hasard.
    expect(etat.echec).toBe("Ce lien a expiré.");
  });

  it("ne connecte pas d'office après la définition", async () => {
    doublerFetch([{ corps: {} }]);

    await jusquALaRedirection(
      definirMotDePasse(
        { echec: null },
        formulaire({ jeton: "abc", motDePasse: "s", confirmation: "s" }),
      ),
    );

    // Saisir son mot de passe une première fois est ce qui l'ancre.
    expect(rediriger).toHaveBeenCalledWith({ href: "/connexion?defini=1", locale: "fr" });
    expect(poser).not.toHaveBeenCalled();
  });
});

describe("Demander un lien de réinitialisation", () => {
  it("confirme l'envoi sans dire si l'adresse existe", async () => {
    doublerFetch([{ corps: {} }]);

    const etat = await demanderReinitialisation(
      { echec: null, envoye: false },
      formulaire({ courriel: "peut-etre@inconnu.cm" }),
    );

    // ⚠️ Afficher « cette adresse n'existe pas » rouvrirait l'oracle : on essaie
    // mille adresses, on note lesquelles répondent, et l'on obtient la liste
    // des adhérents du cabinet.
    expect(etat).toEqual({ echec: null, envoye: true });
  });

  it("refuse une adresse vide sans appeler", async () => {
    const f = doublerFetch([]);

    const etat = await demanderReinitialisation(
      { echec: null, envoye: false },
      formulaire({ courriel: "  " }),
    );

    expect(etat).toEqual({ echec: "Renseignez votre adresse.", envoye: false });
    expect(f).not.toHaveBeenCalled();
  });
});
