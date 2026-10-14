/**
 * Les honoraires d'un adhérent : types et libellés partagés par l'écran et les actions.
 *
 * ⚠️ AUCUN IMPORT, À DESSEIN : les composants côté navigateur en tirent leurs
 * états initiaux. Un import de `api.ts` ici casserait la construction de
 * production (voir `document-de-creation.ts`).
 */

export type EtatEcheanceDHonoraires = "REGLEE" | "A_REGLER" | "EN_RETARD" | "A_VENIR";
export type CanalDeReglement = "MOBILE_MONEY" | "GUICHET";
export type PeriodiciteDHonoraires = "MENSUELLE" | "TRIMESTRIELLE" | "ANNUELLE";

export type ReglementDHonoraires = {
  identifiant: string;
  periode: string;
  montant: string;
  canal: CanalDeReglement;
  reference_externe: string;
  constate_le: string;
};

export type EcheanceDHonoraires = {
  niu: string;
  debut: string;
  fin: string;
  exigible_le: string;
  montant: string;
  etat: EtatEcheanceDHonoraires;
  reglement: ReglementDHonoraires | null;
};

export type ContratDHonoraires = {
  niu: string;
  denomination: string;
  montant: string;
  periodicite: PeriodiciteDHonoraires;
  debut: string;
  fixe_par: string;
  fixe_le: string;
};

export type MesHonoraires = {
  contrat: ContratDHonoraires | null;
  echeances: EcheanceDHonoraires[];
  du: string;
  en_retard: number;
  reglable_en_ligne: boolean;
};

export type LigneDeCaisseHonoraires = {
  niu: string;
  denomination: string;
  periode: string;
  fin: string;
  montant: string;
  etat: EtatEcheanceDHonoraires;
  canal: CanalDeReglement | null;
  reference_externe: string | null;
  constate_le: string | null;
};

export const LIBELLES_ETAT: Record<EtatEcheanceDHonoraires, string> = {
  REGLEE: "Réglée",
  A_REGLER: "À régler",
  EN_RETARD: "En retard",
  A_VENIR: "À venir",
};

export const LIBELLES_CANAL: Record<CanalDeReglement, string> = {
  MOBILE_MONEY: "par mobile money",
  GUICHET: "au guichet",
};

export const LIBELLES_PERIODICITE: Record<PeriodiciteDHonoraires, string> = {
  MENSUELLE: "par mois",
  TRIMESTRIELLE: "par trimestre",
  ANNUELLE: "par an",
};

/** « Octobre 2026 », « 3e trimestre 2026 », « Année 2026 » : la période dans les mots de l'adhérent. */
export function nomDeLaPeriode(debut: string, periodicite: PeriodiciteDHonoraires): string {
  const d = new Date(`${debut}T12:00:00`);
  if (periodicite === "ANNUELLE") return `Année ${d.getFullYear()}`;
  if (periodicite === "TRIMESTRIELLE") {
    const fin = new Date(d);
    fin.setMonth(fin.getMonth() + 2);
    const mois = (x: Date) => x.toLocaleDateString("fr-FR", { month: "long" });
    return `${mois(d)} à ${mois(fin)} ${fin.getFullYear()}`.replace(/^./, (c) => c.toUpperCase());
  }
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());
}

export type EtatDebit = {
  echec: string | null;
  demande: { message: string; telephone: string; simule: boolean } | null;
};

export const DEBIT_INITIAL: EtatDebit = { echec: null, demande: null };
