"use server";

/**
 * Les gestes du responsable de la création sur les rendez-vous (9 novembre 2026) : tenir
 * l'agenda, fermer un créneau, constater un rendez-vous, poser un lien, et saisir au
 * cabinet la demande d'un client. Les bornes sont au serveur ; sa phrase s'affiche.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";
import { plagesDuJour } from "./rendez-vous-etats";

const champ = (donnees: FormData, cle: string) => String(donnees.get(cle) ?? "").trim();

async function geste(chemin: string, methode: "POST" | "PUT", corps: unknown, fait: string): Promise<EtatActe> {
  try {
    await appeler(chemin, { methode, authentifie: true, corps });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/acquisition/rendez-vous", "page");
  return { echec: null, fait };
}

export async function fixerLAgenda(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  let plages;
  try {
    plages = [0, 1, 2, 3, 4, 5, 6].flatMap((jour) => plagesDuJour(jour, champ(donnees, `jour_${jour}`)));
  } catch (erreur) {
    return { echec: (erreur as Error).message, fait: null };
  }
  const modes = ["PRESENTIEL", "EN_LIGNE"].filter((m) => donnees.get(`mode_${m}`) === "oui");
  const duree = Number(champ(donnees, "duree_minutes"));
  if (!Number.isInteger(duree) || duree < 15 || duree > 240) {
    return { echec: "La durée d'un rendez-vous se compte en minutes, de 15 à 240.", fait: null };
  }
  const joursFermes = champ(donnees, "jours_fermes")
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (joursFermes.some((j) => !/^\d{4}-\d{2}-\d{2}$/.test(j))) {
    return { echec: "Les jours fermés s'écrivent AAAA-MM-JJ, séparés par des virgules.", fait: null };
  }
  return geste(
    "/acquisition/agenda",
    "PUT",
    { plages, duree_minutes: duree, modes, jours_fermes: joursFermes },
    "Agenda enregistré.",
  );
}

export async function basculerUnCreneau(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const debut = champ(donnees, "debut");
  const fermer = donnees.get("fermer") === "oui";
  return geste(
    fermer ? "/acquisition/agenda/fermetures" : "/acquisition/agenda/reouvertures",
    "POST",
    { debut },
    fermer ? "Créneau fermé." : "Créneau rouvert.",
  );
}

export async function constaterLeRendezVous(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = champ(donnees, "identifiant");
  const issue = champ(donnees, "issue");
  if (!["HONORE", "MANQUE", "ANNULE"].includes(issue)) return { echec: "Choisissez un constat.", fait: null };
  return geste(
    `/acquisition/rendez-vous/${encodeURIComponent(identifiant)}/constat`,
    "POST",
    { issue, motif: champ(donnees, "motif") || null },
    issue === "MANQUE"
      ? "Rendez-vous manqué : la pénalité fixée par la direction est due avant tout nouveau rendez-vous."
      : "Constat enregistré.",
  );
}

export async function poserLeLien(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const lien = champ(donnees, "lien");
  if (!lien.startsWith("https://")) return { echec: "Le lien commence par https://.", fait: null };
  return geste(
    `/acquisition/rendez-vous/${encodeURIComponent(champ(donnees, "identifiant"))}/lien`,
    "PUT",
    { lien },
    "Lien enregistré.",
  );
}

export type EtatSaisieAuCabinet = { echec: string | null; reference: string | null };

/** Le responsable saisit la demande d'un client venu au cabinet. Rend la référence du dossier. */
export async function saisirUneDemandeAuCabinet(
  _precedent: EtatSaisieAuCabinet,
  donnees: FormData,
): Promise<EtatSaisieAuCabinet> {
  if (donnees.get("accord") !== "oui") {
    return { echec: "Cochez la case : le client doit avoir accepté que ses informations soient enregistrées.", reference: null };
  }
  const nom = champ(donnees, "nom");
  const telephone = champ(donnees, "telephone");
  if (nom.length < 2 || telephone.replace(/\D/g, "").length < 8) {
    return { echec: "Le nom et un numéro de téléphone complet sont nécessaires.", reference: null };
  }
  try {
    const r = await appeler<{ reference: string }>("/acquisition/demandes/au-cabinet", {
      methode: "POST",
      authentifie: true,
      corps: {
        nom,
        telephone,
        courriel: champ(donnees, "courriel") || null,
        service_souhaite: champ(donnees, "service") || "CREATION",
        message: champ(donnees, "message") || null,
        canal_prefere: "APPEL",
        consentement_whatsapp: donnees.get("whatsapp") === "oui",
        ...(champ(donnees, "code") ? { code_de_dossier: champ(donnees, "code") } : {}),
      },
    });
    revalidatePath("/[locale]/acquisition", "page");
    return { echec: null, reference: r.reference };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, reference: null };
    throw erreur;
  }
}
