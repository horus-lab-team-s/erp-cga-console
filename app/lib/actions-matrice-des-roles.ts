"use server";

/**
 * Régler la matrice des rôles (18 octobre 2026) : les droits d'un rôle, la création et le
 * retrait d'un rôle du cabinet. Le super administrateur seul, avec son second facteur et
 * un motif ; les bornes sont au serveur, et sa phrase s'affiche.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

const CHEMIN = "/[locale]/roles";

async function geste(appel: () => Promise<unknown>, fait: string): Promise<EtatActe> {
  try {
    await appel();
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath(CHEMIN, "page");
  return { echec: null, fait };
}

export async function reglerUnRole(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const code = String(donnees.get("code") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  const libelle = String(donnees.get("libelle") ?? "").trim();
  if (!code) return { echec: "Rôle non désigné.", fait: null };
  if (motif.length < 10) return { echec: "Le motif s'écrit en dix caractères au moins.", fait: null };
  return geste(
    () =>
      appeler(`/transverse/matrice-des-roles/${encodeURIComponent(code)}`, {
        methode: "PUT",
        authentifie: true,
        corps: { permissions: donnees.getAll("permissions").map(String), motif, ...(libelle ? { libelle } : {}) },
      }),
    "Rôle réglé. Les sessions ouvertes après ce réglage portent les nouveaux droits.",
  );
}

export async function creerUnRole(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const libelle = String(donnees.get("libelle") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  // Le code se tire du nom : « Ressources humaines » → RESSOURCES_HUMAINES.
  const code =
    String(donnees.get("code") ?? "").trim() ||
    libelle
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  if (libelle.length < 2) return { echec: "Nommez le rôle.", fait: null };
  if (motif.length < 10) return { echec: "Le motif s'écrit en dix caractères au moins.", fait: null };
  return geste(
    () =>
      appeler("/transverse/matrice-des-roles", {
        methode: "POST",
        authentifie: true,
        corps: { code, libelle, permissions: donnees.getAll("permissions").map(String), motif },
      }),
    `Rôle « ${libelle} » créé. Il s'attribue depuis Comptes et habilitations.`,
  );
}

export async function retirerUnRole(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const code = String(donnees.get("code") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Le motif s'écrit en dix caractères au moins.", fait: null };
  return geste(
    () =>
      appeler(`/transverse/matrice-des-roles/${encodeURIComponent(code)}/retrait`, {
        methode: "POST",
        authentifie: true,
        corps: { motif },
      }),
    "Rôle retiré.",
  );
}
