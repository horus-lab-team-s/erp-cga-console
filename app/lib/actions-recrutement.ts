"use server";

/**
 * Les gestes du cabinet sur ses offres de poste (16 octobre 2026) : rédiger, modifier,
 * publier, clore, et télécharger le CV d'une candidature. Les refus sont ceux du backend.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatActe } from "./saisie";
import type { EtatExport } from "./saisie-echange";

const CHEMIN = "/[locale]/offres-de-poste";

function saisie(donnees: FormData) {
  const texte = (nom: string) => String(donnees.get(nom) ?? "").trim();
  return {
    intitule: texte("intitule"),
    lieu: texte("lieu"),
    type_de_contrat: texte("type_de_contrat"),
    description: texte("description"),
    qualifications: texte("qualifications"),
    date_limite: texte("date_limite") || null,
  };
}

async function agir(acte: () => Promise<unknown>, fait: string): Promise<EtatActe> {
  try {
    await acte();
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath(CHEMIN, "page");
  return { echec: null, fait };
}

export async function enregistrerUneOffre(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  const corps = saisie(donnees);
  if (corps.qualifications.length < 10) return { echec: "Décrivez les qualifications attendues.", fait: null };
  return identifiant
    ? agir(
        () => appeler(`/vitrine/cabinet/offres/${encodeURIComponent(identifiant)}`, { methode: "PUT", authentifie: true, corps }),
        "Offre enregistrée.",
      )
    : agir(
        () => appeler("/vitrine/cabinet/offres", { methode: "POST", authentifie: true, corps }),
        "Offre rédigée en brouillon : publiez-la pour qu'elle paraisse sur le site.",
      );
}

export async function publierUneOffre(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  return agir(
    () => appeler(`/vitrine/cabinet/offres/${encodeURIComponent(identifiant)}/publication`, { methode: "POST", authentifie: true }),
    "Offre publiée : elle paraît sur le site.",
  );
}

export async function cloreUneOffre(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  return agir(
    () => appeler(`/vitrine/cabinet/offres/${encodeURIComponent(identifiant)}/cloture`, { methode: "POST", authentifie: true }),
    "Offre close : elle a quitté le site, ses candidatures restent ici.",
  );
}

export async function telechargerUnCv(_precedent: EtatExport, donnees: FormData): Promise<EtatExport> {
  const candidature = String(donnees.get("candidature") ?? "");
  try {
    const f = await telecharger(`/vitrine/cabinet/candidatures/${encodeURIComponent(candidature)}/cv`);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}
