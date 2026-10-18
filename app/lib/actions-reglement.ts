"use server";

/**
 * Le règlement des adhérents (18 octobre 2026) : réviser un tarif à partir d'une date,
 * fixer la règle de dépassement, accorder ou lever une grâce, accorder ou retirer le
 * mandat « le cabinet paie pour moi ». Les bornes sont au serveur ; sa phrase s'affiche.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

const champ = (donnees: FormData, cle: string) => String(donnees.get(cle) ?? "").trim();

async function geste(chemin: string, corps: unknown, fait: string): Promise<EtatActe> {
  try {
    await appeler(chemin, { methode: chemin.endsWith("/regle") ? "PUT" : "POST", authentifie: true, corps });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/portefeuille", "page");
  revalidatePath("/[locale]/portefeuille/[niu]", "page");
  return { echec: null, fait };
}

function motifOuEchec(donnees: FormData): string | EtatActe {
  const motif = champ(donnees, "motif");
  return motif.length < 10 ? { echec: "Le motif s'écrit en dix caractères au moins.", fait: null } : motif;
}

export async function reviserLeTarif(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = motifOuEchec(donnees);
  if (typeof motif !== "string") return motif;
  const niu = champ(donnees, "niu");
  const montant = champ(donnees, "montant").replace(/\s/g, "");
  const aPartirDu = champ(donnees, "a_partir_du");
  if (!/^\d+$/.test(montant) || !aPartirDu) return { echec: "Montant et date d'effet sont obligatoires.", fait: null };
  return geste(
    `/souscription/honoraires/${encodeURIComponent(niu)}/contrat/revisions`,
    { montant, a_partir_du: aPartirDu, motif },
    "Tarif révisé. Les périodes antérieures gardent leur prix.",
  );
}

export async function fixerLaRegleDeDepassement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = motifOuEchec(donnees);
  if (typeof motif !== "string") return motif;
  const delai = Number(champ(donnees, "delai_jours"));
  if (!Number.isInteger(delai) || delai < 0 || delai > 365) {
    return { echec: "Le dépassement toléré se compte en jours, de 0 à 365.", fait: null };
  }
  return geste("/souscription/reglement/regle", { delai_jours: delai, motif }, "Règle de dépassement enregistrée.");
}

export async function accorderUneGrace(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = motifOuEchec(donnees);
  if (typeof motif !== "string") return motif;
  const niu = champ(donnees, "niu");
  return geste(
    `/souscription/honoraires/${encodeURIComponent(niu)}/graces`,
    { jusqu_au: champ(donnees, "jusqu_au"), motif },
    "Grâce accordée : le dossier se traite jusqu'à son terme.",
  );
}

export async function leverUneGrace(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = motifOuEchec(donnees);
  if (typeof motif !== "string") return motif;
  const niu = champ(donnees, "niu");
  const grace = champ(donnees, "grace");
  return geste(
    `/souscription/honoraires/${encodeURIComponent(niu)}/graces/${encodeURIComponent(grace)}/levee`,
    { motif },
    "Grâce levée.",
  );
}

export async function accorderLeMandat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = motifOuEchec(donnees);
  if (typeof motif !== "string") return motif;
  const niu = champ(donnees, "niu");
  const obligations = donnees.getAll("obligations").map(String);
  if (obligations.length === 0) return { echec: "Cochez au moins une obligation (TVA, CNPS, IRPP).", fait: null };
  return geste(
    `/souscription/fonds-de-tiers/${encodeURIComponent(niu)}/mandat`,
    {
      obligations,
      a_compter_du: champ(donnees, "a_compter_du"),
      signe_le: champ(donnees, "signe_le"),
      signataire: champ(donnees, "signataire"),
      motif,
    },
    "Mandat accordé : l'adhérent peut confier ses fonds au cabinet pour ces obligations.",
  );
}

export async function retirerLeMandat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = motifOuEchec(donnees);
  if (typeof motif !== "string") return motif;
  const niu = champ(donnees, "niu");
  return geste(
    `/souscription/fonds-de-tiers/${encodeURIComponent(niu)}/mandat/retrait`,
    { au: champ(donnees, "au"), motif },
    "Mandat retiré à cette date. Les fonds déjà confiés restent à reverser.",
  );
}
