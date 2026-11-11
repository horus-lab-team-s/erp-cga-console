/**
 * La lecture automatique au dépôt (18 octobre 2026, point 13).
 * ⚠️ Aucun import : les composants navigateur en tirent leurs types.
 */

export type EtatDeLaLecture = {
  actif: boolean;
  agent_disponible: boolean;
  reglage: { actif: boolean; motif: string; regle_par: string; regle_le: string } | null;
};

export type AccordDuDossier = { proposee: boolean; accorde: boolean; le: string | null };

export type LecturePreparee = {
  piece: string;
  lue_le: string;
  moteur: string;
  incident: string | null;
  valeurs: { champ: string; valeur: unknown; confiance: string; a_relire: boolean }[];
  points_a_verifier: string[];
};
