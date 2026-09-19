/**
 * Le mandat, côté écran : sa forme et ses libellés.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE FICHIER NE FAIT AUCUN APPEL, ET C'EST TOUTE SA RAISON D'ÊTRE
 *
 * Les libellés sont employés par un composant interactif, donc envoyé au navigateur.
 * Les laisser dans `administration.ts` y entraînait `api.ts`, qui lit le témoin de
 * session côté serveur : la construction a échoué en disant qu'un module serveur se
 * retrouvait dans le paquet du client.
 *
 * La lecture des mandats, elle, reste dans `administration.ts` avec les autres appels.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Role } from "./acces";

/** Un mandat accordé par ce locataire à un autre. */
export type MandatAccorde = {
  identifiant: string;
  /** Le locataire dont les comptes peuvent agir ici. */
  mandataire: string;
  roles: Role[];
  /** `null` = tous les comptes du mandataire. Ne se confond pas avec une liste vide. */
  comptes: string[] | null;
  debut: string;
  /** Borne exclue : le mandat ne vaut plus ce jour-là. */
  fin: string | null;
  motif: "CONSENTEMENT" | "CONTRAT_DE_SUIVI" | "ASSISTANCE";
  accorde_par: string;
  /** Distincte de `fin` : un mandat retiré n'est pas un mandat arrivé à échéance. */
  revoque_le: string | null;
  revoque_par: string | null;
  precision: string | null;
  /** Calculé par l'API au jour de l'appel. La seule question que l'écran pose vraiment. */
  en_vigueur: boolean;
};

export const LIBELLES_MOTIF_MANDAT: Record<MandatAccorde["motif"], string> = {
  CONSENTEMENT: "Consentement",
  CONTRAT_DE_SUIVI: "Contrat de suivi",
  ASSISTANCE: "Assistance ponctuelle",
};

export const EXPLICATIONS_MOTIF_MANDAT: Record<MandatAccorde["motif"], string> = {
  CONSENTEMENT: "Accordé librement. Se retire quand on veut.",
  CONTRAT_DE_SUIVI: "Né du contrat. Se voit sans se retirer tant que le contrat court.",
  ASSISTANCE: "Intervention ponctuelle, bornée dans le temps. Le dépannage se trace et il finit.",
};
