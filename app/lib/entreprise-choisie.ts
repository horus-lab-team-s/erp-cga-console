/**
 * L'entreprise que l'adhérent regarde, quand son compte en suit plusieurs (pas 116).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE DÉFAUT QUE CE MODULE CORRIGE
 *
 * Les six pages de l'espace adhérent prenaient `dossiers[0]` : un adhérent habilité sur deux
 * entreprises (« un même téléphone peut porter plusieurs entreprises », maquette vue A, note 4) ne
 * voyait que la première, sans aucun moyen d'atteindre la seconde, et sans rien qui le lui dise.
 *
 * LE CHOIX EST UN TÉMOIN, ET IL NE PROTÈGE RIEN
 *
 * Le NIU choisi est gardé dans un témoin (`cga_entreprise`), relu par chaque page et **confronté à
 * la liste des dossiers rendue par le backend** : un NIU écrit à la main dans le témoin, hors du
 * périmètre, est ignoré au profit du premier dossier. La protection reste côté serveur (chaque route
 * vérifie le dossier) ; le témoin ne fait que retenir une préférence d'affichage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { cookies } from "next/headers";

import { detient, type Acces } from "./acces";
import { lireDossiers, type Dossier } from "./portefeuille";

export const TEMOIN_ENTREPRISE = "cga_entreprise";

export async function monEntrepriseChoisie(acces: Acces): Promise<{ dossiers: Dossier[]; principal: string | undefined }> {
  const dossiers = detient(acces, "LIRE_DOSSIER") ? await lireDossiers() : [];
  const choisi = (await cookies()).get(TEMOIN_ENTREPRISE)?.value;
  const principal = dossiers.find((d) => d.niu === choisi)?.niu ?? dossiers[0]?.niu;
  return { dossiers, principal };
}
