"use server";

/**
 * Les gestes du comptable sur le registre des immobilisations (17 octobre 2026) : saisir ou
 * modifier une fiche, sortir un bien, passer la dotation de l'exercice, télécharger le
 * tableau en Excel. Les refus sont ceux du backend, rendus tels quels.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatActe } from "./saisie";
import type { EtatExport } from "./saisie-echange";

const CHEMIN = "/[locale]/comptabilite/immobilisations";
const racine = (dossier: string) => `/comptabilite/dossiers/${encodeURIComponent(dossier)}`;

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

export async function enregistrerUneImmobilisation(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const texte = (nom: string) => String(donnees.get(nom) ?? "").trim();
  const dossier = texte("dossier");
  const code = texte("code").toUpperCase();
  const categorie = texte("categorie");
  const valeur = texte("valeur_origine").replace(/[\s  ]/g, "");
  if (!/^[A-Z0-9][A-Z0-9-]{0,23}$/.test(code)) {
    return {
      echec: "Le code : lettres, chiffres et tirets, 24 signes au plus (par exemple INFO-01).",
      fait: null,
    };
  }
  if (!/^\d+$/.test(valeur) || valeur === "0") {
    return {
      echec: "La valeur d'origine : un montant en francs CFA, sans décimales.",
      fait: null,
    };
  }
  const corps = {
    libelle: texte("libelle"),
    categorie,
    valeur_origine: valeur,
    mise_en_service: texte("mise_en_service"),
    duree_annees: categorie === "22" || !texte("duree_annees") ? null : Number(texte("duree_annees")),
    fournisseur: texte("fournisseur") || null,
    piece: texte("piece") || null,
  };
  return agir(
    () =>
      appeler(`${racine(dossier)}/immobilisations/${encodeURIComponent(code)}`, {
        methode: "PUT",
        authentifie: true,
        corps,
      }),
    `${code} enregistré au registre.`,
  );
}

export async function sortirUneImmobilisation(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const code = String(donnees.get("code") ?? "");
  const corps = {
    sortie_le: String(donnees.get("sortie_le") ?? ""),
    motif: String(donnees.get("motif") ?? "").trim(),
  };
  if (!corps.sortie_le || corps.motif.length < 3)
    return { echec: "Indiquez la date et le motif de la sortie.", fait: null };
  return agir(
    () =>
      appeler(`${racine(dossier)}/immobilisations/${encodeURIComponent(code)}/sortie`, {
        methode: "POST",
        authentifie: true,
        corps,
      }),
    `${code} sorti du registre.`,
  );
}

export async function passerLaDotation(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  try {
    const ecriture = await appeler<{ numero: number }>(
      `${racine(dossier)}/amortissements/${encodeURIComponent(exercice)}/dotation`,
      { methode: "POST", authentifie: true },
    );
    revalidatePath(CHEMIN, "page");
    return {
      echec: null,
      fait: `Dotation passée en brouillon : écriture ${exercice}/OD/${String(ecriture.numero).padStart(6, "0")}, à relire et valider.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function telechargerLeTableau(_precedent: EtatExport, donnees: FormData): Promise<EtatExport> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  try {
    const f = await telecharger(`${racine(dossier)}/amortissements/${encodeURIComponent(exercice)}/excel`);
    return {
      echec: null,
      fichier: {
        nom: f.nom,
        typeMime: f.typeMime,
        base64: Buffer.from(f.octets).toString("base64"),
      },
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}
