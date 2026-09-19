"use server";

/**
 * Clore un exercice depuis l'écran de la liasse : contrôler, puis appliquer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ DEUX TEMPS, ET LE PREMIER N'ÉCRIT RIEN
 *
 * Une clôture ferme un exercice, et le produit ne sait pas le rouvrir. La route
 * a donc un mode contrôle, qui est son défaut : le même rapport, sans rien écrire.
 * L'écran s'y plie. Le premier envoi contrôle, toujours ; le second applique, et
 * seulement si le rapport du premier disait `possible` et que le réviseur a coché
 * la confirmation.
 *
 * ⚠️ LE SECOND TEMPS NE FAIT PAS CONFIANCE AU PREMIER
 *
 * Entre le contrôle et l'application, un collègue peut saisir un brouillon. Le
 * backend rejoue tous les obstacles au moment d'appliquer, et rend un rapport non
 * appliqué s'il en trouve : l'écran l'affiche comme tel, il ne suppose pas que le
 * contrôle d'il y a une minute vaut encore.
 *
 * ⚠️ UNE CLÔTURE N'EST PAS UN DÉPÔT DE DSF
 *
 * Le message de réussite le dit : les comptes sont arrêtés et reportés, la
 * déclaration reste à déposer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { RapportDeCloture } from "./cloture";

export type EtatCloture = {
  echec: string | null;
  rapport: RapportDeCloture | null;
  /** Le motif du contrôle, renvoyé pour l'application : il ne se retape pas. */
  motif: string;
};

const CHEMIN_CLOTURE = "/[locale]/cloture";

export async function soumettreLaCloture(
  precedent: EtatCloture,
  donnees: FormData,
): Promise<EtatCloture> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const exercice = String(donnees.get("exercice") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  const appliquer = donnees.get("appliquer") === "oui";

  if (!dossier || !exercice) {
    return { ...precedent, echec: "Dossier ou exercice non désigné." };
  }
  if (motif.length < 30) {
    return {
      echec:
        "Le motif compte au moins trente caractères : il part au journal d'audit, et un " +
        "vérificateur demandera pourquoi cet exercice a été arrêté ce jour-là.",
      rapport: null,
      motif,
    };
  }
  if (appliquer && donnees.get("confirmation") !== "oui") {
    return {
      ...precedent,
      echec: "Cochez la confirmation : un exercice clos ne se rouvre pas.",
    };
  }

  try {
    const rapport = await appeler<RapportDeCloture>(
      `/cloture/dossiers/${encodeURIComponent(dossier)}/exercices/${encodeURIComponent(exercice)}/cloture?appliquer=${appliquer}`,
      { methode: "POST", authentifie: true, corps: { motif } },
    );
    if (rapport.applique) revalidatePath(CHEMIN_CLOTURE, "page");
    return { echec: null, rapport, motif };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, rapport: null, motif };
    throw erreur;
  }
}
