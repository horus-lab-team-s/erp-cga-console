/** Ce que le navigateur peut importer de la DSF : types et libellés, sans appel réseau. */

/** La DSF d'un exercice, version par version (14 octobre 2026). Voir `routes_dsf.py`. */
export type EtatDsf = "PREPAREE" | "VALIDEE" | "DEPOSEE" | "REMPLACEE";

export type VersionDsf = {
  identifiant: string;
  version: number;
  etat: EtatDsf;
  systeme: string;
  resultat_comptable: string;
  resultat_fiscal: string;
  empreinte: string;
  preparee_par: string;
  /** Le nom de la personne, résolu par le serveur ; `preparee_par` reste l'identifiant du compte. */
  preparee_par_nom: string;
  preparee_le: string;
  validee_par: string | null;
  validee_par_nom: string | null;
  validee_le: string | null;
  numero_accuse: string | null;
  deposee_le: string | null;
  deposee_par: string | null;
  deposee_par_nom: string | null;
  piece_accuse: string | null;
};

export const LIBELLES_ETAT_DSF: Record<EtatDsf, string> = {
  PREPAREE: "Préparée · à valider par le réviseur",
  VALIDEE: "Validée · à déposer sur le portail de la DGI",
  DEPOSEE: "Déposée à la DGI",
  REMPLACEE: "Remplacée",
};
