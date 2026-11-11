/**
 * Ma DSF, côté adhérent (18 octobre 2026, point 24). Module sans dépendance serveur : les
 * composants client l'importent. Voir `routes_ma_dsf.py`.
 *
 * ⚠️ AUCUN CHIFFRE ET AUCUN NOM. L'adhérent suit où en est sa déclaration et verse ce qu'on
 * attend de lui ; il ne lit pas une liasse en cours d'établissement, ni qui la prépare.
 */

export type EtatDeMaDsf = "EN_PREPARATION" | "PREPAREE" | "VALIDEE" | "DEPOSEE";
export type EtatDeMaPiece = "PRODUITE" | "JOINTE" | "NEANT" | "A_FOURNIR";

export type MaPieceDsf = {
  numero: number;
  libelle: string;
  etat: EtatDeMaPiece;
  nom_du_fichier: string | null;
  /** Versable par l'adhérent : à fournir, ou versée par lui et remplaçable avant le dépôt. */
  versable: boolean;
};

export type MaDsfDeLExercice = {
  exercice: string;
  cloture: string;
  etat: EtatDeMaDsf;
  numero_accuse: string | null;
  deposee_le: string | null;
  /** La copie de la DSF déposée se télécharge. */
  document: boolean;
  a_fournir: number;
  pieces: MaPieceDsf[];
};

export type MaDsf = { exercices: MaDsfDeLExercice[] };

export const LIBELLES_DE_MA_DSF: Record<EtatDeMaDsf, string> = {
  EN_PREPARATION: "En préparation au cabinet",
  PREPAREE: "Préparée, en relecture",
  VALIDEE: "Validée, prête pour le dépôt",
  DEPOSEE: "Déposée à la DGI",
};

export const EXPLICATIONS_DE_MA_DSF: Record<EtatDeMaDsf, string> = {
  EN_PREPARATION:
    "Le cabinet arrête vos comptes de l'exercice. Les pièces ci-dessous l'aident : versez celles qui sont à fournir.",
  PREPAREE: "La déclaration est établie ; un second collaborateur la relit avant qu'elle parte.",
  VALIDEE: "La déclaration est relue et validée ; elle part sur le portail de la DGI.",
  // Sans copie quand la DSF n'est connue que par son accusé : le lien suit `document`.
  DEPOSEE: "La DGI a délivré son accusé de réception.",
};

export const LIBELLES_DE_MA_PIECE: Record<EtatDeMaPiece, string> = {
  PRODUITE: "Établie par le cabinet",
  JOINTE: "Reçue",
  NEANT: "Sans objet",
  A_FOURNIR: "À fournir",
};
