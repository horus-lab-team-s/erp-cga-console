/**
 * Les fonds de tiers : ce qu'un adhérent confie au cabinet pour payer l'administration.
 *
 * ⚠️ AUCUN IMPORT : les composants navigateur en tirent leurs types (voir `document-de-creation.ts`).
 */

export type EtatAppelDeFonds = "A_REGLER" | "FONDS_RECUS" | "REVERSE";

export type AppelDeFonds = {
  identifiant: string;
  niu: string;
  denomination: string;
  code_obligation: string;
  libelle: string;
  periode_debut: string;
  periode_fin: string;
  montant: string;
  arrete_par: string;
  arrete_le: string;
  etat: EtatAppelDeFonds;
  canal: "MOBILE_MONEY" | "GUICHET" | null;
  reference_des_fonds: string | null;
  fonds_recus_le: string | null;
  quittance: string | null;
  reverse_le: string | null;
};

export type MesFondsConfies = {
  /** Les obligations que le cabinet paie pour l'adhérent, aujourd'hui. Vide : aucun mandat. */
  obligations_mandatees: string[];
  appels: AppelDeFonds[];
};
