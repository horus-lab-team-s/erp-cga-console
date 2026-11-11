import { describe, expect, it } from "vitest";

import { couperLAide } from "@/app/components/Tableau";

describe("couperLAide", () => {
  it("laisse entière une aide courte", () => {
    expect(couperLAide("Les plus récents d'abord.")).toEqual(["Les plus récents d'abord.", null]);
  });

  it("coupe une aide longue après sa première phrase", () => {
    const [tete, suite] = couperLAide(
      "Un bien par fiche, daté de sa mise en service. Un bien cédé ou saisi par erreur se sort du registre, il ne s'efface jamais, pour que la dotation reste juste.",
    );
    expect(tete).toBe("Un bien par fiche, daté de sa mise en service.");
    expect(suite).toMatch(/^Un bien cédé/);
  });

  it("ne coupe pas aux deux-points", () => {
    const aide = "Réservé au cabinet : chaque règle porte son fondement, son statut de validation, et le prédicat que le moteur exécute.";
    expect(couperLAide(aide)).toEqual([aide, null]);
  });
});
