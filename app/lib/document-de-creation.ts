/**
 * L'état de lecture d'un document de création, partagé par l'écran et les actions.
 *
 * ⚠️ UN MODULE À PART, SANS AUCUN IMPORT, ET C'EST TOUTE SA RAISON D'ÊTRE.
 *
 * Il vivait dans `creations.ts`, qui importe `api.ts`, qui importe
 * `next/headers`. Le composant d'aperçu, côté navigateur, en tirait la
 * constante initiale : la construction de production échouait (« You're
 * importing a module that depends on next/headers into a React Client
 * Component »), alors que `tsc` et `eslint` ne voyaient rien. Constaté le
 * 14 octobre 2026 à la construction de l'image de démonstration.
 */

/** Ce que rend la lecture d'un document de création : le fichier, en base64, ou le motif du refus. */
export type EtatDocumentDeCreation = {
  echec: string | null;
  fichier: { nom: string; typeMime: string; base64: string } | null;
};

export const DOCUMENT_DE_CREATION_INITIAL: EtatDocumentDeCreation = { echec: null, fichier: null };
