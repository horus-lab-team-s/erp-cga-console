/**
 * Ce que la saisie d'écriture partage entre le serveur et le navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE PLUTÔT QUE DE VIVRE DANS `comptabilite.ts`
 *
 * Parce que `comptabilite.ts` importe `api.ts`, qui importe `next/headers`,
 * lequel n'existe **que** sur le serveur. Un composant client qui importe une
 * seule constante de `comptabilite.ts` embarque tout le module dans son paquet,
 * et la compilation échoue sur `next/headers`.
 *
 * ⚠️ Le message d'erreur ne nomme pas la constante fautive : il déroule la chaîne
 * d'imports et pointe `api.ts`, c'est-à-dire l'endroit où il n'y a rien à
 * corriger. J'y suis tombé en branchant ce formulaire.
 *
 * Les **types** ne posent pas ce problème : ils sont effacés à la compilation.
 * Seules les valeurs traversent. D'où ce module sans aucun import de valeur.
 *
 * ET POURQUOI PAS DANS LE MODULE « USE SERVER »
 *
 * Next exige que tout export d'un module « use server » soit une fonction
 * asynchrone : y déclarer une constante casse la compilation autrement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Ecriture, PropositionDEcriture } from "./comptabilite";

/**
 * Le nombre de lignes offertes par le formulaire de saisie.
 *
 * Huit, et non un bouton « ajouter une ligne » : le bouton suppose du
 * JavaScript, et le formulaire doit fonctionner sans. Huit lignes couvrent
 * l'écrasante majorité des écritures d'un cabinet, un achat avec TVA en comptant
 * trois. Au-delà, on saisit en deux écritures, ce que fait de toute façon un
 * comptable devant un journal papier.
 */
export const LIGNES_OFFERTES = 8;

export type EtatSaisie = {
  echec: string | null;
  /** L'écriture enregistrée, pour la montrer en retour plutôt qu'un simple « fait ». */
  enregistree: Ecriture | null;
};

export const ETAT_SAISIE_INITIAL: EtatSaisie = { echec: null, enregistree: null };

export type EtatActe = { echec: string | null; fait: string | null };

export const ETAT_ACTE_INITIAL: EtatActe = { echec: null, fait: null };

/** L'état du parcours « comptabiliser une pièce » (pas 73). */
export type EtatProposition = {
  echec: string | null;
  proposition: PropositionDEcriture | null;
  /** Le dossier où la pièce est proposée : celui de son destinataire. */
  dossier: string | null;
  /** Rempli une fois le brouillon enregistré. */
  enregistree: Ecriture | null;
};

export const ETAT_PROPOSITION_INITIAL: EtatProposition = {
  echec: null,
  proposition: null,
  dossier: null,
  enregistree: null,
};
