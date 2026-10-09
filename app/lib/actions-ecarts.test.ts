import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { donnerLeSecondRegard, ecarterUnConstat, joindreLaPieceDAppui, leverUnEcart } =
  await import("./actions-ecarts");

/**
 * Les écarts — le seul mécanisme qui NEUTRALISE un constat de conformité.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ÉCARTER UN CONSTAT, C'EST DÉCIDER QU'UNE ANOMALIE N'EN EST PAS UNE.
 *
 * Le moteur de conformité a relevé quelque chose ; un humain dit « je l'assume,
 * et voici pourquoi ». C'est légitime, c'est prévu, et c'est exactement le
 * chemin par lequel une anomalie réelle peut disparaître d'un dossier.
 *
 * D'où trois freins que ces cas gardent :
 *
 *   · **un motif écrit**, jamais un clic seul. C'est lui qu'un vérificateur
 *     lira, deux ans plus tard, quand personne ne se souviendra du dossier ;
 *   · **un second regard** sur les écarts qui en demandent un : tant qu'il n'a
 *     pas eu lieu, le constat COMPTE ENCORE. L'écran doit le dire, sans quoi le
 *     réviseur croit l'anomalie levée et passe à la suite ;
 *   · **une pièce d'appui** désignée, pour que le motif ne soit pas seulement
 *     une affirmation.
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

/** Ce que le backend rend : l'écart, et ce qu'il produit aujourd'hui. */
function ecart(statut: string, identifiant = "E-0007", code_regle = "TVA-DEDUCT-01") {
  return { ecart: { identifiant, code_regle, statut }, applique: statut === "EFFECTIF", raison: null };
}

const VIDE = { echec: null, fait: null };
const ECART = { reference: "P-0042", code_regle: "TVA-DEDUCT-01", motif: "Facture rectifiée par le fournisseur le 12/09." };

beforeEach(() => vi.unstubAllGlobals());

describe("Écarter un constat", () => {
  it("refuse sans constat désigné", async () => {
    const f = doublerFetch();
    const etat = await ecarterUnConstat(VIDE, formulaire({ ...ECART, code_regle: "" }));
    expect(etat.echec).toBe("Choisir le constat à écarter.");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse un motif d'un mot", async () => {
    const f = doublerFetch();
    // ⚠️ « ok », « vu », « rien » : ce sont les motifs qu'on écrit quand on
    // clique vite. Deux ans plus tard, ils ne répondent à aucune question.
    for (const motif of ["", "ok", "vu", "corrigé"]) {
      const etat = await ecarterUnConstat(VIDE, formulaire({ ...ECART, motif }));
      expect(etat.echec, `motif « ${motif} »`).toContain("au moins 10 caractères");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("dit que le constat COMPTE ENCORE tant que le second regard n'a pas eu lieu", async () => {
    doublerFetch(ecart("EN_ATTENTE"));
    const etat = await ecarterUnConstat(VIDE, formulaire(ECART));
    // ⚠️ LE MESSAGE QUI ÉVITE LA FAUSSE SÉCURITÉ. Un « écart enregistré » sec
    // ferait croire l'anomalie levée ; le réviseur passerait à la suite avec un
    // constat encore actif sur le dossier.
    expect(etat.fait).toContain("proposé");
    expect(etat.fait).toContain("compte jusqu'au second regard");
  });

  it("dit que le constat est écarté quand aucun second regard n'est requis", async () => {
    doublerFetch(ecart("EFFECTIF"));
    const etat = await ecarterUnConstat(VIDE, formulaire(ECART));
    expect(etat.fait).toContain("écarté");
    expect(etat.fait).toContain("TVA-DEDUCT-01");
  });

  it("n'envoie la pièce d'appui que si elle est donnée", async () => {
    const f = doublerFetch(ecart("EFFECTIF"));
    await ecarterUnConstat(VIDE, formulaire(ECART));
    // ⚠️ Champ ABSENT, et non `null` : le backend distingue « aucune pièce
    // annoncée » d'« une pièce annoncée dont la référence est vide ».
    expect("piece_appui" in corps(f)).toBe(false);

    vi.unstubAllGlobals();
    const g = doublerFetch(ecart("EFFECTIF"));
    await ecarterUnConstat(VIDE, formulaire({ ...ECART, piece_appui: "P-0031" }));
    expect(corps(g).piece_appui).toBe("P-0031");
  });

  it("échappe la référence de la pièce dans l'adresse", async () => {
    const f = doublerFetch(ecart("EFFECTIF"));
    await ecarterUnConstat(VIDE, formulaire({ ...ECART, reference: "../audit" }));
    expect(String(f.mock.calls[0][0])).toContain("..%2Faudit");
  });
});

describe("Le second regard", () => {
  const regard = {
    reference: "P-0042",
    identifiant: "E-0007",
    decision: "CONFIRMER",
    motif: "Pièce d'appui vérifiée, la rectification est au dossier.",
  };

  it("n'accepte que confirmer ou refuser", async () => {
    const f = doublerFetch();
    // ⚠️ Une troisième valeur — « PLUS_TARD », une chaîne vide, une casse
    // différente — laisserait l'écart dans un état que le domaine ne connaît
    // pas. Le second regard tranche, ou il n'a pas lieu.
    for (const decision of ["", "confirmer", "PEUT_ETRE", "OUI"]) {
      const etat = await donnerLeSecondRegard(VIDE, formulaire({ ...regard, decision }));
      expect(etat.echec, `décision « ${decision} »`).toContain("confirmer ou de refuser");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("exige un motif, même pour confirmer", async () => {
    const f = doublerFetch();
    // Confirmer sans rien écrire est le geste le plus facile à faire vite. Le
    // motif du second regard est distinct de celui de l'écart : il dit ce qui a
    // été VÉRIFIÉ, pas ce qui a été affirmé.
    const etat = await donnerLeSecondRegard(VIDE, formulaire({ ...regard, motif: "ok" }));
    expect(etat.echec).toContain("au moins 10 caractères");
    expect(f).not.toHaveBeenCalled();
  });

  it("annonce la confirmation ou le refus selon ce que le backend rend", async () => {
    doublerFetch(ecart("EFFECTIF"));
    expect((await donnerLeSecondRegard(VIDE, formulaire(regard))).fait).toContain("confirmé");

    vi.unstubAllGlobals();
    doublerFetch(ecart("REFUSE"));
    // ⚠️ L'état vient du BACKEND, jamais de la décision envoyée : un refus du
    // domaine sur une demande de confirmation doit s'afficher comme un refus.
    expect(
      (await donnerLeSecondRegard(VIDE, formulaire({ ...regard, decision: "REFUSER" }))).fait,
    ).toContain("refusé");
  });

  it("échappe l'identifiant de l'écart dans l'adresse", async () => {
    const f = doublerFetch(ecart("EFFECTIF"));
    await donnerLeSecondRegard(VIDE, formulaire({ ...regard, identifiant: "../../politique" }));
    expect(String(f.mock.calls[0][0])).toContain("..%2F..%2Fpolitique");
  });
});

describe("Lever un écart", () => {
  it("exige un motif : rétablir un constat se justifie aussi", async () => {
    const f = doublerFetch();
    const etat = await leverUnEcart(
      VIDE,
      formulaire({ reference: "P-0042", identifiant: "E-0007", motif: "annulé" }),
    );
    expect(etat.echec).toContain("au moins 10 caractères");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Joindre la pièce d'appui", () => {
  it("refuse une dérogation non désignée", async () => {
    const f = doublerFetch();
    for (const champs of [
      { identifiant: "", reference: "P-0042" },
      { identifiant: "E-0007", reference: "" },
    ]) {
      const etat = await joindreLaPieceDAppui(VIDE, formulaire({ ...champs, piece: "P-0031" }));
      expect(etat.echec).toBe("Dérogation non désignée.");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une désignation de pièce trop courte, en disant ce qui est attendu", async () => {
    const f = doublerFetch();
    const etat = await joindreLaPieceDAppui(
      VIDE,
      formulaire({ identifiant: "E-0007", reference: "P-0042", piece: "x" }),
    );
    // Le message dit LES DEUX formes acceptées : l'identifiant d'une pièce du
    // dossier, ou la référence d'un document conservé ailleurs.
    expect(etat.echec).toContain("identifiant d'une pièce du dossier");
    expect(etat.echec).toContain("document conservé");
    expect(f).not.toHaveBeenCalled();
  });
});
