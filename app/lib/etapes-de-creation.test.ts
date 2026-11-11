import { describe, expect, it } from "vitest";

import { ETAPES_DE_CREATION, positionDansLaCreation } from "./etapes-de-creation";

const indice = (code: string) => ETAPES_DE_CREATION.findIndex((e) => e.code === code);

describe("Où elle en est de sa création", () => {
  it("place chaque étape du domaine sur la frise", () => {
    for (const code of ["QUALIFICATION", "CONSTITUTION", "DEPOT_CFCE", "SUIVI_IMMATRICULATION", "LIVRAISON"]) {
      expect(positionDansLaCreation(code, false).courante).toBe(indice(code));
    }
  });

  it("ne dit pas « immatriculation en cours » au-dessus de ses numéros", () => {
    // Le RCCM et le NIU arrivent PENDANT le suivi : la frise avance d'elle-même à la remise.
    expect(positionDansLaCreation("SUIVI_IMMATRICULATION", true).courante).toBe(indice("LIVRAISON"));
  });

  it("dit terminé une société convertie, et ne lit plus la frise d'un dossier abandonné", () => {
    expect(positionDansLaCreation("CONVERTI", true).terminee).toBe(true);
    expect(positionDansLaCreation("ABANDONNE", false).abandonnee).toBe(true);
  });

  it("commence par le règlement, déjà franchi quand le dossier existe", () => {
    expect(ETAPES_DE_CREATION[0].code).toBe("REGLEMENT");
    expect(positionDansLaCreation("QUALIFICATION", false).courante).toBeGreaterThan(0);
  });
});
