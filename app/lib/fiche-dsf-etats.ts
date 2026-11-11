/**
 * La fiche signalétique de la DSF (fiches R1 à R3), côté affichage (15 octobre 2026).
 * Module sans dépendance serveur : les composants client l'importent.
 */

export type EtatFiche = "BROUILLON" | "SOUMISE" | "VALIDEE";
export type ControleDeLEntite = "PUBLIC" | "PRIVE_NATIONAL" | "PRIVE_ETRANGER";

export type ActiviteDeclaree = { designation: string; code_nacam: string; chiffre_affaires_ht: string | null };
export type MembreDuConseil = { nom: string; prenoms: string | null; qualite: string; adresse: string | null };

export type FicheSignaletique = {
  telephone: string | null;
  courriel: string | null;
  boite_postale: string | null;
  ville: string | null;
  adresse_geographique: string | null;
  numero_cnps_employeur: string | null;
  code_importateur: string | null;
  personne_a_contacter: string | null;
  professionnel_des_etats: string | null;
  signataire_nom: string | null;
  signataire_qualite: string | null;
  etats_approuves_en_ag: boolean | null;
  banque: string | null;
  numero_de_compte: string | null;
  pays_du_siege: string;
  etablissements_au_cameroun: number | null;
  etablissements_hors_cameroun: number | null;
  premiere_annee_au_cameroun: number | null;
  controle: ControleDeLEntite | null;
  activites: ActiviteDeclaree[];
  conseil_d_administration: MembreDuConseil[];
  etat: EtatFiche;
  modifiee_le: string | null;
  soumise_le: string | null;
  validee_le: string | null;
  validee_par: string | null;
  motif_du_renvoi: string | null;
};

export type VueDeLaFiche = {
  fiche: FicheSignaletique;
  manquants: string[];
  denomination: string;
  forme_juridique: string;
  rccm: string | null;
  siege: string | null;
};

export const LIBELLES_ETAT_FICHE: Record<EtatFiche, string> = {
  BROUILLON: "À compléter",
  SOUMISE: "Envoyée au cabinet",
  VALIDEE: "Validée par le cabinet",
};

export const LIBELLES_CONTROLE: Record<ControleDeLEntite, string> = {
  PUBLIC: "Public",
  PRIVE_NATIONAL: "Privé national",
  PRIVE_ETRANGER: "Privé étranger",
};

/** Les champs texte de la fiche, dans l'ordre du formulaire : [nom, libellé, aide]. */
export const CHAMPS_R1: [keyof FicheSignaletique, string, string?][] = [
  ["telephone", "Téléphone de l'entreprise"],
  ["courriel", "Courriel"],
  ["boite_postale", "Boîte postale"],
  ["ville", "Ville du siège"],
  ["adresse_geographique", "Adresse géographique", "Immeuble, rue, quartier"],
  ["numero_cnps_employeur", "N° CNPS employeur", "Si vous avez des salariés"],
  ["code_importateur", "N° de code importateur", "Si vous importez"],
  ["personne_a_contacter", "Personne à contacter"],
  ["signataire_nom", "Signataire des états financiers"],
  ["signataire_qualite", "Qualité du signataire", "Gérant, directeur général…"],
  ["banque", "Banque"],
  ["numero_de_compte", "Numéro de compte"],
];
