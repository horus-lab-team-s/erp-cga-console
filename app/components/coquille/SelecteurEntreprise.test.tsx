import { describe, expect, it } from "vitest";

import { initiales } from "./SelecteurEntreprise";

describe("Les initiales d'un dossier", () => {
  it("écartent la forme juridique et les articles", () => {
    expect(initiales("SARL BATIMENT PLUS")).toBe("BP");
    expect(initiales("BOULANGERIE LA COLOMBE SARL")).toBe("BC");
  });

  it("ignorent les signes", () => {
    expect(initiales("ETS TCHOUMBA & FILS")).toBe("TF");
  });

  it("gardent les mots quand il ne reste que la forme", () => {
    expect(initiales("SARL")).toBe("S");
  });
});
