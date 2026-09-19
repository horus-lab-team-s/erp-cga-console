"use server";

/** Générer et archiver le rapport mensuel d'un mois (pas 106). */

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { appeler, ErreurApi } from "./api";
import type { RapportMensuel } from "./pilotage";
import type { EtatActe } from "./saisie";

export async function genererLeRapport(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const mois = String(donnees.get("mois") ?? "");
  if (!/^\d{4}-\d{2}$/.test(mois)) return { echec: "Choisissez le mois du rapport.", fait: null };
  let identifiant: string;
  try {
    const rapport = await appeler<RapportMensuel>("/pilotage/rapports-mensuels", {
      methode: "POST",
      authentifie: true,
      corps: { mois },
    });
    identifiant = rapport.identifiant;
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/pilotage/rapports", "page");
  redirect({ href: `/pilotage/rapports/${identifiant}`, locale: await getLocale() });
  return { echec: null, fait: null };
}
