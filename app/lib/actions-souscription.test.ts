import { beforeEach, describe, expect, it, vi } from "vitest";

const rediriger = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/i18n/navigation", () => ({
  redirect: (cible: unknown) => {
    rediriger(cible);
    throw new Error("REDIRECTION");
  },
}));

const { activerUneSouscription, fixerUnTarif } = await import("./actions-souscription");

/**
 * Les tarifs et l'ouverture d'accès, côté cabinet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ FIXER UN PRIX EST UNE DÉCISION, PAS UN PARAMÉTRAGE.
 *
 * Tant qu'un prix n'est pas fixé ici, il vient du catalogue de démonstration :
 * il s'affiche « indicatif », et le backend refuse de l'encaisser. Le geste fait
 * donc passer une prestation de « pas vendable » à « vendable », et il engage le
 * cabinet envers chaque client qui paiera ce montant.
 *
 * D'où la case à cocher, le motif obligatoire, et l'auteur pris de la session
 * plutôt que du formulaire : trois ans plus tard, devant un client qui demande
 * pourquoi ce prix, c'est le motif et le nom au journal qui répondent.
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
const TARIF = {
  service: "adhesion",
  formule: "ANNUELLE",
  montant: "12 500",
  a_partir_du: "2027-01-01",
  motif: "Révision annuelle validée en conseil du 15/12/2026.",
  confirmation: "oui",
};

beforeEach(() => {
  vi.unstubAllGlobals();
  rediriger.mockReset();
});

describe("Fixer un tarif", () => {
  it("exige la case cochée, en disant ce qu'elle engage", async () => {
    const f = doublerFetch();
    const etat = await fixerUnTarif(VIDE, formulaire({ ...TARIF, confirmation: "non" }));
    // ⚠️ La case ne dit pas « confirmez-vous ? » : elle dit que ce prix engage
    // le cabinet envers CHAQUE client qui le paiera.
    expect(etat.echec).toContain("engage le cabinet");
    expect(f).not.toHaveBeenCalled();
  });

  it("accepte le montant écrit avec les espaces des milliers", async () => {
    const f = doublerFetch();
    await fixerUnTarif(VIDE, formulaire(TARIF));
    expect(corps(f).montant).toBe("12500");
  });

  it("refuse un montant nul, négatif ou à décimales", async () => {
    const f = doublerFetch();
    // ⚠️ Un prix à zéro rendrait la prestation gratuite sans que personne ne
    // l'ait décidé, et le backend l'encaisserait comme un paiement abouti.
    for (const montant of ["0", "-5000", "12 500,50", "gratuit", ""]) {
      const etat = await fixerUnTarif(VIDE, formulaire({ ...TARIF, montant }));
      expect(etat.echec, `montant « ${montant} »`).toContain("supérieur à zéro");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("exige un motif, avec des exemples de ce qu'on attend", async () => {
    const f = doublerFetch();
    const etat = await fixerUnTarif(VIDE, formulaire({ ...TARIF, motif: "ok" }));
    // Le message donne trois exemples plutôt qu'une longueur : « révision
    // annuelle, nouvelle grille, décision du conseil ».
    expect(etat.echec).toContain("révision annuelle");
    expect(f).not.toHaveBeenCalled();
  });

  it("n'envoie aucun auteur : il est pris de la session", async () => {
    const f = doublerFetch();
    const donnees = formulaire(TARIF);
    donnees.append("auteur", "QUELQU-UN-D-AUTRE");
    await fixerUnTarif(VIDE, donnees);
    // ⚠️ Le nom au journal est celui de la session. Le laisser choisir
    // permettrait d'inscrire une décision de prix au nom d'un collègue.
    expect(corps(f).auteur).toBeUndefined();
  });

  it("envoie `null` pour une formule non précisée", async () => {
    const f = doublerFetch();
    await fixerUnTarif(VIDE, formulaire({ ...TARIF, formule: "" }));
    expect(corps(f).formule).toBeNull();
  });

  it("dit à partir de quand le prix vaut, et sur quoi", async () => {
    doublerFetch();
    const etat = await fixerUnTarif(VIDE, formulaire(TARIF));
    // ⚠️ « Il s'applique à tout devis établi À PARTIR DE CETTE DATE » : un devis
    // émis hier garde le prix d'hier. Le taire ferait croire à une mise à jour
    // rétroactive.
    expect(etat.fait).toContain("tout devis établi à partir de cette date");
  });

  it("montre le refus du backend tel quel", async () => {
    doublerFetch({ detail: "Un tarif est déjà fixé à cette date pour ce service." }, 409);
    const etat = await fixerUnTarif(VIDE, formulaire(TARIF));
    expect(etat.echec).toContain("déjà fixé à cette date");
  });
});

describe("Ouvrir l'accès d'un souscripteur, côté cabinet", () => {
  const complet = {
    reference: "S-2026-0007",
    verification: "CNI présentée au guichet le 25/09, photo comparée au dossier.",
    confirmation: "oui",
  };

  it("exige la case, en disant ce qu'elle donne", async () => {
    const f = doublerFetch();
    const etat = await activerUneSouscription(VIDE, formulaire({ ...complet, confirmation: "non" }));
    expect(etat.echec).toContain("lecture du dossier");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige que la vérification d'identité soit décrite", async () => {
    const f = doublerFetch();
    const etat = await activerUneSouscription(VIDE, formulaire({ ...complet, verification: "vu" }));
    expect(etat.echec).toContain("pièces présentées, par qui, quand");
    expect(f).not.toHaveBeenCalled();
  });

  it("nomme la personne à qui l'accès vient d'être ouvert", async () => {
    doublerFetch({ prospect: { courriel: "jp.nkoa@batimentplus.cm" } });
    const etat = await activerUneSouscription(VIDE, formulaire(complet));
    expect(etat.fait).toContain("jp.nkoa@batimentplus.cm");
  });
});
