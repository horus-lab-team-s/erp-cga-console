import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { cloreUnContrat, embaucherUnSalarie, ouvrirUnContrat } = await import("./actions-social");

/**
 * La paie — embaucher, ouvrir et clore un contrat.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ EMBAUCHER SE FAIT EN DEUX APPELS, ET LE SECOND PEUT ÉCHOUER SEUL.
 *
 * Le salarié est créé, puis son contrat. Si le contrat échoue — un début avant
 * la date d'immatriculation, un type inconnu — le salarié **existe déjà**. Le
 * message doit le dire, et dire quoi faire : sans cela, le gestionnaire
 * recommence toute la saisie et se heurte à « matricule déjà pris », qui
 * ressemble à un bogue.
 *
 * C'est la classe d'erreur la plus désorientante d'un produit : la moitié du
 * geste est faite, et l'écran annonce un échec.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Une réponse par appel, dans l'ordre. */
function doublerFetch(...reponses: { corps?: unknown; statut?: number }[]) {
  const doublure = vi.fn<typeof fetch>();
  for (const { corps = {}, statut = 200 } of reponses) {
    doublure.mockResolvedValueOnce(
      new Response(JSON.stringify(corps), {
        status: statut,
        headers: { "content-type": "application/json" },
      }),
    );
  }
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
}

function corps(f: ReturnType<typeof doublerFetch>, appel = 0) {
  return JSON.parse((f.mock.calls[appel][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const EMBAUCHE = {
  dossier: "M081234567890P",
  matricule: "S-014",
  nom: "ESSOMBA",
  prenom: "Carine",
  type_contrat: "CDI",
  debut: "2026-10-01",
  salaire_base: "180 000",
};

beforeEach(() => vi.unstubAllGlobals());

describe("Ce qui est refusé avant tout appel", () => {
  it("exige matricule, nom et prénom", async () => {
    const f = doublerFetch();
    for (const manquant of ["matricule", "nom", "prenom"]) {
      const etat = await embaucherUnSalarie(VIDE, formulaire({ ...EMBAUCHE, [manquant]: "" }));
      expect(etat.echec, `sans ${manquant}`).toContain("obligatoires");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("exige le type de contrat, la date de début et le salaire", async () => {
    const f = doublerFetch();
    for (const manquant of ["type_contrat", "debut", "salaire_base"]) {
      const etat = await embaucherUnSalarie(VIDE, formulaire({ ...EMBAUCHE, [manquant]: "" }));
      expect(etat.echec, `sans ${manquant}`).toContain("Type de contrat, début et salaire");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse un salaire à décimales", async () => {
    const f = doublerFetch();
    for (const base of ["180 000,50", "cent quatre-vingt mille", "180.000"]) {
      const etat = await embaucherUnSalarie(VIDE, formulaire({ ...EMBAUCHE, salaire_base: base }));
      expect(etat.echec, `salaire « ${base} »`).toContain("sans décimales");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse des primes illisibles, même quand le salaire est bon", async () => {
    const f = doublerFetch();
    const etat = await embaucherUnSalarie(VIDE, formulaire({ ...EMBAUCHE, primes: "un peu" }));
    expect(etat.echec).toContain("sans décimales");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Ce qui part au backend", () => {
  it("ôte les espaces du salaire et des primes", async () => {
    const f = doublerFetch({}, {});
    await embaucherUnSalarie(VIDE, formulaire({ ...EMBAUCHE, primes: "25 000" }));
    expect(corps(f, 1).salaire_base).toBe("180000");
    expect(corps(f, 1).primes).toBe("25000");
  });

  it("retombe sur zéro prime plutôt que sur `null`", async () => {
    const f = doublerFetch({}, {});
    await embaucherUnSalarie(VIDE, formulaire(EMBAUCHE));
    // ⚠️ `null` dirait « primes inconnues » ; « 0 » dit « aucune prime », ce
    // qui est la vérité d'un contrat qui n'en prévoit pas. La paie du mois s'en
    // sert directement.
    expect(corps(f, 1).primes).toBe("0");
  });

  it("compte zéro enfant à charge à défaut, jamais NaN", async () => {
    const f = doublerFetch({}, {});
    // ⚠️ Le nombre d'enfants entre dans le calcul de l'impôt sur le revenu. Un
    // `NaN` s'y propagerait et rendrait la paie inexploitable.
    await embaucherUnSalarie(VIDE, formulaire({ ...EMBAUCHE, enfants_a_charge: "pas sûr" }));
    expect(corps(f, 0).enfants_a_charge).toBe(0);
  });

  it("crée le salarié PUIS son contrat, dans cet ordre", async () => {
    const f = doublerFetch({}, {});
    await embaucherUnSalarie(VIDE, formulaire(EMBAUCHE));
    expect(String(f.mock.calls[0][0])).toMatch(/\/salaries$/);
    expect(String(f.mock.calls[1][0])).toContain("/salaries/S-014/contrats");
  });

  it("échappe le dossier et le matricule dans les adresses", async () => {
    const f = doublerFetch({}, {});
    await embaucherUnSalarie(
      VIDE,
      formulaire({ ...EMBAUCHE, dossier: "../audit", matricule: "../../x" }),
    );
    expect(String(f.mock.calls[0][0])).toContain("..%2Faudit");
    expect(String(f.mock.calls[1][0])).toContain("..%2F..%2Fx");
  });
});

describe("Quand la moitié du geste a été faite", () => {
  it("dit que le salarié EXISTE et que seul son contrat manque", async () => {
    // Premier appel réussi, second refusé.
    doublerFetch({}, { corps: { detail: "Début antérieur à l'immatriculation CNPS." }, statut: 422 });

    const etat = await embaucherUnSalarie(VIDE, formulaire(EMBAUCHE));

    // ⚠️ LE MESSAGE QUI ÉVITE LA DOUBLE SAISIE. Sans « est inscrit », le
    // gestionnaire recommence tout et se heurte à « matricule déjà pris », qui
    // ressemble à un bogue du produit.
    expect(etat.echec).toContain("est inscrit");
    expect(etat.echec).toContain("son contrat n'a pas pu s'ouvrir");
    // Et il dit quoi faire ensuite.
    expect(etat.echec).toContain("Ouvrez-le depuis sa ligne");
    // Le motif du backend est conservé : c'est lui qui dit quoi corriger.
    expect(etat.echec).toContain("immatriculation CNPS");
  });

  it("n'annonce aucune embauche quand le salarié lui-même est refusé", async () => {
    doublerFetch({ corps: { detail: "Matricule déjà employé dans ce dossier." }, statut: 409 });
    const etat = await embaucherUnSalarie(VIDE, formulaire(EMBAUCHE));
    expect(etat.echec).toBe("Matricule déjà employé dans ce dossier.");
    expect(etat.fait).toBeNull();
  });

  it("annonce l'entrée en paie quand tout passe", async () => {
    doublerFetch({}, {});
    const etat = await embaucherUnSalarie(VIDE, formulaire(EMBAUCHE));
    // ⚠️ « il entre dans la déclaration de son premier mois » : la conséquence
    // concrète, et non « enregistré ».
    expect(etat.fait).toContain("Carine ESSOMBA (S-014)");
    expect(etat.fait).toContain("déclaration de son premier mois");
  });
});

describe("Ouvrir et clore un contrat séparément", () => {
  it("applique les mêmes contrôles de salaire à l'ouverture seule", async () => {
    const f = doublerFetch();
    const etat = await ouvrirUnContrat(
      VIDE,
      formulaire({ dossier: "D", matricule: "S-014", type_contrat: "CDD", debut: "2026-10-01", salaire_base: "x" }),
    );
    expect(etat.echec).toContain("sans décimales");
    expect(f).not.toHaveBeenCalled();
  });

  it("rend la date d'ouverture au format lisible ici", async () => {
    doublerFetch({ corps: { type_contrat: "CDD", debut: "2026-10-01" } });
    const etat = await ouvrirUnContrat(
      VIDE,
      formulaire({ dossier: "D", matricule: "S-014", type_contrat: "CDD", debut: "2026-10-01", salaire_base: "150000" }),
    );
    expect(etat.fait).toContain("01/10/2026");
  });

  it("exige la date de fin, en disant ce qu'elle signifie", async () => {
    const f = doublerFetch();
    const etat = await cloreUnContrat(VIDE, formulaire({ dossier: "D", matricule: "S-014", le: "" }));
    // ⚠️ « le premier jour où le contrat ne court plus » : la borne est
    // ambiguë d'un jour si on ne la nomme pas, et ce jour-là compte en paie.
    expect(etat.echec).toContain("premier jour où le contrat ne court plus");
    expect(f).not.toHaveBeenCalled();
  });
});
