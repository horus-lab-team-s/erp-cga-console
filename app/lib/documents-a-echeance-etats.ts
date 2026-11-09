/**
 * Les documents à échéance (lot 4, 9 novembre 2026). Sans import : les composants côté
 * navigateur en tirent leurs types.
 */

export type SorteDeDocument = {
  code: string;
  libelle: string;
  /** Absente : la durée n'est pas établie, l'expiration se saisit. */
  validite_mois: number | null;
  statut: string;
  fondement: string | null;
  source: string | null;
};

export type CatalogueDesDocuments = { documents: SorteDeDocument[]; source: string };

export type DocumentAEcheance = {
  identifiant: string;
  code: string;
  libelle: string;
  delivre_le: string;
  expire_le: string;
  reference: string | null;
};

export type DocumentsDuDossier = {
  en_vigueur: { document: DocumentAEcheance; jours_restants: number; expire: boolean }[];
  historique: DocumentAEcheance[];
};

export type Expiration = {
  objet: "DOCUMENT" | "ADHESION" | "MANDAT";
  dossier: string;
  denomination: string;
  libelle: string;
  expire_le: string;
  jours_restants: number;
};

/** Le ton d'une échéance : rouge expiré ou imminent, orange à moins d'un mois. */
export function tonDeLEcheance(joursRestants: number): "rouge" | "orange" | "calme" {
  if (joursRestants <= 7) return "rouge";
  if (joursRestants <= 30) return "orange";
  return "calme";
}
