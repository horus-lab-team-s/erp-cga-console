import { describe, expect, it } from "vitest";

import { enBlocs } from "./recrutement-etats";

describe("enBlocs (même découpage que le backend)", () => {
  it("titres, listes et emphases", () => {
    const blocs = enBlocs("### Profil recherché\n- Licence en **comptabilité**\n- Maîtrise du *SYSCOHADA*\n\nUne première ligne\nsuivie d'une seconde.");
    expect(blocs.map((b) => b.type)).toEqual(["intertitre", "liste", "paragraphe"]);
    const liste = blocs[1] as Extract<(typeof blocs)[number], { type: "liste" }>;
    expect(liste.points[0].map((s) => [s.texte, s.gras])).toEqual([
      ["Licence en ", false],
      ["comptabilité", true],
    ]);
    expect(liste.points[1][1].italique).toBe(true);
  });

  it("aucun HTML n'est interprété", () => {
    const [bloc] = enBlocs("<script>alert(1)</script> et <b>gras</b>");
    expect(bloc).toEqual({
      type: "paragraphe",
      segments: [{ texte: "<script>alert(1)</script> et <b>gras</b>", gras: false, italique: false }],
    });
  });
});
