/**
 * Les états des formulaires d'échange, importables par un composant client (pas 85).
 *
 * ⚠️ Séparés de `echange.ts`, qui importe `api.ts` donc `next/headers` : un composant
 * client qui y prendrait un type d'état embarquerait le serveur. Voir `saisie.ts`.
 */

export type AnomalieDeReprise = { ligne: number; motif: string; extrait?: string };

export type RapportDeReprise = {
  applique: boolean;
  lignes_lues: number;
  ecritures_lues: number;
  cles_enregistrees: string[];
  anomalies: AnomalieDeReprise[];
  recevable: boolean;
};

export type EtatReprise = { echec: string | null; rapport: RapportDeReprise | null };
export const ETAT_REPRISE_INITIAL: EtatReprise = { echec: null, rapport: null };

/** Le fichier exporté, en base64 : les octets passent intacts jusqu'au navigateur. */
export type EtatExport = { echec: string | null; fichier: { nom: string; typeMime: string; base64: string } | null };
export const ETAT_EXPORT_INITIAL: EtatExport = { echec: null, fichier: null };
