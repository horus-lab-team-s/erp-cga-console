/**
 * La lecture d'une facture et sa proposition d'écriture : types partagés (14 octobre 2026).
 * ⚠️ Aucun import : les composants navigateur en tirent leurs types.
 */

export type ValeurProposee = {
  champ: string;
  valeur: unknown;
  confiance: string;
  /** À relire : confiance sous le seuil, ou montants, NIU et date quel que soit le score. */
  a_relire: boolean;
};

export type LectureProposee = { moteur: string; incident: string | null; valeurs: ValeurProposee[] };

export type LigneSaisie = { designation: string; montant_ht: string };

export type FactureSaisie = {
  emetteur: string;
  niu_emetteur: string | null;
  niu_actif: boolean | null;
  reference: string;
  date_emission: string;
  lignes: LigneSaisie[];
  montant_ht: string;
  montant_tva: string;
  montant_ttc: string;
  source: "SAISIE" | "LECTURE_AUTOMATIQUE";
};

export type LigneProposee = { compte: string; libelle: string; sens: "DEBIT" | "CREDIT"; montant: string; tiers: string | null };

export type PropositionDeLaPiece = {
  comptabilisable: boolean;
  empechements: string[];
  numero_pressenti: number | null;
  saisie: {
    journal: string;
    exercice: string;
    date_operation: string;
    libelle: string;
    piece_justificative: string | null;
    reference_externe: string | null;
    lignes: LigneProposee[];
  } | null;
};
