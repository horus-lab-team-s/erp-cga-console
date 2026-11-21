"use server";

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatDocumentDeCreation } from "./document-de-creation";

export type EtatDepotCreation = { echec: string | null; fait: string | null };

/**
 * Elle dépose une pièce depuis son compte.
 *
 * ⚠️ DEUX APPELS, ET L'ORDRE COMPTE : le fichier d'abord, qui rend son
 * empreinte ; puis le rattachement de cette empreinte à la pièce attendue. On ne
 * peut pas citer une empreinte qui n'existe pas encore. C'est le motif du lien
 * signé et des pièces du cabinet.
 *
 * ⚠️ Le serveur contrôle la portée aux deux appels : un dossier qui n'est pas le
 * sien rend 404. Le contrôler ici en plus ferait croire qu'il l'est ici.
 */
export async function deposerSurMaCreation(
  _precedent: EtatDepotCreation,
  donnees: FormData,
): Promise<EtatDepotCreation> {
  const reference = String(donnees.get("reference") ?? "").trim();
  const code = String(donnees.get("code") ?? "").trim();
  const fichier = donnees.get("fichier");
  if (!reference || !code) return { echec: "Pièce non désignée.", fait: null };
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { echec: "Choisissez un document ou prenez une photo.", fait: null };
  }

  const envoi = new FormData();
  envoi.append("fichier", fichier);
  try {
    const depose = await appeler<{ empreinte: string }>(
      `/collecte/fichiers-de-creation?${new URLSearchParams({ reference })}`,
      { methode: "POST", authentifie: true, formulaire: envoi },
    );
    await appeler(`/creations/mes-creations/${encodeURIComponent(reference)}/pieces`, {
      methode: "POST",
      authentifie: true,
      corps: { code, empreinte: depose.empreinte },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  // ⚠️ Sans ceci, le compte « il nous manque N documents » ne descend pas, et
  // elle renvoie deux fois la même pièce par précaution.
  revalidatePath("/[locale]/ma-creation", "page");
  return { echec: null, fait: "Document reçu. Le cabinet le verra dans votre dossier." };
}

/** Relire un document de son dossier : ce qu'elle a envoyé, ou ce que le cabinet a versé pour elle. */
export async function lireMonDocument(
  _precedent: EtatDocumentDeCreation,
  donnees: FormData,
): Promise<EtatDocumentDeCreation> {
  const reference = String(donnees.get("reference") ?? "");
  const code = String(donnees.get("code") ?? "");
  try {
    const f = await telecharger(
      `/creations/mes-creations/${encodeURIComponent(reference)}/pieces/${encodeURIComponent(code)}/document`,
    );
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}
