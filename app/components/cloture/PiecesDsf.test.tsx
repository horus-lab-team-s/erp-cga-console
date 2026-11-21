import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/actions-dsf", () => ({
  verserUnePieceDsf: vi.fn(async () => ({ echec: null, fait: null })),
  declarerUnePieceSansObjet: vi.fn(async () => ({ echec: null, fait: null })),
  retirerUnePieceDsf: vi.fn(async () => ({ echec: null, fait: null })),
  telechargerUnePieceDsf: vi.fn(async () => ({ echec: null, fichier: null })),
}));

import type { PiecesDeLaDsf } from "@/app/lib/pieces-dsf-etats";
import { PiecesDsf } from "./PiecesDsf";

const ETAT: PiecesDeLaDsf = {
  systeme: "NORMAL",
  a_fournir: 1,
  complet: false,
  pieces: [
    {
      numero: 1,
      libelle: "Attestation de visa",
      page: "Fiche R1",
      etat: "A_FOURNIR",
      produite: null,
      motif: null,
      nom_du_fichier: null,
      par: null,
    },
    {
      numero: 2,
      libelle: "Balance auxiliaire clients",
      page: "Note 7",
      etat: "PRODUITE",
      produite: "balance-clients",
      motif: null,
      nom_du_fichier: null,
      par: null,
    },
    {
      numero: 19,
      libelle: "Droits d'accises",
      page: "C2 Note 25",
      etat: "NEANT",
      produite: null,
      motif: "Aucun produit soumis aux accises.",
      nom_du_fichier: null,
      par: "a.bouba",
    },
  ],
};

/** 15 octobre 2026 : ce qui manque se lit avant le portail, avec la page où le joindre. */
describe("PiecesDsf", () => {
  it("dit combien manquent, et où chaque pièce se joint", () => {
    render(<PiecesDsf dossier="M081234567890P" exercice="2026" etat={ETAT} peutPreparer />);
    expect(screen.getByText(/1 pièce à fournir/)).toBeTruthy();
    expect(screen.getByText(/Note 7/)).toBeTruthy();
    expect(screen.getByText(/Aucun produit soumis aux accises/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verser" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remettre à fournir" })).toBeTruthy();
  });

  it("sans le droit de préparer : on lit et on télécharge, on ne verse pas", () => {
    render(<PiecesDsf dossier="M081234567890P" exercice="2026" etat={ETAT} peutPreparer={false} />);
    expect(screen.queryByRole("button", { name: "Verser" })).toBeNull();
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeTruthy();
  });
});
