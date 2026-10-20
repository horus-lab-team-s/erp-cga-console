/**
 * Les soldes à regarder et la relecture de la balance par l'agent (18 octobre 2026, point 15).
 * Module sans dépendance serveur : les composants client l'importent.
 */

export type SoldeARegarder = { compte: string; solde: string; constat: string; suggestion: string };

export type RemarqueSurLaBalance = { compte: string | null; constat: string; suggestion: string };

export type EtatDeLaRelectureDeBalance = {
  echec: string | null;
  message: string | null;
  remarques: RemarqueSurLaBalance[];
};
