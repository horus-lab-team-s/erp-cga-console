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

/**
 * Le HT et la TVA tirés d'un TTC (18 octobre 2026) : « si je fournis déjà le TTC, la TVA
 * doit en ressortir, et le HT ». En francs CFA, sans centimes : HT = TTC ÷ (1 + taux),
 * arrondi au franc, et la TVA est le reste, pour que HT + TVA rende exactement le TTC.
 *
 * ⚠️ Une proposition : une facture exonérée, ou à un autre taux, se corrige à la main.
 * Le taux vient du référentiel (`TVA_TAUX_GENERAL`, CAC compris), jamais d'une constante.
 */
export function ventilerLeTtc(ttc: number, tauxPourCent: number): { ht: number; tva: number } {
  const ht = Math.round(ttc / (1 + tauxPourCent / 100));
  return { ht, tva: ttc - ht };
}
