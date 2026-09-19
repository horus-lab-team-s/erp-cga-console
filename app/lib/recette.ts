/**
 * La boîte aux lettres de recette.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QU'ELLE REND EST UN SECRET
 *
 * Les liens d'activation et de réinitialisation, **en clair**. Quiconque les lit
 * prend la main sur les comptes correspondants, sans mot de passe et sans autre
 * trace qu'une connexion parfaitement normale.
 *
 * Elle n'existe que sous `CGA_MODE_DEMONSTRATION`, un drapeau que la production
 * refuse au démarrage. Hors de ce mode, la route rend `404` — un point d'entrée
 * absent se distingue mal d'un point d'entrée qui refuse, et c'est voulu.
 *
 * POURQUOI ELLE EXISTE
 *
 * Sans elle, le parcours de souscription est invérifiable de bout en bout : le
 * paiement passe, le compte se crée, le lien part dans un tableau en mémoire, et
 * personne ne peut aller au bout. C'est le trou par lequel un défaut
 * d'activation arriverait intact en production — et c'est précisément ce qui
 * s'est produit : la page d'activation manquait, et rien ne l'avait montré.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ErreurApi, appeler } from "./api";

export type CourrielRetenu = {
  code: string;
  destinataire: string;
  contexte: Record<string, string | null>;
};

/** Ce que chaque code de gabarit veut dire, pour un lecteur pressé. */
export const LIBELLES_COURRIEL: Record<string, string> = {
  "compte.activation": "Activation après souscription",
  "compte.invitation": "Invitation d’un collaborateur",
  "compte.reinitialisation": "Réinitialisation du mot de passe",
  "compte.mot_de_passe_change": "Confirmation de changement",
  "compte.suspendu": "Suspension d’accès",
};

/**
 * Les messages retenus, du plus récent au plus ancien.
 *
 * Rend `null` — et non un tableau vide — quand la route n'existe pas. La
 * distinction commande l'écran : « le mode démonstration n'est pas actif » et
 * « aucun message n'est encore parti » appellent deux explications différentes,
 * et confondre les deux ferait chercher un défaut là où il n'y en a pas.
 */
export async function lireCourriels(): Promise<CourrielRetenu[] | null> {
  try {
    return await appeler<CourrielRetenu[]>("/transverse/courriels");
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut === 404) return null;
    throw erreur;
  }
}
