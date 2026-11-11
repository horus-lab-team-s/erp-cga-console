import { describe, expect, it } from "vitest";

import {
  debutDesDouzeMois,
  encaissementsParMois,
  montantCompact,
  partsParActivite,
  plafondDeLAxe,
  recouvrement,
} from "./vue-de-direction";

describe("encaissementsParMois", () => {
  it("couvre douze mois glissants, mois vides compris", () => {
    const mois = encaissementsParMois(
      [
        { le: "2026-01-15T10:00:00", montant: "300000" },
        { le: "2026-01-20", montant: "20000" },
        { le: "2026-11-02", montant: "45000" },
        { le: "2025-11-30", montant: "999" }, // hors fenêtre
      ],
      "2026-11-09",
    );
    expect(mois).toHaveLength(12);
    expect(mois[0]).toMatchObject({ mois: "2025-12", libelle: "déc.", montant: 0 });
    expect(mois[1]).toMatchObject({ mois: "2026-01", montant: 320000 });
    expect(mois[11]).toMatchObject({ mois: "2026-11", libelle: "nov.", montant: 45000 });
  });

  it("franchit le changement d'année", () => {
    expect(debutDesDouzeMois("2026-03-31")).toBe("2025-04-01");
    expect(debutDesDouzeMois("2026-12-01")).toBe("2026-01-01");
  });
});

describe("recouvrement", () => {
  it("écarte les adhérents sans contrat et somme ce qui reste dû", () => {
    const r = recouvrement([
      { etat: "EN_REGLE", du: "0" },
      { etat: "EN_REGLE", du: "0" },
      { etat: "EN_RETARD", du: "90000" },
      { etat: "BLOQUE", du: "120000" },
      { etat: "SANS_CONTRAT", du: "0" },
    ]);
    expect(r).toMatchObject({ sousContrat: 4, aJour: 2, enRetard: 1, bloques: 1, aRecouvrer: 210000 });
    expect(r.taux).toBe(0.5);
  });

  it("ne rend pas de taux sans aucun contrat", () => {
    expect(recouvrement([{ etat: "SANS_CONTRAT", du: "0" }]).taux).toBeNull();
  });
});

describe("partsParActivite", () => {
  it("trie de la plus grosse et ignore les activités à zéro", () => {
    const p = partsParActivite([
      { axe: "INSCRIPTION", montant: "100000" },
      { axe: "HONORAIRES", montant: "300000" },
      { axe: "TVA", montant: "0" },
    ]);
    expect(p.map((x) => x.axe)).toEqual(["HONORAIRES", "INSCRIPTION"]);
    expect(p[0].part).toBe(0.75);
  });
});

describe("axe", () => {
  it("arrondit le plafond à une graduation propre", () => {
    expect(plafondDeLAxe(300000)).toBe(500000);
    expect(plafondDeLAxe(165000)).toBe(200000);
    expect(plafondDeLAxe(0)).toBe(1);
  });

  it("écrit les graduations en compact", () => {
    expect(montantCompact(250000)).toBe("250 k");
    expect(montantCompact(1500000)).toBe("1,5 M");
  });
});
