/**
 * Accès au contexte J · Pilotage CGA.
 *
 * ⚠️ Rien n'est stocké : le score découle de l'état des dossiers au jour de la
 * lecture. Le figer produirait un tableau de bord qui vieillit sans le dire, et
 * la direction agirait sur un risque déjà levé.
 */

import { appeler } from "@/app/lib/api";

export type NiveauRisque = "FAIBLE" | "MODERE" | "ELEVE";

export type MesureComposante = {
  composante: string;
  libelle: string;
  occurrences: number;
  poids: string;
  /** Les références des pièces, obligations ou demandes concernées. */
  elements: string[];
  action: string;
  poids_non_valide: boolean;
};

export type LigneRisque = {
  entreprise: string;
  denomination: string;
  total: string;
  niveau: NiveauRisque;
  mesures: MesureComposante[];
  poids_non_arretes: boolean;
};

export type ChargeCollaborateur = {
  compte: string;
  nom_complet: string;
  dossiers: number;
  risque_porte: string;
  dossiers_a_risque_eleve: number;
};

export type TableauDeBord = {
  a_la_date: string;
  dossiers: number;
  a_risque_eleve: number;
  a_risque_modere: number;
  poids_non_arretes: boolean;
  risques: LigneRisque[];
  charges: ChargeCollaborateur[];
};

export async function lireTableauDeBord(exercice: string): Promise<TableauDeBord> {
  return appeler<TableauDeBord>(
    `/pilotage/tableau-de-bord?exercice=${encodeURIComponent(exercice)}`,
    { authentifie: true },
  );
}

/**
 * Le libellé de chaque niveau.
 *
 * « Sous contrôle » plutôt que « faible » : ce qu'un directeur veut lire, c'est
 * l'état du dossier, pas la valeur d'un compteur. Un dossier « faible » se lit
 * comme un jugement sur le dossier ; « sous contrôle » se lit comme un constat.
 */
export const LIBELLES_NIVEAU: Record<NiveauRisque, string> = {
  FAIBLE: "Sous contrôle",
  MODERE: "À surveiller",
  ELEVE: "À traiter",
};

/**
 * La couleur de chaque niveau.
 *
 * ⚠️ La couleur ne porte jamais seule l'information — § 9 du dossier de design.
 * Chaque pastille affiche aussi son libellé et son score.
 */
export const TONS_NIVEAU: Record<NiveauRisque, { fond: string; texte: string }> = {
  FAIBLE: { fond: "var(--success-100)", texte: "var(--success)" },
  MODERE: { fond: "var(--warning-100)", texte: "var(--warning)" },
  ELEVE: { fond: "var(--danger-100)", texte: "var(--danger)" },
};

// ── La vue risque d'un dossier et les décisions de la direction (pas 100) ──────

/** Une mesure du catalogue du cabinet (`Docs/referentiel/pilotage/mesures.yaml`). */
export type MesureDeDirection = {
  code: string;
  libelle: string;
  description: string;
  niveaux: NiveauRisque[];
  echeance_requise: boolean;
};

/** Une décision prise, avec l'instantané du score qui l'a fondée. */
export type DecisionDeDirection = {
  identifiant: string;
  dossier: string;
  mesure: string;
  /** Le libellé du jour de la décision, même si le catalogue l'a renommée depuis. */
  libelle: string;
  motif: string;
  echeance: string | null;
  prise_par: string;
  prise_par_nom: string;
  prise_le: string;
  score: { a_la_date: string; total: string; niveau: NiveauRisque; occurrences: Record<string, number> };
  statut: "EN_COURS" | "CLOSE";
  close_par: string | null;
  close_par_nom: string | null;
  close_le: string | null;
  motif_de_cloture: string | null;
};

export type DecisionLue = { decision: DecisionDeDirection; echue: boolean };

export type VueRisque = {
  a_la_date: string;
  exercice: string;
  entreprise: string;
  denomination: string;
  total: string;
  niveau: NiveauRisque;
  seuil_modere: string;
  seuil_eleve: string;
  poids_non_arretes: boolean;
  /** Les quatre composantes, y compris celles à zéro, de la plus lourde à la moins lourde. */
  composantes: MesureComposante[];
  mesures_proposees: MesureDeDirection[];
  source_du_catalogue: string;
  motif_minimum: number;
  /** De la plus récente à la plus ancienne. */
  decisions: DecisionLue[];
};

export async function lireVueRisque(niu: string, exercice: string): Promise<VueRisque> {
  return appeler<VueRisque>(
    `/pilotage/dossiers/${encodeURIComponent(niu)}/risque?exercice=${encodeURIComponent(exercice)}`,
    { authentifie: true },
  );
}

/** Pour la fiche adhérent : les décisions, sans la vue risque. Réservé au cabinet. */
export async function lireDecisionsDuDossier(niu: string): Promise<DecisionLue[]> {
  return appeler<DecisionLue[]>(`/pilotage/dossiers/${encodeURIComponent(niu)}/decisions`, {
    authentifie: true,
  });
}

// ── Charge et production (pas 105) ────────────────────────────────────────────

export type LigneDeCharge = {
  compte: string;
  nom: string;
  role: string;
  habilitation: string;
  capacite: number | null;
  points: number;
  /** En pour cent de la capacité du rôle ; `null` si le rôle n'en a pas au référentiel. */
  charge: number | null;
  sature: boolean;
  dossiers: number;
  pieces_en_attente: number;
  echeances_du_mois: number;
  retards: number;
  pieces_traitees_du_mois: number;
  ecritures_du_mois: number;
  reprises_du_mois: number;
};

export type PropositionDeReaffectation = {
  dossier: string;
  denomination: string;
  points: number;
  de_compte: string;
  de_nom: string;
  de_habilitation: string;
  vers_compte: string;
  vers_nom: string;
  vers_habilitation: string;
  charge_de_avant: number;
  charge_de_apres: number;
  charge_vers_avant: number;
  charge_vers_apres: number;
  raison: string;
};

export type ChargeEtProduction = {
  a_la_date: string;
  mois_du: string;
  mois_au: string;
  dossiers: number;
  echeances_du_mois: number;
  collaborateurs: LigneDeCharge[];
  propositions: PropositionDeReaffectation[];
  reglages: { seuil_de_saturation: number; seuil_cible: number; source: string };
};

export async function lireLaChargeEtLaProduction(): Promise<ChargeEtProduction> {
  return appeler<ChargeEtProduction>("/pilotage/charge-et-production", { authentifie: true });
}

// ── Rapport mensuel (pas 106) ──────────────────────────────────────────────────

export type ResumeDeRapport = {
  identifiant: string;
  mois: string;
  version: number;
  a_la_date: string;
  genere_le: string;
  genere_par_nom: string;
  empreinte: string;
  integre: boolean;
};

/** Les sections sont les réponses figées des écrans ; leurs types sont ceux des écrans. */
export type RapportMensuel = {
  identifiant: string;
  mois: string;
  version: number;
  du: string;
  au: string;
  a_la_date: string;
  agrement: string;
  engagement: string;
  genere_le: string;
  genere_par: string;
  genere_par_nom: string;
  sections: {
    RISQUE?: TableauDeBord;
    CHARGE?: ChargeEtProduction;
    DEROGATIONS?: {
      derogations: { identifiant: string; dossier: string; reference_document: string; code_regle: string; severite: string; enjeu: string | null; statut: string; motif: string; propose_par: string; propose_le: string }[];
      auteurs: Record<string, string>;
      total: number;
      effectives: number;
      enjeu_leve: string;
    };
    QUALITE_DES_REGLES?: {
      pieces_controlees: number;
      constats: number;
      ecartes: number;
      taux_global: number | null;
      regles: { code: string; libelle: string; constats: number; ecartes: number; lecture: string }[];
    };
    DECISIONS?: { decisions: DecisionDeDirection[] };
  };
  empreinte: string;
  integre: boolean;
};

export async function lireLesRapportsMensuels(): Promise<ResumeDeRapport[]> {
  return appeler<ResumeDeRapport[]>("/pilotage/rapports-mensuels", { authentifie: true });
}

export async function lireLeRapportMensuel(identifiant: string): Promise<RapportMensuel> {
  return appeler<RapportMensuel>(`/pilotage/rapports-mensuels/${encodeURIComponent(identifiant)}`, {
    authentifie: true,
  });
}
