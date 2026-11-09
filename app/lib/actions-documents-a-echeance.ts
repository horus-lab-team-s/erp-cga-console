"use server";

/** Enregistrer un document à échéance (lot 4, 9 novembre 2026). Le serveur calcule et borne. */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

const champ = (donnees: FormData, cle: string) => String(donnees.get(cle) ?? "").trim();

export async function enregistrerUnDocument(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = champ(donnees, "niu");
  const code = champ(donnees, "code");
  const delivre = champ(donnees, "delivre_le");
  if (!code || !delivre) return { echec: "Choisissez le document et sa date de délivrance.", fait: null };
  try {
    await appeler(`/portefeuille/entreprises/${encodeURIComponent(niu)}/documents-a-echeance`, {
      methode: "POST",
      authentifie: true,
      corps: {
        code,
        delivre_le: delivre,
        ...(champ(donnees, "expire_le") ? { expire_le: champ(donnees, "expire_le") } : {}),
        ...(champ(donnees, "reference") ? { reference: champ(donnees, "reference") } : {}),
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/portefeuille/[niu]", "page");
  revalidatePath("/[locale]/mon-espace/entreprise", "page");
  return { echec: null, fait: "Document enregistré : son échéance est suivie, avec ses alertes." };
}
