/**
 * Le plan de travail d'un collaborateur (pas 104) : par quoi commencer.
 *
 * ⚠️ L'écran n'ordonne rien et ne calcule aucune priorité : le backend rend les tâches déjà
 * triées par échéance puis par gravité, selon les réglages du référentiel.
 */

import { appeler } from "@/app/lib/api";

export type Tache = {
  nature:
    | "TRAITER_PIECES"
    | "RELANCER_PIECES"
    | "PREPARER_DECLARATION"
    | "RAPPROCHER_RELEVE"
    | "REPRENDRE_REMARQUES"
    | "TRANSMETTRE_MOIS";
  dossier: string;
  denomination: string;
  libelle: string;
  volume: string;
  echeance: string | null;
  en_retard: boolean;
  priorite: "URGENTE" | "ELEVEE" | "NORMALE";
  lien: string;
  elements: string[];
};

export type LigneDeDossier = {
  niu: string;
  denomination: string;
  taches: number;
  prochaine_echeance: string | null;
  revue_du_mois_precedent: "NON_TRANSMIS" | "TRANSMISE" | "RENVOYEE" | "VALIDEE" | "SANS_ECRITURE";
};

export type PlanDeTravail = {
  a_la_date: string;
  taches: Tache[];
  mes_dossiers: LigneDeDossier[];
  chez_le_reviseur: number;
  renvoyes: number;
  reglages: { source: string; urgente_sous_jours: number; elevee_sous_jours: number };
};

export async function lireLePlanDeTravail(): Promise<PlanDeTravail> {
  return appeler<PlanDeTravail>("/pilotage/plan-de-travail", { authentifie: true });
}
