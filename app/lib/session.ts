/**
 * La session courante, lue côté serveur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE MODULE NE S'IMPORTE QUE DEPUIS LE SERVEUR
 *
 * Il lit le témoin de session, donc `next/headers`, et ne peut pas figurer dans
 * un paquet envoyé au navigateur. Les types et les fonctions pures — `Acces`,
 * `Permission`, `initiales`, `LIBELLES_ROLE` — vivent dans `acces.ts`, qui est
 * importable de partout. Un composant client passe par là.
 *
 * LE FRONT NE DÉCIDE JAMAIS DES DROITS, IL LES LIT
 *
 * `GET /transverse/moi` rend les rôles, les permissions **et la liste des
 * dossiers accessibles**, résolus à la date du jour par le backend. Le front s'en
 * sert pour construire le menu et masquer ce qui n'est pas permis.
 *
 * Il ne réimplémente aucune règle. Écrire ici « un administrateur peut tout »
 * créerait une seconde source de vérité, et le jour où la table des permissions
 * changerait côté serveur, l'écran continuerait d'afficher un bouton que l'API
 * refuserait.
 *
 * MASQUER N'EST PAS PROTÉGER
 *
 * Ce module sert à **ne pas proposer** ce qui sera refusé. Ce qui **protège** est
 * le contrôle côté serveur, dans le cas d'usage, à chaque appel. Le menu est une
 * commodité ; la sécurité est ailleurs, et elle n'en dépend pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import type { Acces } from "./acces";
import { appeler, ErreurApi } from "./api";

export type { Acces, Permission, Role } from "./acces";
export { detient, initiales, LIBELLES_ROLE, voit } from "./acces";

/**
 * L'accès courant, ou `null`.
 *
 * Ne lève jamais sur une session absente : c'est un cas ordinaire, pas une
 * panne. C'est à l'appelant de décider ce qu'il en fait.
 */
export async function acces(): Promise<Acces | null> {
  try {
    return await appeler<Acces>("/transverse/moi", { authentifie: true });
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut === 401) return null;
    // Une panne du backend n'est pas un défaut d'authentification. La laisser
    // remonter fait apparaître la vraie cause plutôt qu'un renvoi vers la page
    // de connexion, qui laisserait croire à une session expirée.
    throw erreur;
  }
}

/**
 * L'accès courant, ou renvoi vers la page de connexion.
 *
 * Appelée dans le gabarit `(collaborateur)`, donc **avant tout rendu** : aucun
 * écran de l'espace de travail ne s'affiche sans session valide.
 */
export async function exigerAcces(): Promise<Acces> {
  const courant = await acces();
  if (courant === null) {
    const langue = await getLocale();
    redirect({ href: "/connexion", locale: langue });
  }
  return courant as Acces;
}
