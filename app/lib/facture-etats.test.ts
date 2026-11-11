import { describe, expect, it } from "vitest";

import { ventilerLeTtc } from "./facture-etats";

describe("Le HT et la TVA tirés du TTC", () => {
  it("rend le HT au taux général, CAC compris", () => {
    expect(ventilerLeTtc(119_250, 19.25)).toEqual({ ht: 100_000, tva: 19_250 });
  });

  it("arrondit le HT au franc, et HT + TVA refait exactement le TTC", () => {
    const { ht, tva } = ventilerLeTtc(50_001, 19.25);
    expect(ht).toBe(41_930);
    expect(ht + tva).toBe(50_001);
  });

  it("à taux nul, tout est HT", () => {
    expect(ventilerLeTtc(80_000, 0)).toEqual({ ht: 80_000, tva: 0 });
  });
});
