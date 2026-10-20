import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Les actions serveur sont doublées : ce fichier éprouve le PANNEAU, pas l'appel.
vi.mock("@/app/lib/actions-dsf", () => ({
  preparerLaDsf: vi.fn(async () => ({ echec: null, enregistree: null })),
  validerLaDsf: vi.fn(async () => ({ echec: null, enregistree: null })),
  demanderUneRelectureDsf: vi.fn(async () => ({ echec: null, message: null, remarques: [] })),
}));
vi.mock("@/app/lib/actions-collecte", () => ({
  constaterLeDepotDeLaDsf: vi.fn(async () => ({ echec: null, enregistree: null })),
}));

import type { VersionDsf } from "@/app/lib/dsf-etats";
import { DeclarationDsf } from "./DeclarationDsf";

/**
 * ⚠️ CELLE QUI A PRÉPARÉ NE SE VOIT PAS OFFRIR DE VALIDER (15 octobre 2026).
 *
 * Le bouton s'offrait à la réviseure qui venait de préparer, et le serveur la refusait
 * ensuite. Le serveur reste la garde ; l'écran, lui, dit qui doit agir.
 */
const PREPAREE: VersionDsf = {
  identifiant: "DSF-1",
  version: 1,
  etat: "PREPAREE",
  systeme: "NORMAL",
  resultat_comptable: "27520000",
  resultat_fiscal: "13760000",
  empreinte: "8db35adab9e18c3f",
  preparee_par: "C-003",
  preparee_par_nom: "Aïcha BOUBA",
  preparee_le: "2026-10-15T10:01:00",
  validee_par: null,
  validee_par_nom: null,
  validee_le: null,
  numero_accuse: null,
  deposee_le: null,
  deposee_par: null,
  deposee_par_nom: null,
  piece_accuse: null,
};

function panneau(compte: string) {
  return render(
    <DeclarationDsf
      dossier="P027788990011M"
      exercice="2025"
      versions={[PREPAREE]}
      peutPreparer
      peutValider
      peutDeposer={false}
      compte={compte}
      porteDuSecondFacteur={null}
    />,
  );
}

describe("DeclarationDsf", () => {
  it("n'offre pas la validation à celle qui a préparé", () => {
    panneau("C-003");
    expect(screen.queryByRole("button", { name: /Valider la version 1/ })).toBeNull();
    expect(screen.getByText(/un autre réviseur la relit et la valide/)).toBeTruthy();
  });

  it("l'offre à un autre réviseur", () => {
    panneau("C-007");
    expect(screen.getByRole("button", { name: /Valider la version 1/ })).toBeTruthy();
  });
});
