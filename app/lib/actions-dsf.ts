"use server";

/**
 * Préparer et valider la DSF (14 octobre 2026). Le constat du dépôt, qui
 * verse l'accusé de la DGI au dossier, est dans `actions-collecte.ts` : il passe par le
 * même dépôt de pièce que toute autre, et cette fonction-là ne s'exporte pas.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatActe } from "./saisie";
import type { EtatExport } from "./saisie-echange";

const chemin = (dossier: string, exercice: string) =>
  `/cloture/dossiers/${encodeURIComponent(dossier)}/dsf/${encodeURIComponent(exercice)}`;

export async function preparerLaDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  try {
    const v = await appeler<{ version: number }>(`${chemin(dossier, exercice)}/preparation`, {
      methode: "POST",
      authentifie: true,
    });
    revalidatePath("/[locale]/cloture", "page");
    return { echec: null, fait: `Version ${v.version} préparée : la liasse est figée. Le réviseur la relit et la valide.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function validerLaDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const version = String(donnees.get("version") ?? "");
  try {
    await appeler(`${chemin(dossier, exercice)}/${encodeURIComponent(version)}/validation`, {
      methode: "POST",
      authentifie: true,
    });
    revalidatePath("/[locale]/cloture", "page");
    return { echec: null, fait: `Version ${version} validée : elle peut partir sur le portail de la DGI.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Le modèle Excel officiel de la DGI, bilan et compte de résultat remplis (15 octobre 2026).
 *
 * ⚠️ Le nom du fichier est celui du modèle : le portail refuse un fichier renommé.
 */
export async function telechargerLeFormatDgi(_precedent: EtatExport, donnees: FormData): Promise<EtatExport> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  try {
    const f = await telecharger(`${chemin(dossier, exercice)}/format-dgi/fichier`);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}
