import { describe, expect, it } from "vitest";

import { libelleDeRubrique, rubriquesDuType } from "./missions-etats";

/** 15 octobre 2026 : une DSF ciblée affichait « Objet du contrat » et proposait « Parties ». */
describe("les rubriques selon le type de mission", () => {
  it("une DSF ciblée ne parle pas de contrat", () => {
    for (const r of rubriquesDuType("DSF_CIBLEE")) {
      expect(libelleDeRubrique(r, "DSF_CIBLEE").toLowerCase()).not.toContain("contrat");
    }
    expect(rubriquesDuType("DSF_CIBLEE")).not.toContain("PARTIES");
  });

  it("l'analyse de contrat garde ses intitulés", () => {
    expect(libelleDeRubrique("RESUME", "ANALYSE_CONTRAT")).toBe("Objet du contrat");
    expect(rubriquesDuType("REDACTION_CONTRAT")).toEqual(["ARTICLE"]);
  });
});
