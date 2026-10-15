import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/actions-fiche-dsf", () => ({
  enregistrerLaFicheDsf: vi.fn(async () => ({ echec: null, fait: null })),
  validerLaFicheDsf: vi.fn(async () => ({ echec: null, fait: null })),
  renvoyerLaFicheDsf: vi.fn(async () => ({ echec: null, fait: null })),
}));

import type { FicheSignaletique, VueDeLaFiche } from "@/app/lib/fiche-dsf-etats";
import { FicheDsf } from "./FicheDsf";

const VIDE: FicheSignaletique = {
  telephone: null,
  courriel: null,
  boite_postale: null,
  ville: null,
  adresse_geographique: null,
  numero_cnps_employeur: null,
  code_importateur: null,
  personne_a_contacter: null,
  professionnel_des_etats: null,
  signataire_nom: null,
  signataire_qualite: null,
  etats_approuves_en_ag: null,
  banque: null,
  numero_de_compte: null,
  pays_du_siege: "09",
  etablissements_au_cameroun: null,
  etablissements_hors_cameroun: null,
  premiere_annee_au_cameroun: null,
  controle: null,
  activites: [],
  conseil_d_administration: [],
  etat: "BROUILLON",
  modifiee_le: null,
  soumise_le: null,
  validee_le: null,
  validee_par: null,
  motif_du_renvoi: null,
};

const vue = (fiche: Partial<FicheSignaletique>, manquants: string[] = []): VueDeLaFiche => ({
  fiche: { ...VIDE, ...fiche },
  manquants,
  denomination: "SARL BATIMENT PLUS",
  forme_juridique: "SARL",
  rccm: null,
  siege: null,
});

/** 15 octobre 2026 : le client renseigne et envoie ; le cabinet valide ou renvoie. */
describe("FicheDsf", () => {
  it("brouillon chez le client : ce qui manque, le formulaire et l'envoi", () => {
    render(
      <FicheDsf dossier="M081234567890P" vue={vue({}, ["la banque de l'entreprise"])} peutRenseigner peutValider={false} cote="client" />,
    );
    expect(screen.getByText("la banque de l'entreprise")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Envoyer au cabinet" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Valider la fiche" })).toBeNull();
  });

  it("renvoyée : le motif du cabinet se lit au-dessus du formulaire", () => {
    render(
      <FicheDsf dossier="M081234567890P" vue={vue({ motif_du_renvoi: "Le code NACAM est faux." })} peutRenseigner peutValider={false} cote="client" />,
    );
    expect(screen.getByText(/Le code NACAM est faux/)).toBeTruthy();
  });

  it("validée : un résumé, et la modification se demande", () => {
    render(
      <FicheDsf dossier="M081234567890P" vue={vue({ etat: "VALIDEE", banque: "Afriland First Bank" })} peutRenseigner peutValider cote="cabinet" />,
    );
    expect(screen.getByText("Afriland First Bank")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Soumettre à la validation" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(screen.getByRole("button", { name: "Soumettre à la validation" })).toBeTruthy();
  });

  it("envoyée : le client attend, sans formulaire ; le cabinet valide ou renvoie", () => {
    const soumise = vue({ etat: "SOUMISE", banque: "Afriland First Bank" });
    const { unmount } = render(<FicheDsf dossier="M081234567890P" vue={soumise} peutRenseigner peutValider={false} cote="client" />);
    expect(screen.queryByRole("button", { name: "Envoyer au cabinet" })).toBeNull();
    expect(screen.getByText(/Le cabinet relit votre fiche/)).toBeTruthy();
    expect(screen.getByText("Afriland First Bank")).toBeTruthy();
    unmount();

    render(<FicheDsf dossier="M081234567890P" vue={soumise} peutRenseigner peutValider cote="cabinet" />);
    expect(screen.getByRole("button", { name: "Valider la fiche" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Renvoyer" })).toBeTruthy();
  });
});
