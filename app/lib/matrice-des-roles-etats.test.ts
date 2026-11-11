import { describe, expect, it } from "vitest";

import { casePermise, type DroitDeLaGrille, type RoleDeLaGrille } from "./matrice-des-roles-etats";

const role = (externe: boolean): RoleDeLaGrille => ({
  code: externe ? "ADHERENT" : "COMPTABLE",
  libelle: "x",
  permissions: [],
  systeme: true,
  externe,
  portee_obligatoire: externe,
  regle: false,
  reglee_par: null,
  reglee_le: null,
});
const droit = (d: Partial<DroitDeLaGrille>): DroitDeLaGrille => ({
  code: "X",
  libelle: "x",
  reserve_au_super_admin: false,
  geste_du_client: false,
  externe_possible: false,
  ...d,
});

describe("Les cases que la grille grise (18 octobre 2026)", () => {
  it("miroitent les bornes du serveur", () => {
    expect(casePermise(role(false), droit({ reserve_au_super_admin: true }))).toBe(false);
    expect(casePermise(role(false), droit({ geste_du_client: true, externe_possible: true }))).toBe(false);
    expect(casePermise(role(true), droit({}))).toBe(false);
    expect(casePermise(role(true), droit({ externe_possible: true }))).toBe(true);
    expect(casePermise(role(false), droit({}))).toBe(true);
  });
});
