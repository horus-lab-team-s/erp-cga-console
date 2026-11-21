/**
 * Le journal de caisse (18 octobre 2026) : types et libellés partagés.
 * ⚠️ Aucun import : les composants navigateur en tirent leurs types.
 */

export type AxeDeVersement =
  | "INSCRIPTION"
  | "CREATION"
  | "PRESTATION"
  | "ABONNEMENT_EN_LIGNE"
  | "HONORAIRES"
  | "TVA"
  | "CNPS"
  | "IRPP_SALAIRES";

export type FamilleDeVersement = "COMMERCE" | "HONORAIRES" | "FONDS_DE_TIERS";

export type LigneDuJournal = {
  le: string;
  axe: AxeDeVersement;
  objet: string;
  client: string;
  dossier: string;
  montant: string;
  canal: "MOBILE_MONEY" | "GUICHET";
  reference: string | null;
};

export type TotalParAxe = {
  axe: AxeDeVersement;
  nombre: number;
  montant: string;
  dont_mobile_money: string;
  dont_guichet: string;
};

export type JournalDeCaisse = {
  du: string;
  au: string;
  lignes: LigneDuJournal[];
  totaux: TotalParAxe[];
  total_du_cabinet: string;
  total_des_fonds_de_tiers: string;
  familles_visibles: FamilleDeVersement[];
};

export type NotificationNonRattachee = {
  recue_le: string;
  reference_externe: string | null;
  identifiant_produit: string | null;
  telephone: string | null;
  montant: string | null;
  reussi: boolean | null;
};

export const LIBELLES_AXE: Record<AxeDeVersement, string> = {
  INSCRIPTION: "Inscription",
  CREATION: "Création d'entreprise",
  PRESTATION: "Prestation",
  ABONNEMENT_EN_LIGNE: "Abonnement en ligne",
  HONORAIRES: "Honoraires",
  TVA: "TVA",
  CNPS: "CNPS",
  IRPP_SALAIRES: "IRPP sur salaires",
};

export const LIBELLES_FAMILLE: Record<FamilleDeVersement, string> = {
  COMMERCE: "inscriptions, créations et prestations",
  HONORAIRES: "honoraires",
  FONDS_DE_TIERS: "fonds de tiers (TVA, CNPS, IRPP)",
};
