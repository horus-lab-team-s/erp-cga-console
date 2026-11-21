import { describe, expect, it } from "vitest";

import { parResponsable, type Retard } from "./retards";

/** Lot 4 (9 novembre 2026) : les retards regroupés par responsable, pour la direction. */

const retard = (dossier: string, responsables: Retard["responsables"]): Retard => ({
  categorie: "DECLARATION",
  dossier,
  denomination: dossier,
  libelle: "TVA d'octobre",
  echeance: "2026-11-15",
  jours_de_retard: 3,
  lien: "/obligations",
  responsables,
});

describe("Les retards par responsable", () => {
  it("met un retard sous chacun de ses porteurs, et les orphelins sous « Non attribué »", () => {
    const groupes = parResponsable([
      retard("A", [{ compte: "C-1", nom: "Laure FOTSO" }]),
      retard("B", [
        { compte: "C-1", nom: "Laure FOTSO" },
        { compte: "C-2", nom: "Alain BOUBA" },
      ]),
      retard("C", []),
    ]);
    expect(groupes.map((g) => [g.nom, g.retards.length])).toEqual([
      ["Laure FOTSO", 2],
      ["Alain BOUBA", 1],
      ["Non attribué", 1],
    ]);
  });
});
