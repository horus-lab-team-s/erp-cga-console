import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/actions-dsf", () => ({
  telechargerLeFormatDgi: vi.fn(async () => ({ echec: null, fichier: null })),
}));

import type { FormatDgi } from "@/app/lib/dsf";
import { DsfFormatDgi } from "./DsfFormatDgi";

const PRET: FormatDgi = {
  pret: true,
  obstacles: [],
  avertissements: ["Le compte 28 n'est pas ventilé par nature."],
  nom_du_fichier: "DSF_Normal_DGIFORMAT_VERROUILLEVF.xlsx",
  total_bilan: "32520000",
  resultat: "27520000",
  avec_exercice_precedent: false,
};

const bouton = () => screen.getByRole("button", { name: /DSF au format DGI/ }) as HTMLButtonElement;

/** 15 octobre 2026 : ce qui bloque se lit avant de télécharger, pas après le rejet du portail. */
describe("DsfFormatDgi", () => {
  it("prête : le total, l'avertissement, et le bouton actif", () => {
    render(<DsfFormatDgi dossier="P027788990011M" exercice="2025" etat={PRET} />);
    expect(screen.getByText(/32 520 000 FCFA|32 520 000/)).toBeTruthy();
    expect(screen.getByText(/compte 28/)).toBeTruthy();
    expect(bouton().disabled).toBe(false);
  });

  it("bloquée : la raison, et le bouton inactif", () => {
    render(
      <DsfFormatDgi
        dossier="P027788990011M"
        exercice="2026"
        etat={{ ...PRET, pret: false, obstacles: ["l'exercice n'est pas clos."], avertissements: [] }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("n'est pas clos");
    expect(bouton().disabled).toBe(true);
  });
});
