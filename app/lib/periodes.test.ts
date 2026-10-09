import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const { moisPrecedent: moisDeclaratif } = await import("./obligations");
const { moisPrecedent: moisAvant } = await import("./fiche-dossier");
const { signe } = await import("./rapprochement");

/**
 * Les périodes de déclaration, et le signe d'un mouvement.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI CES TROIS FONCTIONS ENSEMBLE
 *
 * Elles décident de ce qui est déclaré, pour quel mois, et dans quel sens. Une
 * erreur ici ne se voit pas : le total reste plausible, l'écran reste propre, et
 * c'est le rapprochement bancaire — ou l'administration — qui la trouve.
 *
 * Le dernier jour d'un mois est le cas d'école : 28, 29, 30 ou 31 selon le mois
 * ET l'année. Écrit à la main, on oublie février bissextile ; calculé par « le
 * jour 0 du mois suivant », on ne peut pas se tromper.
 * ─────────────────────────────────────────────────────────────────────────────
 */

describe("Le mois de déclaration proposé par défaut", () => {
  it("borne le mois du premier au dernier jour", () => {
    const m = moisDeclaratif();
    expect(m.debut).toMatch(/^\d{4}-\d{2}-01$/);
    expect(m.fin.slice(0, 7)).toBe(m.debut.slice(0, 7));
    // ⚠️ La fin est DANS le mois, jamais le premier du suivant : une borne
    // dépassée d'un jour ferait entrer une facture du mois suivant dans la
    // déclaration.
    expect(Number(m.fin.slice(8, 10))).toBeGreaterThanOrEqual(28);
    expect(Number(m.fin.slice(8, 10))).toBeLessThanOrEqual(31);
  });

  it("nomme le mois en toutes lettres, en français", () => {
    expect(moisDeclaratif().libelle).toMatch(
      /^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}$/,
    );
  });

  it("désigne bien le mois ÉCOULÉ, pas le mois courant", () => {
    const m = moisDeclaratif();
    const aujourdHui = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 7);
    expect(m.debut.slice(0, 7) < aujourdHui).toBe(true);
  });
});

describe("Le dernier jour d'un mois", () => {
  it("connaît les mois de 31, de 30 et de 28 jours", () => {
    expect(moisAvant("2026-02-10").fin).toBe("2026-01-31");
    expect(moisAvant("2026-05-10").fin).toBe("2026-04-30");
    expect(moisAvant("2026-03-10").fin).toBe("2026-02-28");
  });

  it("connaît le 29 février d'une année bissextile", () => {
    // ⚠️ Le cas qu'on oublie en écrivant la liste à la main. 2028 est
    // bissextile ; une déclaration bornée au 28 laisserait un jour dehors.
    expect(moisAvant("2028-03-10").fin).toBe("2028-02-29");
  });

  it("recule d'une année en janvier", () => {
    const m = moisAvant("2026-01-15");
    expect(m.debut).toBe("2025-12-01");
    expect(m.fin).toBe("2025-12-31");
    expect(m.libelle).toBe("12/2025");
  });

  it("borne toujours du 1er au dernier jour, sur les douze mois", () => {
    for (let mois = 1; mois <= 12; mois += 1) {
      const jour = `2026-${String(mois).padStart(2, "0")}-15`;
      const m = moisAvant(jour);
      expect(m.debut, `mois ${mois}`).toMatch(/-01$/);
      expect(m.fin.slice(0, 7), `mois ${mois}`).toBe(m.debut.slice(0, 7));
      // Le lendemain de la fin est le premier du mois suivant : la preuve que
      // la borne ne laisse aucun jour dehors et n'en prend aucun en trop.
      const lendemain = new Date(`${m.fin}T00:00:00Z`);
      lendemain.setUTCDate(lendemain.getUTCDate() + 1);
      expect(lendemain.toISOString().slice(8, 10), `mois ${mois}`).toBe("01");
    }
  });
});

describe("Le signe d'un mouvement, vu de l'entreprise", () => {
  it("compte un débit comme une entrée sur le compte", () => {
    // ⚠️ Le point de vue est celui de L'ENTREPRISE, pas celui de la banque. Sur
    // un relevé bancaire, les deux sens sont inversés : c'est l'erreur qui fait
    // qu'un rapprochement « équilibre » à l'envers, avec un écart du double du
    // montant.
    expect(signe("150000", "DEBIT")).toBe(150000);
  });

  it("compte un crédit comme une sortie", () => {
    expect(signe("150000", "CREDIT")).toBe(-150000);
  });

  it("s'annule quand les deux sens portent le même montant", () => {
    expect(signe("150000", "DEBIT") + signe("150000", "CREDIT")).toBe(0);
  });

  it("accepte les décimales que le backend rend en chaîne", () => {
    expect(signe("1500.75", "DEBIT")).toBe(1500.75);
  });

  it("rend zéro sur un montant absent plutôt que NaN", () => {
    // Un NaN se propage dans toute une somme : un seul mouvement illisible et
    // le total du rapprochement devient « NaN », donc inexploitable.
    expect(signe("", "DEBIT")).toBe(0);
  });
});
