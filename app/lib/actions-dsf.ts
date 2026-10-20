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
import type { EtatDeLaRelecture, RemarqueDeLAgent } from "./dsf-etats";

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

// ── Les pièces à joindre à la DSF (15 octobre 2026) ──────────────────────────────

/** Ce que la plateforme produit elle-même : la route de son Excel. */
const PRODUITES: Record<string, string> = {
  "balance-clients": "balances-auxiliaires/clients/excel",
  "balance-fournisseurs": "balances-auxiliaires/fournisseurs/excel",
  "dgi-fournisseurs": "declarations-par-tiers/fournisseurs/excel",
  "dgi-tiers": "declarations-par-tiers/tiers/excel",
  // 17 octobre 2026 : l'exercice est dans le chemin, et non en paramètre.
  "tableau-amortissements": "amortissements/{exercice}/excel",
};

async function agirSurUnePiece(acte: () => Promise<unknown>, fait: string): Promise<EtatActe> {
  try {
    await acte();
    revalidatePath("/[locale]/cloture", "page");
    return { echec: null, fait };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function verserUnePieceDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const numero = String(donnees.get("numero") ?? "");
  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { echec: "Choisissez le fichier de la pièce.", fait: null };
  if (fichier.size > 15 * 1024 * 1024) return { echec: "15 Mo au plus par pièce, comme sur le portail.", fait: null };
  const envoi = new FormData();
  envoi.set("fichier", fichier, fichier.name);
  return agirSurUnePiece(
    () =>
      appeler(`${chemin(dossier, exercice)}/pieces-jointes/${encodeURIComponent(numero)}/fichier`, {
        methode: "POST",
        authentifie: true,
        formulaire: envoi,
      }),
    `${fichier.name} versée.`,
  );
}

export async function declarerUnePieceSansObjet(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const numero = String(donnees.get("numero") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 15) return { echec: "Le motif compte au moins quinze caractères : il part au journal.", fait: null };
  return agirSurUnePiece(
    () =>
      appeler(`${chemin(dossier, exercice)}/pieces-jointes/${encodeURIComponent(numero)}/sans-objet`, {
        methode: "POST",
        authentifie: true,
        corps: { motif },
      }),
    "Pièce déclarée sans objet.",
  );
}

export async function retirerUnePieceDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const numero = String(donnees.get("numero") ?? "");
  return agirSurUnePiece(
    () =>
      appeler(`${chemin(dossier, exercice)}/pieces-jointes/${encodeURIComponent(numero)}/retrait`, {
        methode: "POST",
        authentifie: true,
      }),
    "Pièce remise à fournir.",
  );
}

/** Télécharger une pièce : celle que la plateforme produit, ou celle qui a été versée. */
export async function telechargerUnePieceDsf(_precedent: EtatExport, donnees: FormData): Promise<EtatExport> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const numero = String(donnees.get("numero") ?? "");
  const produite = PRODUITES[String(donnees.get("produite") ?? "")];
  const route = produite
    ? produite.includes("{exercice}")
      ? `/comptabilite/dossiers/${encodeURIComponent(dossier)}/${produite.replace("{exercice}", encodeURIComponent(exercice))}`
      : `/comptabilite/dossiers/${encodeURIComponent(dossier)}/${produite}?${new URLSearchParams({ exercice })}`
    : `${chemin(dossier, exercice)}/pieces-jointes/${encodeURIComponent(numero)}/fichier`;
  try {
    const f = await telecharger(route);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}

/**
 * Compléter la fiche d'un fournisseur au registre du dossier (16 octobre 2026) : sigle,
 * téléphone, ville, pays s'il est étranger. Chaque export des modèles de la DGI la reprend.
 */
export async function renseignerUnTiers(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const code = String(donnees.get("code") ?? "");
  const texte = (nom: string) => String(donnees.get(nom) ?? "").trim() || null;
  const denomination = texte("denomination");
  if (!denomination) return { echec: "La raison sociale est obligatoire.", fait: null };
  const etranger = donnees.get("etranger") === "on";
  return agirSurUnePiece(
    () =>
      appeler(`/portefeuille/entreprises/${encodeURIComponent(dossier)}/tiers/${encodeURIComponent(code)}`, {
        methode: "PUT",
        authentifie: true,
        corps: {
          denomination,
          niu: texte("niu"),
          sigle: texte("sigle"),
          telephone: texte("telephone"),
          ville: texte("ville"),
          etranger,
          pays: etranger ? texte("pays") : null,
        },
      }),
    `Fiche de ${denomination} enregistrée : les modèles de la DGI la reprennent.`,
  );
}

// ── La relecture par l'agent (18 octobre 2026, point 24) ─────────────────────────


/** L'agent relit le dossier de la DSF et propose ; sans clé, il le dit, et rien n'attend. */
export async function demanderUneRelectureDsf(
  _precedent: EtatDeLaRelecture,
  donnees: FormData,
): Promise<EtatDeLaRelecture> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  try {
    const r = await appeler<{ disponible: boolean; remarques: RemarqueDeLAgent[]; message: string }>(
      `${chemin(dossier, exercice)}/relecture-de-l-agent`,
      { methode: "POST", authentifie: true },
    );
    return { echec: null, message: r.message, remarques: r.remarques };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, message: null, remarques: [] };
    throw erreur;
  }
}
