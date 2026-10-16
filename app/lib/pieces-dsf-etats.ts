/**
 * Les pièces à joindre à la DSF (15 octobre 2026), côté affichage. Module sans
 * dépendance serveur : les composants client l'importent.
 */

export type EtatPiece = "PRODUITE" | "JOINTE" | "NEANT" | "A_FOURNIR";

export type PieceLue = {
  numero: number;
  libelle: string;
  page: string;
  etat: EtatPiece;
  produite: string | null;
  motif: string | null;
  nom_du_fichier: string | null;
  par: string | null;
};

export type PiecesDeLaDsf = {
  systeme: "NORMAL" | "MINIMAL";
  pieces: PieceLue[];
  a_fournir: number;
  complet: boolean;
};

export const LIBELLES_ETAT_PIECE: Record<EtatPiece, string> = {
  PRODUITE: "Produite par la plateforme",
  JOINTE: "Versée",
  NEANT: "Sans objet",
  A_FOURNIR: "À fournir",
};
