"use server";

/**
 * La fiche signalétique de la DSF (15 octobre 2026) : le client la renseigne et l'envoie,
 * le cabinet la valide ou la renvoie avec ce qu'il faut corriger.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import { CHAMPS_R1 } from "./fiche-dsf-etats";
import type { EtatActe } from "./saisie";

function url(dossier: string, suite = "") {
  return `/portefeuille/entreprises/${encodeURIComponent(dossier)}/fiche-signaletique${suite}`;
}

function rafraichir() {
  revalidatePath("/[locale]/mon-espace/entreprise", "page");
  revalidatePath("/[locale]/portefeuille/[niu]", "page");
  revalidatePath("/[locale]/cloture", "page");
}

function texte(donnees: FormData, nom: string): string | null {
  const valeur = String(donnees.get(nom) ?? "").trim();
  return valeur || null;
}

function entier(donnees: FormData, nom: string): number | null {
  const valeur = texte(donnees, nom);
  return valeur && /^\d+$/.test(valeur) ? Number(valeur) : null;
}

/** Les lignes répétées (activités, administrateurs) : une valeur par ligne, lignes vides ignorées. */
function lignes(donnees: FormData, champs: string[]): Record<string, string | null>[] {
  const colonnes = champs.map((c) => donnees.getAll(c).map((v) => String(v).trim()));
  return colonnes[0]
    .map((_, i) => Object.fromEntries(champs.map((c, j) => [c.split(".")[1], colonnes[j][i] || null])))
    .filter((ligne) => Object.values(ligne).some(Boolean));
}

async function agir(acte: () => Promise<unknown>, fait: string): Promise<EtatActe> {
  try {
    await acte();
    rafraichir();
    return { echec: null, fait };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/** Enregistrer la fiche ; avec `envoyer`, l'envoyer au cabinet dans la foulée. */
export async function enregistrerLaFicheDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const envoyer = donnees.get("intention") === "envoyer";
  const ag = texte(donnees, "etats_approuves_en_ag");
  const corps = {
    ...Object.fromEntries(CHAMPS_R1.map(([nom]) => [nom, texte(donnees, nom)])),
    professionnel_des_etats: texte(donnees, "professionnel_des_etats"),
    etats_approuves_en_ag: ag === null ? null : ag === "oui",
    etablissements_au_cameroun: entier(donnees, "etablissements_au_cameroun"),
    etablissements_hors_cameroun: entier(donnees, "etablissements_hors_cameroun"),
    premiere_annee_au_cameroun: entier(donnees, "premiere_annee_au_cameroun"),
    controle: texte(donnees, "controle"),
    activites: lignes(donnees, ["activite.designation", "activite.code_nacam", "activite.chiffre_affaires_ht"]),
    conseil_d_administration: lignes(donnees, ["membre.nom", "membre.prenoms", "membre.qualite", "membre.adresse"]),
  };
  try {
    await appeler(url(dossier), { methode: "PUT", authentifie: true, corps });
    if (envoyer) await appeler(url(dossier, "/soumission"), { methode: "POST", authentifie: true });
  } catch (erreur) {
    rafraichir();
    if (erreur instanceof ErreurApi) {
      return { echec: envoyer ? `Fiche enregistrée, mais pas encore envoyée : ${erreur.message}` : erreur.message, fait: null };
    }
    throw erreur;
  }
  rafraichir();
  return {
    echec: null,
    fait: envoyer
      ? "Fiche envoyée pour relecture. La réponse s'affiche ici."
      : "Fiche enregistrée. Envoyez-la au cabinet quand elle est complète.",
  };
}

export async function validerLaFicheDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  return agir(
    () => appeler(url(dossier, "/validation"), { methode: "POST", authentifie: true }),
    "Fiche validée : la DSF reprendra ces informations.",
  );
}

export async function renvoyerLaFicheDsf(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Dites au client ce qu'il doit corriger (10 caractères au moins).", fait: null };
  return agir(
    () => appeler(url(dossier, "/renvoi"), { methode: "POST", authentifie: true, corps: { motif } }),
    "Fiche renvoyée au client avec votre motif.",
  );
}
