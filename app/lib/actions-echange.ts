"use server";

/**
 * Exporter les écritures, reprendre un fichier (pas 85).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'EXPORT PASSE EN OCTETS, JAMAIS EN TEXTE
 *
 * Le profil Sage attend du cp1252. L'action lit les octets (`telecharger`) et les rend
 * en base64 ; le navigateur les reconstitue tels quels. Décoder en texte puis réencoder
 * abîmerait chaque accent, et cela ne se verrait qu'après l'import chez le client.
 *
 * ⚠️ LA REPRISE : CONTRÔLER, PUIS APPLIQUER LE MÊME FICHIER
 *
 * Deux envois du même formulaire. Le premier (`appliquer` absent) ne peut rien écrire ;
 * le second n'est proposé par l'écran qu'après un contrôle recevable, et le backend
 * recontrôle de toute façon : un doublon ou un fichier vide sont refusés à l'application
 * comme au contrôle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatExport, EtatReprise, RapportDeReprise } from "./saisie-echange";

export async function exporterLesEcritures(_precedent: EtatExport, donnees: FormData): Promise<EtatExport> {
  const entreprise = String(donnees.get("entreprise") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const profil = String(donnees.get("profil") ?? "");
  const journal = String(donnees.get("journal") ?? "").trim();
  if (!/^\d{4}$/.test(exercice) || !profil) {
    return { echec: "Choisissez un exercice (quatre chiffres) et un format.", fichier: null };
  }
  const requete = new URLSearchParams({ exercice, profil, ...(journal ? { journal } : {}) });
  try {
    const f = await telecharger(`/comptabilite/dossiers/${encodeURIComponent(entreprise)}/export?${requete}`);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}

export async function reprendreUnFichier(_precedent: EtatReprise, donnees: FormData): Promise<EtatReprise> {
  const entreprise = String(donnees.get("entreprise") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const profil = String(donnees.get("profil") ?? "");
  const journal = String(donnees.get("journal") ?? "").trim();
  const appliquer = donnees.get("appliquer") === "oui";
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { echec: "Choisissez le fichier exporté par l'autre logiciel.", rapport: null };
  }
  if (!/^\d{4}$/.test(exercice) || !profil) {
    return { echec: "Choisissez un exercice (quatre chiffres) et un format.", rapport: null };
  }
  const envoi = new FormData();
  envoi.append("fichier", fichier, fichier.name);
  const requete = new URLSearchParams({
    exercice,
    profil,
    appliquer: appliquer ? "true" : "false",
    ...(journal ? { journal } : {}),
  });
  try {
    const rapport = await appeler<RapportDeReprise>(
      `/comptabilite/dossiers/${encodeURIComponent(entreprise)}/reprise?${requete}`,
      { methode: "POST", authentifie: true, formulaire: envoi },
    );
    if (rapport.applique) revalidatePath("/[locale]/comptabilite/saisie", "page");
    return { echec: null, rapport };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, rapport: null };
    throw erreur;
  }
}
