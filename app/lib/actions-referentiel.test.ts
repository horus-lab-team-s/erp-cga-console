import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  proposerUneVersion,
  retirerUneDecision,
  trancherUneProposition,
  validerUneVersionLivree,
} = await import("./actions-referentiel");

/**
 * Le référentiel normatif — les valeurs légales du produit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUI EST VALIDÉ ICI ENTRE AU CALCUL SUIVANT DU CABINET.
 *
 * Contrôle de conformité, échéancier, paie : tous lisent ces valeurs. Un taux
 * de TVA, un seuil d'IGS, un plafond de cotisation. C'est le principe n° 1 du
 * projet — aucune valeur légale codée en dur — et c'est ce qui donne à cet
 * écran son poids : ce n'est pas un paramétrage, c'est une décision datée et
 * motivée dont le cabinet répond.
 *
 * ⚠️ LA VALEUR PART **TYPÉE**, ET C'EST LE PIÈGE DE CE FICHIER.
 *
 * « 19,25 » saisi à la française doit partir comme le nombre 19.25 et non comme
 * la chaîne « 19,25 » : un taux envoyé en texte est refusé par le backend, ou
 * pire, comparé comme du texte. Mais une expression régulière — le format d'un
 * NIU, par exemple — doit rester du texte, sans quoi elle serait détruite.
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
const PROPOSITION = {
  code: "TVA_TAUX_NORMAL|POURCENTAGE",
  valeur: "19,25",
  applicable_du: "2027-01-01",
  fondement_texte: "Article 143 du CGI",
  fondement_source: "Loi de finances 2027",
  motif: "Confronté au texte publié au Journal Officiel.",
};

beforeEach(() => vi.unstubAllGlobals());

describe("La valeur, typée selon son unité", () => {
  it("envoie un nombre pour une unité chiffrée, virgule française comprise", async () => {
    const f = doublerFetch({ identifiant: "D-001" });
    await proposerUneVersion(VIDE, formulaire(PROPOSITION));
    // ⚠️ Un taux envoyé en TEXTE est refusé par le backend, ou — pire —
    // comparé comme du texte : « 9 » serait alors supérieur à « 19,25 ».
    expect(corps(f).valeur).toBe(19.25);
    expect(typeof corps(f).valeur).toBe("number");
  });

  it("tolère les espaces des milliers sur un montant", async () => {
    const f = doublerFetch({ identifiant: "D-001" });
    await proposerUneVersion(
      VIDE,
      formulaire({ ...PROPOSITION, code: "IGS_SEUIL|FRANCS", valeur: "10 000 000" }),
    );
    expect(corps(f).valeur).toBe(10000000);
  });

  it("laisse une expression régulière EN TEXTE, intacte", async () => {
    const f = doublerFetch({ identifiant: "D-001" });
    const motif = "^[A-Z]\\d{12}[A-Z]$";
    await proposerUneVersion(
      VIDE,
      formulaire({ ...PROPOSITION, code: "NIU_FORMAT|REGEX", valeur: motif }),
    );
    // ⚠️ Convertie en nombre, une expression régulière deviendrait `NaN` ou du
    // charabia, et le contrôle de format du NIU accepterait n'importe quoi.
    expect(corps(f).valeur).toBe(motif);
  });

  it("garde le texte quand la valeur n'est pas un nombre malgré une unité chiffrée", async () => {
    const f = doublerFetch({ identifiant: "D-001" });
    await proposerUneVersion(VIDE, formulaire({ ...PROPOSITION, valeur: "à confirmer" }));
    // On ne fabrique pas un `NaN` : on transmet, et le backend refuse en
    // nommant l'unité attendue. Un `NaN` en base serait bien pire.
    expect(corps(f).valeur).toBe("à confirmer");
  });
});

describe("Ce qui est refusé avant tout appel", () => {
  it("refuse une proposition sans paramètre choisi", async () => {
    const f = doublerFetch();
    const etat = await proposerUneVersion(VIDE, formulaire({ ...PROPOSITION, code: "" }));
    expect(etat.echec).toBe("Choisissez le paramètre.");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une proposition sans date d'effet", async () => {
    const f = doublerFetch();
    // ⚠️ Une valeur légale sans date d'effet est inutilisable : le produit
    // calcule TOUJOURS à une date, et une facture d'août se contrôle avec le
    // taux d'août.
    const etat = await proposerUneVersion(VIDE, formulaire({ ...PROPOSITION, applicable_du: "" }));
    expect(etat.echec).toBe("Indiquez la date d'effet.");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une validation sans motif circonstancié", async () => {
    const f = doublerFetch();
    const etat = await validerUneVersionLivree(
      VIDE,
      formulaire({ code: "TVA_TAUX_NORMAL", applicable_du: "2027-01-01", motif: "ok" }),
    );
    // Le motif dit LE TEXTE CONFRONTÉ : c'est lui qui prouve que quelqu'un a
    // ouvert le Journal Officiel plutôt que de cliquer.
    expect(etat.echec).toContain("texte confronté");
    expect(f).not.toHaveBeenCalled();
  });

  it("n'accepte que valider ou refuser au tranchage", async () => {
    const f = doublerFetch();
    for (const decision of ["", "valider", "PLUS_TARD", "OUI"]) {
      const etat = await trancherUneProposition(
        VIDE,
        formulaire({ identifiant: "D-001", decision, motif: "Vérifié au texte." }),
      );
      expect(etat.echec, `décision « ${decision} »`).toContain("valider ou de refuser");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse un retrait sans date de fin d'effet", async () => {
    const f = doublerFetch();
    const etat = await retirerUneDecision(VIDE, formulaire({ identifiant: "D-001", motif: "Abrogé." }));
    expect(etat.echec).toContain("cesse de valoir");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Ce que la personne lit après coup", () => {
  it("dit qu'une proposition est SANS EFFET tant qu'elle n'est pas validée", async () => {
    doublerFetch({ identifiant: "D-042" });
    const etat = await proposerUneVersion(VIDE, formulaire(PROPOSITION));
    // ⚠️ LE MESSAGE QUI ÉVITE LA FAUSSE SÉCURITÉ. Sans lui, celui qui propose
    // croit le taux à jour, et le cabinet calcule six mois avec l'ancien.
    expect(etat.fait).toContain("sans effet tant qu'elle n'est pas validée");
  });

  it("dit qu'une valeur validée entre AUX CALCULS, et non qu'elle est « enregistrée »", async () => {
    doublerFetch({ identifiant: "D-042", code: "TVA_TAUX_NORMAL", statut: "APPLIQUEE" });
    const etat = await trancherUneProposition(
      VIDE,
      formulaire({ identifiant: "D-042", decision: "VALIDER", motif: "Confronté au texte." }),
    );
    expect(etat.fait).toContain("appliquée aux calculs du cabinet");
  });

  it("distingue une proposition refusée d'une proposition appliquée", async () => {
    doublerFetch({ identifiant: "D-042", code: "TVA_TAUX_NORMAL", statut: "REFUSEE" });
    const etat = await trancherUneProposition(
      VIDE,
      formulaire({ identifiant: "D-042", decision: "REFUSER", motif: "Texte non confirmé." }),
    );
    expect(etat.fait).toContain("refusée");
  });

  it("rend la date de validation au format lisible ici", async () => {
    doublerFetch({ code: "TVA_TAUX_NORMAL", applicable_du: "2027-01-01" });
    const etat = await validerUneVersionLivree(
      VIDE,
      formulaire({
        code: "TVA_TAUX_NORMAL",
        applicable_du: "2027-01-01",
        motif: "Confronté au Journal Officiel du 20/12/2026.",
      }),
    );
    expect(etat.fait).toContain("01/01/2027");
  });
});

describe("Le retrait, selon la sorte de décision", () => {
  it("vise la règle du cabinet ou le référentiel, selon ce qui est retiré", async () => {
    const f = doublerFetch({ fin_d_effet: "2027-01-01" });
    await retirerUneDecision(
      VIDE,
      formulaire({ identifiant: "R-001", sorte: "regle", a_compter_du: "2027-01-01", motif: "Abrogée." }),
    );
    expect(String(f.mock.calls[0][0])).toContain("/conformite/regles/propositions/R-001/retrait");

    vi.unstubAllGlobals();
    const g = doublerFetch({ fin_d_effet: "2027-01-01" });
    await retirerUneDecision(
      VIDE,
      formulaire({ identifiant: "D-001", a_compter_du: "2027-01-01", motif: "Abrogée." }),
    );
    // ⚠️ Deux chemins écrits EN ENTIER, jamais calculés : l'outil de contrat ne
    // vérifie que les chemins littéraux, et un chemin construit échapperait au
    // contrôle « tout ce que le serveur permet est à l'écran ».
    expect(String(g.mock.calls[0][0])).toContain("/transverse/referentiel/decisions/D-001/retrait");
  });
});
