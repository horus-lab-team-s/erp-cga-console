"use server";

/**
 * Arrêter les charges sociales d'un mois (18 octobre 2026, point 8). Décision du gérant :
 * « proposition, et modification possible ». Un écart à la proposition se justifie.
 */

import { revalidatePath } from "next/cache";

import { RUBRIQUES } from "./arrete-des-charges-etats";
import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

export async function arreterLesCharges(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const entreprise = String(donnees.get("entreprise") ?? "");
  const annee = String(donnees.get("annee") ?? "");
  const mois = String(donnees.get("mois") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  const montants: Record<string, string> = {};
  for (const { code } of RUBRIQUES) {
    const brut = String(donnees.get(code) ?? "").replace(/\s/g, "");
    if (!/^\d+$/.test(brut)) return { echec: `Montant ${code} illisible : des chiffres seulement.`, fait: null };
    montants[code] = brut;
  }
  try {
    await appeler(`/social/dossiers/${encodeURIComponent(entreprise)}/declaration/${annee}/${mois}/arrete`, {
      methode: "PUT",
      authentifie: true,
      corps: { montants, ...(motif ? { motif } : {}) },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/social", "page");
  return { echec: null, fait: "Charges arrêtées : ce sont ces montants qui seront appelés et déclarés." };
}
