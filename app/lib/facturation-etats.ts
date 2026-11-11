/**
 * L'identité fiscale du cabinet (18 octobre 2026). Module sans dépendance serveur : les
 * composants client l'importent. Voir `domaine/facturation.py`.
 */

export type RegimeTvaDuCabinet = "ASSUJETTI" | "NON_ASSUJETTI" | "EXONERE";
export type MontantsConvenus = "HT" | "TTC";

export type IdentiteFiscaleDuCabinet = {
  niu: string | null;
  rccm: string | null;
  regime_tva: RegimeTvaDuCabinet | null;
  taux_tva: string | null;
  montants_convenus: MontantsConvenus | null;
  fondement_exoneration: string | null;
  modifiee_le: string | null;
};

export type IdentiteLue = { identite: IdentiteFiscaleDuCabinet; manques: string[]; complete: boolean };

export const LIBELLES_REGIME_TVA: Record<RegimeTvaDuCabinet, string> = {
  ASSUJETTI: "Assujetti à la TVA",
  NON_ASSUJETTI: "Non assujetti",
  EXONERE: "Exonéré de TVA",
};
