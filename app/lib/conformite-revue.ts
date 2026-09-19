/**
 * Le journal des dérogations et la qualité des règles, côté écran (pas 99) : lectures.
 *
 * ⚠️ L'écran ne calcule ni total, ni taux, ni lecture : le backend les rend, avec les seuils
 * du référentiel qui ont servi. Recalculer ici ferait une seconde règle, qui divergerait de
 * la première au prochain réglage.
 */

import { appeler } from "./api";
import type { EcartDeConstat } from "./api";

/** Pas 118 : une dérogation qui exige une pièce d'appui, n'en a pas, et dont le délai est passé. */
export type DerogationARegulariser = {
  identifiant: string;
  dossier: string;
  reference_document: string;
  code_regle: string;
  severite: string;
  propose_le: string;
  propose_par: string;
  jours: number;
};

export type JournalDesDerogations = {
  derogations: EcartDeConstat[];
  auteurs: Record<string, string>;
  total: number;
  effectives: number;
  enjeu_leve: string;
  a_regulariser: DerogationARegulariser[];
  delai_de_regularisation_jours: number;
};

export type LectureDeRegle = "PEU_CONTESTEE" | "A_RECALIBRER" | "TROP_BRUYANTE" | "NON_JUGEE";

export type StatistiqueDeRegle = {
  code: string;
  libelle: string;
  severite: string;
  constats: number;
  ecartes: number;
  enjeu_retenu: string;
  taux_d_ecartement: number | null;
  lecture: LectureDeRegle;
};

export type QualiteDesRegles = {
  du: string;
  au: string;
  pieces_controlees: number;
  constats: number;
  ecartes: number;
  taux_global: number | null;
  regles: StatistiqueDeRegle[];
  seuils: { a_recalibrer: number; trop_bruyante: number; constats_minimum: number };
};

export type FiltresDesDerogations = { regle?: string; auteur?: string; dossier?: string; statut?: string };

export function lireLeJournalDesDerogations(filtres: FiltresDesDerogations) {
  const requete = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v) as [string, string][]);
  return appeler<JournalDesDerogations>(`/conformite/derogations?${requete}`, { authentifie: true });
}

export function lireLaQualiteDesRegles(periode: { du?: string; au?: string }) {
  const requete = new URLSearchParams(Object.entries(periode).filter(([, v]) => v) as [string, string][]);
  return appeler<QualiteDesRegles>(`/conformite/regles/qualite?${requete}`, { authentifie: true });
}

export const LIBELLES_LECTURE: Record<LectureDeRegle, string> = {
  PEU_CONTESTEE: "Peu contestée",
  A_RECALIBRER: "À recalibrer",
  TROP_BRUYANTE: "Trop bruyante",
  NON_JUGEE: "Trop peu de constats",
};

// ── Écarter en masse (pas 103) ─────────────────────────────────────────────────

export type LigneDeConstat = {
  piece: string;
  dossier: string;
  date: string;
  fournisseur: string | null;
  fournisseur_niu: string | null;
  /** Vérification au fichier DGI : vrai (actif), faux (radié), null (indisponible). */
  verification_dgi: boolean | null;
  enjeu: string | null;
  message: string;
  ecart: string | null;
  statut_ecart: string | null;
  selectionnable: boolean;
  raison: string | null;
};

export type VueDEcartEnMasse = {
  code: string;
  libelle: string;
  severite: string;
  du: string;
  au: string;
  ecartable: boolean;
  second_regard: boolean;
  motif_minimum: number;
  source_de_la_politique: string;
  motifs_types: { code: string; libelle: string }[];
  constats: number;
  enjeu_cumule: string;
  adherents: number;
  taux_d_ecartement: number | null;
  lignes: LigneDeConstat[];
};

export function lireLesConstatsDeLaRegle(code: string, periode: { du?: string; au?: string }) {
  const requete = new URLSearchParams(Object.entries(periode).filter(([, v]) => v) as [string, string][]);
  return appeler<VueDEcartEnMasse>(`/conformite/regles/${encodeURIComponent(code)}/constats?${requete}`, {
    authentifie: true,
  });
}

// ── La file d'anomalies du réviseur (pas 117) ────────────────────────────────

export type LigneDAnomalie = {
  piece: string;
  dossier: string;
  denomination: string;
  date_piece: string;
  fournisseur: string | null;
  code_regle: string;
  libelle_regle: string;
  gravite: "BLOQUANT" | "MAJEUR" | "AVERTISSEMENT" | "INFORMATION";
  message: string;
  enjeu: string | null;
  anciennete: number;
  /** Au-delà du seuil du référentiel : le constat dort, et passe devant dans sa gravité. */
  dort: boolean;
  /** Qui a déposé la pièce : un collaborateur, ou l'entreprise pour un dépôt au portail. */
  depose_par: string | null;
  ecart_ouvert: boolean;
};

export type GroupeDeRegle = {
  code_regle: string;
  libelle_regle: string;
  gravite: LigneDAnomalie["gravite"];
  constats: number;
  enjeu_cumule: string;
  dossiers: number;
};

export type VueDeLaFile = {
  par_gravite: Record<string, number>;
  lignes: LigneDAnomalie[];
  groupes: GroupeDeRegle[];
  seuil_anciennete_jours: number;
  dossiers: { niu: string; denomination: string }[];
  deposants: string[];
};

export function lireLaFileDAnomalies(filtres: {
  gravite?: string;
  entreprise?: string;
  regle?: string;
  depose_par?: string;
  du?: string;
  au?: string;
}) {
  const p = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(filtres)) if (valeur) p.set(cle, valeur);
  return appeler<VueDeLaFile>(`/pilotage/file-d-anomalies?${p}`, { authentifie: true });
}
