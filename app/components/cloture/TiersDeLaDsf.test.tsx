import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/actions-dsf", () => ({
  renseignerUnTiers: vi.fn(async () => ({ echec: null, fait: null })),
}));

import type { DeclarationParTiers, TiersDeclare } from "@/app/lib/tiers-dsf-etats";
import { TiersDeLaDsf } from "./TiersDeLaDsf";

const QUINCAILLERIE: TiersDeclare = {
  tiers: "M053311224455R",
  denomination: "QUINCAILLERIE DU WOURI",
  niu: "M053311224455R",
  pays: "CAMEROUN",
  sigle: null,
  telephone: null,
  ville: null,
  au_registre: false,
  etranger: false,
};

const DECLARATION: DeclarationParTiers = {
  nature: "fournisseurs",
  nom_du_fichier: "MODELE FOURNISSEURS.xlsx",
  avertissements: [],
  lignes: [
    QUINCAILLERIE,
    { ...QUINCAILLERIE, tiers: "M045566778899G", denomination: "LOCATION ENGINS", telephone: "699", ville: "Douala" },
  ],
};

describe("TiersDeLaDsf", () => {
  it("dit ce qui manque à chaque fiche, et combien sont à compléter", () => {
    render(<TiersDeLaDsf dossier="M081234567890P" declaration={DECLARATION} peutSaisir />);
    expect(screen.getByText("1 fiche à compléter.")).toBeTruthy();
    expect(screen.getByText("Manque : téléphone, ville")).toBeTruthy();
    expect(screen.getByText("Complète")).toBeTruthy();
  });

  it("ouvre le formulaire, et ne demande le pays qu'à un tiers étranger", () => {
    render(<TiersDeLaDsf dossier="M081234567890P" declaration={DECLARATION} peutSaisir />);
    fireEvent.click(screen.getByRole("button", { name: "Compléter la fiche" }));
    expect(screen.queryByLabelText("Pays de résidence")).toBeNull();
    fireEvent.click(screen.getByLabelText("Réside hors du Cameroun"));
    expect(screen.getByLabelText("Pays de résidence")).toBeTruthy();
  });

  it("sans la saisie des écritures, la liste se lit sans geste", () => {
    render(<TiersDeLaDsf dossier="M081234567890P" declaration={DECLARATION} peutSaisir={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
