import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  abandonnerLeDossier,
  convertirLeDossier,
  ouvrirUnDossierDeCreation,
  porterLesIdentifiants,
} = await import("./actions-creations");

/**
 * La création d'entreprise — du fondateur au NIU.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA FIN DE CE PARCOURS FAIT ENTRER UNE ENTREPRISE AU PORTEFEUILLE.
 *
 * Ce n'est pas un changement d'état de plus : c'est la naissance d'un dossier
 * que le cabinet suivra des années. D'où la confirmation sur la conversion, et
 * le motif sur l'abandon — un dossier abandonné ne se rouvre pas, et ce sont ces
 * motifs, mis bout à bout, qui disent où le pipeline perd ses dossiers.
 *
 * ⚠️ UN IDENTIFIANT ET SA DATE VONT ENSEMBLE, TOUJOURS.
 *
 * RCCM, NIU, patente, CNPS : chacun s'obtient à un guichet, à une date. La date
 * mesure le délai de ce guichet — c'est elle qui permet de dire au fondateur
 * « le RCCM prend trois semaines ». Un identifiant sans sa date rend cette
 * mesure fausse pour tous les dossiers suivants.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doublerFetch(reponse: unknown = {}, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(reponse), {
      status: statut,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
}

function corps(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const OUVERTURE = {
  nom: "NKOA",
  prenom: "Jean-Paul",
  courriel: "jp.nkoa@batimentplus.cm",
  telephone: "+237676887686",
  denomination: "BÂTIMENT PLUS SARL",
  forme: "SARL",
  activite: "Travaux de bâtiment",
  siege: "Bonabéri, Douala",
};

beforeEach(() => vi.unstubAllGlobals());

describe("Ouvrir un dossier de création", () => {
  it("exige le fondateur et l'entreprise souhaitée", async () => {
    const f = doublerFetch();
    for (const manquant of Object.keys(OUVERTURE)) {
      const etat = await ouvrirUnDossierDeCreation(VIDE, formulaire({ ...OUVERTURE, [manquant]: "" }));
      expect(etat.echec, `sans ${manquant}`).toContain("obligatoires");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("tolère les espaces des milliers dans le capital", async () => {
    const f = doublerFetch({ reference: "CR-2026-4F7A" });
    await ouvrirUnDossierDeCreation(VIDE, formulaire({ ...OUVERTURE, capital: "1 000 000" }));
    expect(corps(f).capital).toBe("1000000");
  });

  it("refuse un capital illisible", async () => {
    const f = doublerFetch();
    const etat = await ouvrirUnDossierDeCreation(VIDE, formulaire({ ...OUVERTURE, capital: "un million" }));
    expect(etat.echec).toContain("écrivez-le en chiffres");
    expect(f).not.toHaveBeenCalled();
  });

  it("accepte un capital non renseigné : toutes les formes n'en ont pas", async () => {
    const f = doublerFetch({ reference: "CR-2026-4F7A" });
    await ouvrirUnDossierDeCreation(VIDE, formulaire(OUVERTURE));
    // Un établissement n'a pas de capital social. `null` dit « sans objet ».
    expect(corps(f).capital).toBeNull();
  });

  it("tire une référence lisible au téléphone", async () => {
    const f = doublerFetch({ reference: "CR-2026-4F7A" });
    await ouvrirUnDossierDeCreation(VIDE, formulaire(OUVERTURE));
    // ⚠️ « CR-2026-4F7A » se dicte au fondateur qui rappelle. Un identifiant
    // universel complet ne se dicte pas, et il rappellerait sans pouvoir dire
    // quel dossier il suit.
    expect(corps(f).reference).toMatch(/^CR-\d{4}-[0-9A-F]{4}$/);
  });

  it("nomme le dossier ouvert et son état", async () => {
    doublerFetch({ reference: "CR-2026-4F7A" });
    const etat = await ouvrirUnDossierDeCreation(VIDE, formulaire(OUVERTURE));
    // La référence rendue est celle du BACKEND : il peut en avoir tiré une
    // autre sur collision.
    expect(etat.fait).toContain("CR-2026-4F7A");
    expect(etat.fait).toContain("en qualification");
  });

  it("montre le refus du backend sur une référence déjà prise", async () => {
    doublerFetch({ detail: "Référence déjà employée." }, 409);
    const etat = await ouvrirUnDossierDeCreation(VIDE, formulaire(OUVERTURE));
    expect(etat.echec).toBe("Référence déjà employée.");
  });
});

describe("Porter les identifiants obtenus aux guichets", () => {
  it("refuse un identifiant sans sa date, en nommant lequel", async () => {
    const f = doublerFetch();
    // ⚠️ La date mesure le délai du guichet. Sans elle, le cabinet ne peut plus
    // dire au fondateur suivant « le RCCM prend trois semaines ».
    const etat = await porterLesIdentifiants(
      VIDE,
      formulaire({ reference: "CR-2026-4F7A", rccm: "RC/DLA/2026/B/1234" }),
    );
    expect(etat.echec).toBe("RCCM et sa date d'obtention vont ensemble.");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une date sans son identifiant", async () => {
    const f = doublerFetch();
    const etat = await porterLesIdentifiants(
      VIDE,
      formulaire({ reference: "CR-2026-4F7A", niu_obtenu_le: "2026-10-05" }),
    );
    expect(etat.echec).toBe("NIU et sa date d'obtention vont ensemble.");
    expect(f).not.toHaveBeenCalled();
  });

  it("connaît les deux accords : « obtenu » et « obtenue »", async () => {
    const f = doublerFetch({});
    // ⚠️ `patente` et `cnps` sont féminins dans le formulaire : la clé est
    // `patente_obtenue_le`. Se tromper d'accord ferait ignorer silencieusement
    // la date, et l'écran refuserait une saisie pourtant complète.
    await porterLesIdentifiants(
      VIDE,
      formulaire({
        reference: "CR-2026-4F7A",
        patente: "PAT-2026-9981",
        patente_obtenue_le: "2026-10-12",
        rccm: "RC/DLA/2026/B/1234",
        rccm_obtenu_le: "2026-10-05",
      }),
    );
    const envoye = corps(f);
    expect(envoye.patente_obtenue_le).toBe("2026-10-12");
    expect(envoye.rccm_obtenu_le).toBe("2026-10-05");
  });

  it("n'envoie que les identifiants renseignés", async () => {
    const f = doublerFetch({});
    await porterLesIdentifiants(
      VIDE,
      formulaire({ reference: "CR-2026-4F7A", niu: "M081234567890P", niu_obtenu_le: "2026-10-05" }),
    );
    // Les guichets répondent l'un après l'autre : on porte ce qui est arrivé,
    // pas tout d'un coup.
    expect(Object.keys(corps(f)).sort()).toEqual(["niu", "niu_obtenu_le"]);
  });

  it("refuse une saisie entièrement vide", async () => {
    const f = doublerFetch();
    const etat = await porterLesIdentifiants(VIDE, formulaire({ reference: "CR-2026-4F7A" }));
    expect(etat.echec).toContain("au moins un identifiant et sa date");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Abandonner un dossier", () => {
  const abandon = {
    reference: "CR-2026-4F7A",
    motif: "Fondateur injoignable depuis six semaines, trois relances.",
    confirmation: "oui",
  };

  it("exige un motif, et dit à quoi il sert", async () => {
    const f = doublerFetch();
    const etat = await abandonnerLeDossier(VIDE, formulaire({ ...abandon, motif: "parti" }));
    // ⚠️ Ces motifs, mis bout à bout, disent OÙ le pipeline perd ses dossiers.
    // C'est la seule mesure dont le cabinet dispose pour s'améliorer.
    expect(etat.echec).toContain("rend le pipeline analysable");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la confirmation, parce qu'un abandon ne se rouvre pas", async () => {
    const f = doublerFetch();
    const etat = await abandonnerLeDossier(VIDE, formulaire({ ...abandon, confirmation: "non" }));
    expect(etat.echec).toContain("ne se rouvre pas");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Convertir le dossier en entreprise du portefeuille", () => {
  const conversion = {
    reference: "CR-2026-4F7A",
    regime: "REEL",
    centre: "CIME Littoral I",
    confirmation: "oui",
  };

  it("exige le régime et le centre des impôts", async () => {
    const f = doublerFetch();
    for (const manquant of ["regime", "centre"]) {
      const etat = await convertirLeDossier(VIDE, formulaire({ ...conversion, [manquant]: "" }));
      expect(etat.echec, `sans ${manquant}`).toContain("régime d'entrée et le centre");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la confirmation, en disant ce qu'elle déclenche", async () => {
    const f = doublerFetch();
    const etat = await convertirLeDossier(VIDE, formulaire({ ...conversion, confirmation: "non" }));
    expect(etat.echec).toContain("entrer l'entreprise au portefeuille");
    expect(f).not.toHaveBeenCalled();
  });

  it("transmet le choix « adhérent » comme un booléen", async () => {
    const f = doublerFetch({ niu: "M081234567890P", denomination: "BÂTIMENT PLUS SARL" });
    await convertirLeDossier(VIDE, formulaire({ ...conversion, adherent: "oui" }));
    expect(corps(f).adherent).toBe(true);

    vi.unstubAllGlobals();
    const g = doublerFetch({ niu: "M081234567890P", denomination: "BÂTIMENT PLUS SARL" });
    await convertirLeDossier(VIDE, formulaire(conversion));
    // Absent = non adhérent. Une valeur absente ne doit pas devenir `true`.
    expect(corps(g).adherent).toBe(false);
  });

  it("annonce le NIU sous lequel l'entreprise entre", async () => {
    doublerFetch({ niu: "M081234567890P", denomination: "BÂTIMENT PLUS SARL" });
    const etat = await convertirLeDossier(VIDE, formulaire(conversion));
    // Le NIU est ce que le fondateur attend depuis des semaines : il doit être
    // à l'écran, pas à chercher.
    expect(etat.fait).toContain("BÂTIMENT PLUS SARL");
    expect(etat.fait).toContain("M081234567890P");
  });
});
