"use server";

/**
 * Marquer ses notifications comme lues (pas 94).
 *
 * ⚠️ Le navigateur envoie le rang de la plus récente notification **affichée**, et non
 * « tout » : une notification arrivée entre l'affichage et le clic reste non lue, et la
 * personne la verra. Le backend borne en plus à la tête du journal, et n'avance jamais
 * en arrière.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

export async function marquerMesNotificationsLues(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const rang = Number(donnees.get("jusqu_au_rang"));
  if (!Number.isInteger(rang) || rang < 1) return { echec: "Aucune notification à marquer.", fait: null };
  try {
    await appeler<{ lu_jusqu_au_rang: number }>("/transverse/notifications/lecture", {
      methode: "POST",
      authentifie: true,
      corps: { jusqu_au_rang: rang },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  // Le compteur de la cloche vit dans le gabarit : rafraîchir la page seule le laisserait faux.
  revalidatePath("/[locale]", "layout");
  return { echec: null, fait: "Notifications marquées comme lues." };
}
