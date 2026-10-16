/**
 * L'inscription au portefeuille d'une entreprise existante, depuis son dossier commercial
 * payé (16 octobre 2026). Module sans dépendance serveur : les composants client l'importent.
 */

export type PropositionDInscription = {
  denomination: string | null;
  telephone: string | null;
  regime: "REEL" | "IGS" | null;
  groupe_risque_cnps: "A" | "B" | "C" | null;
  numero_cnps_employeur: string | null;
};

export type EtatDeLInscription = {
  reference: string;
  service: string;
  inscriptible: boolean;
  motif: string | null;
  inscrit_sous: string | null;
  proposition: PropositionDInscription;
};

export const FORMES_JURIDIQUES: { code: string; libelle: string }[] = [
  { code: "SARL", libelle: "SARL" },
  { code: "SARLU", libelle: "SARL unipersonnelle" },
  { code: "SAS", libelle: "SAS" },
  { code: "SA", libelle: "SA" },
  { code: "ETS", libelle: "Établissement (entreprise individuelle)" },
  { code: "SCI", libelle: "SCI" },
  { code: "GIE", libelle: "GIE" },
  { code: "ASSOCIATION", libelle: "Association" },
  { code: "PERSONNE_PHYSIQUE", libelle: "Personne physique" },
];
