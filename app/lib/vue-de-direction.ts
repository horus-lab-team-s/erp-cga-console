/**
 * La vue de direction du tableau de bord (9 novembre 2026) : calculs purs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Trois lectures, toutes tirées de ce que le serveur rend déjà — rien d'inventé :
 *
 *   1. les encaissements des douze derniers mois (journal de caisse) ;
 *   2. le recouvrement des honoraires (situations de règlement) ;
 *   3. la part de chaque activité dans les encaissements (totaux par axe).
 *
 * ⚠️ AUCUN IMPORT DE MODULE SERVEUR : les tests lisent ces fonctions seules.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { AxeDeVersement, LigneDuJournal, TotalParAxe } from "./journal-de-caisse-etats";
import type { EtatDeReglement } from "./honoraires-etats";

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export type MoisEncaisse = { mois: string; libelle: string; montant: number };

/** Le premier jour du mois, onze mois avant celui du jour : la fenêtre glissante de douze mois. */
export function debutDesDouzeMois(jour: string): string {
  const [annee, mois] = jour.split("-").map(Number);
  const rang = annee * 12 + (mois - 1) - 11;
  const a = Math.floor(rang / 12);
  const m = (rang % 12) + 1;
  return `${a}-${String(m).padStart(2, "0")}-01`;
}

/**
 * Douze mois, du plus ancien au mois en cours, **y compris les mois sans encaissement**.
 *
 * ⚠️ Un mois vide reste une colonne à zéro : l'omettre rapprocherait deux mois distants
 * et ferait lire une continuité qui n'existe pas.
 */
export function encaissementsParMois(lignes: Pick<LigneDuJournal, "le" | "montant">[], jour: string): MoisEncaisse[] {
  const debut = debutDesDouzeMois(jour);
  const [a0, m0] = debut.split("-").map(Number);
  const mois: MoisEncaisse[] = Array.from({ length: 12 }, (_, i) => {
    const rang = a0 * 12 + (m0 - 1) + i;
    const a = Math.floor(rang / 12);
    const m = rang % 12;
    return { mois: `${a}-${String(m + 1).padStart(2, "0")}`, libelle: MOIS_COURTS[m], montant: 0 };
  });
  const index = new Map(mois.map((m, i) => [m.mois, i]));
  for (const ligne of lignes) {
    const i = index.get(ligne.le.slice(0, 7));
    if (i !== undefined) mois[i].montant += Number(ligne.montant) || 0;
  }
  return mois;
}

export type PartDActivite = { axe: AxeDeVersement; montant: number; part: number };

/** Les activités qui ont encaissé, de la plus grosse à la plus petite ; `part` sur 1. */
export function partsParActivite(totaux: Pick<TotalParAxe, "axe" | "montant">[]): PartDActivite[] {
  const lignes = totaux.map((t) => ({ axe: t.axe, montant: Number(t.montant) || 0 })).filter((t) => t.montant > 0);
  const total = lignes.reduce((s, t) => s + t.montant, 0);
  return lignes
    .sort((a, b) => b.montant - a.montant)
    .map((t) => ({ ...t, part: total > 0 ? t.montant / total : 0 }));
}

export type Recouvrement = {
  /** Adhérents sous contrat d'honoraires : la base du taux. */
  sousContrat: number;
  aJour: number;
  enRetard: number;
  sousGrace: number;
  bloques: number;
  /** Ce qui reste dû par ceux qui ne sont pas à jour. */
  aRecouvrer: number;
  /** Part des adhérents à jour, sur 1 ; `null` quand personne n'est sous contrat. */
  taux: number | null;
};

/**
 * ⚠️ « SANS_CONTRAT » sort de la base : un adhérent sans honoraires convenus n'est ni à
 * jour ni en retard, et le compter ferait baisser le taux sans que rien ne soit dû.
 */
export function recouvrement(situations: { etat: EtatDeReglement; du: string }[]): Recouvrement {
  let aJour = 0, enRetard = 0, sousGrace = 0, bloques = 0, aRecouvrer = 0;
  for (const s of situations) {
    if (s.etat === "SANS_CONTRAT") continue;
    if (s.etat === "EN_REGLE") aJour++;
    else {
      if (s.etat === "EN_RETARD") enRetard++;
      else if (s.etat === "SOUS_GRACE") sousGrace++;
      else if (s.etat === "BLOQUE") bloques++;
      aRecouvrer += Number(s.du) || 0;
    }
  }
  const sousContrat = aJour + enRetard + sousGrace + bloques;
  return { sousContrat, aJour, enRetard, sousGrace, bloques, aRecouvrer, taux: sousContrat ? aJour / sousContrat : null };
}

/** Graduation propre de l'axe : 1, 2 ou 5 × 10ⁿ, au-dessus du maximum. */
export function plafondDeLAxe(maximum: number): number {
  if (maximum <= 0) return 1;
  const puissance = 10 ** Math.floor(Math.log10(maximum));
  for (const pas of [1, 2, 2.5, 5, 10]) {
    if (pas * puissance >= maximum) return pas * puissance;
  }
  return 10 * puissance;
}

/** « 1,2 M », « 450 k », « 900 » : les graduations d'un axe en FCFA. */
export function montantCompact(valeur: number): string {
  if (valeur >= 1_000_000) return `${(valeur / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (valeur >= 1_000) return `${Math.round(valeur / 1_000).toLocaleString("fr-FR")} k`;
  return String(Math.round(valeur));
}
