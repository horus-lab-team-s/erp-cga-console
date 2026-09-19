"use server";

/**
 * Exporter le journal des dérogations, signaler une règle au fiscaliste (pas 99).
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatActe } from "./saisie";

export type EtatExportDerogations = {
  echec: string | null;
  fichier: { nom: string; typeMime: string; base64: string } | null;
};

/** Le journal en CSV, avec les filtres affichés : l'export dit ce que l'écran montre. */
export async function exporterLesDerogations(_precedent: EtatExportDerogations, donnees: FormData): Promise<EtatExportDerogations> {
  const requete = new URLSearchParams();
  for (const cle of ["regle", "auteur", "dossier", "statut"]) {
    const valeur = String(donnees.get(cle) ?? "").trim();
    if (valeur) requete.set(cle, valeur);
  }
  try {
    const f = await telecharger(`/conformite/derogations/export?${requete}`);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}

export async function signalerUneRegle(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const code = String(donnees.get("code") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Dites ce qui ne va pas (10 caractères au moins).", fait: null };
  try {
    await appeler<{ regle: string }>(`/conformite/regles/${encodeURIComponent(code)}/signalement`, {
      methode: "POST",
      authentifie: true,
      corps: { motif },
    });
    return { echec: null, fait: `${code} signalée : le fiscaliste est prévenu.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export type ConsequencesDesEcarts = {
  ecarts: number;
  effectifs: number;
  en_attente: number;
  enjeu_leve: string;
  dossiers: string[];
  pieces_comptabilisables: string[];
};

export type EtatEcartEnMasse = { echec: string | null; consequences: ConsequencesDesEcarts | null };

/**
 * Écarter en masse (pas 103). Tout ou rien : si le backend refuse une pièce, aucune n'est
 * écartée, et son message nomme chacune. Le motif détaillé n'est jamais prérempli ici.
 */
export async function ecarterEnMasse(_precedent: EtatEcartEnMasse, donnees: FormData): Promise<EtatEcartEnMasse> {
  const code = String(donnees.get("code") ?? "");
  const pieces = donnees.getAll("pieces").map(String);
  const motif = String(donnees.get("motif") ?? "").trim();
  const motifType = String(donnees.get("motif_type") ?? "") || null;
  const minimum = Number(donnees.get("motif_minimum") ?? 20);
  if (pieces.length === 0) return { echec: "Choisissez au moins un constat.", consequences: null };
  if (motif.length < minimum) {
    return { echec: `Le motif détaillé compte au moins ${minimum} caractères : il sera opposé à l'administration.`, consequences: null };
  }
  try {
    const resultat = await appeler<{ consequences: ConsequencesDesEcarts }>(
      `/conformite/regles/${encodeURIComponent(code)}/ecarts`,
      { methode: "POST", authentifie: true, corps: { pieces, motif, motif_type: motifType } },
    );
    revalidatePath("/[locale]/conformite/regles/[code]", "page");
    revalidatePath("/[locale]/conformite", "page");
    return { echec: null, consequences: resultat.consequences };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, consequences: null };
    throw erreur;
  }
}
