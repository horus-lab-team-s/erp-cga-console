/**
 * La clôture mensuelle d'un dossier (pas 107). Maquette « Parcours comptable », vue G.
 *
 * Une lecture : les points de contrôle du mois, calculés sur les faits, le mois en chiffres,
 * le verrou et les réviseurs. Le geste, « Transmettre au réviseur », est celui de la revue
 * (`actions-revue.ts`) : le backend le refuse tant qu'un point bloque.
 */

import { appeler } from "@/app/lib/api";
import type { StatutRevue } from "@/app/lib/revue";

export type CodePoint =
  | "PIECES_A_COMPTABILISER"
  | "BROUILLONS"
  | "RAPPROCHEMENT"
  | "TRESORERIE"
  | "EQUILIBRE"
  | "NUMEROTATION"
  | "PIECES_ATTENDUES"
  | "ECARTS_EN_SUSPENS";

export type PointDeCloture = {
  code: CodePoint;
  titre: string;
  detail: string;
  traite: boolean;
  bloquant: boolean;
  references: string[];
};

export type PeriodeVerrouillee = {
  du: string;
  au: string;
  revue: string;
  statut: StatutRevue;
  depuis: string;
  par: string;
};

export type VueDeCloture = {
  dossier: string;
  denomination: string;
  mois: string;
  du: string;
  au: string;
  exercice: string;
  mois_termine: boolean;
  points: PointDeCloture[];
  traites: number;
  bloquants_restants: number;
  chiffres: { pieces_recues: number; ecritures_validees: number; achats_du_mois: string; tva_rejetee: string };
  revue: { identifiant: string; statut: StatutRevue; du: string; au: string } | null;
  verrou: PeriodeVerrouillee | null;
  reviseurs: string[];
  transmissible: boolean;
  source_des_reglages: string;
};

export async function lireLaCloture(niu: string, mois: string): Promise<VueDeCloture> {
  return appeler<VueDeCloture>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/clotures/${encodeURIComponent(mois)}`,
    { authentifie: true },
  );
}
