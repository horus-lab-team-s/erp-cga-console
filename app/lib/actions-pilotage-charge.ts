"use server";

/**
 * Valider une réaffectation proposée (pas 105).
 *
 * Le pilotage propose ; la réaffectation est un acte du contexte des accès
 * (`AFFECTER_DOSSIER`), qui retire le dossier au premier et le confie au second le même jour,
 * avec le motif de la direction. Trois personnes en sont prévenues ; l'adhérent ne l'est pas.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

export async function validerLaReaffectation(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = encodeURIComponent(String(donnees.get("dossier") ?? ""));
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) {
    return { echec: "Dites pourquoi (10 caractères au moins) : le chargé de clientèle le lira.", fait: null };
  }
  try {
    await appeler<unknown>(`/transverse/dossiers/${niu}/reaffectation`, {
      methode: "POST",
      authentifie: true,
      corps: { de: String(donnees.get("de") ?? ""), vers: String(donnees.get("vers") ?? ""), motif },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/pilotage/charge", "page");
  revalidatePath("/[locale]/pilotage", "page");
  return { echec: null, fait: "Dossier réaffecté. Les deux collaborateurs et le chargé de clientèle sont prévenus." };
}
