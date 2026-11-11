"use server";

/** Verser une pièce de la DSF depuis l'espace adhérent (18 octobre 2026, point 24). */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

export async function verserMaPieceDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const numero = String(donnees.get("numero") ?? "");
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { echec: "Choisissez le fichier de la pièce.", fait: null };
  if (fichier.size > 15 * 1024 * 1024) return { echec: "15 Mo au plus par pièce.", fait: null };
  const envoi = new FormData();
  envoi.set("fichier", fichier, fichier.name);
  try {
    await appeler(
      `/cloture/dossiers/${encodeURIComponent(dossier)}/ma-dsf/${encodeURIComponent(exercice)}/pieces/${encodeURIComponent(numero)}`,
      { methode: "POST", authentifie: true, formulaire: envoi },
    );
    revalidatePath("/[locale]/mon-espace/dsf", "page");
    return { echec: null, fait: `${fichier.name} est bien arrivée au cabinet.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
