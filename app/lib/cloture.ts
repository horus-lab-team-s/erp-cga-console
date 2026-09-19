/**
 * Accès au contexte H · Clôture et DSF.
 *
 * ⚠️ Rien n'est stocké côté backend : la liasse est recalculée à chaque lecture
 * depuis la balance et le référentiel à la date de clôture. Une liasse 2024
 * rouverte en 2027 emploie donc les valeurs de 2024, et rend le même chiffre.
 */

import { appeler } from "@/app/lib/api";

export type LigneLiasse = {
  poste: string;
  libelle: string;
  sens: "ACTIF" | "PASSIF" | "CHARGE" | "PRODUIT";
  montant: string;
  comptes: string[];
};

export type ControleCoherence = {
  code: string;
  libelle: string;
  satisfait: boolean;
  ecart: string;
  explication: string | null;
};

export type LignePassage = {
  code: string;
  libelle: string;
  nature: "REINTEGRATION" | "DEDUCTION";
  montant: string;
  origine: string | null;
  non_valide: boolean;
};

/**
 * Le droit aux avantages du Centre, apprécié par le backend sur les faits.
 *
 * ⚠️ `ouvert` et `motif` sont rendus, jamais recalculés ici : adhésion sur tout
 * l'exercice, et chiffre d'affaires sous le seuil d'adhésion, borne comprise.
 */
export type DroitAuxAvantagesCGA = {
  adherent_sur_tout_l_exercice: boolean;
  chiffre_affaires: string;
  seuil_adhesion: string | null;
  borne_adhesion: "INCLUSE" | "EXCLUSE" | null;
  motif: string;
  ouvert: boolean;
};

export type Liasse = {
  entreprise: string;
  denomination: string;
  exercice: string;
  cloture: string;
  systeme: "NORMAL" | "MINIMAL";
  systeme_non_valide: boolean;
  lignes: LigneLiasse[];
  comptes_non_couverts: string[];
  controles: ControleCoherence[];
  coherent: boolean;
  total_actif: string;
  total_passif: string;
  total_charges: string;
  total_produits: string;
  resultat_comptable: string;
  resultat_par_le_bilan: string;
  passage: LignePassage[];
  total_reintegrations: string;
  total_deductions: string;
  resultat_fiscal: string;
  passage_non_valide: boolean;
  tva_rejetee_a_verifier: string;
  pieces_a_verifier: string[];
  // ⚠️ Absents du type jusqu'au pas 54 : la route les rendait depuis le pas 46, et
  // l'écran affichait un abattement, ou son absence, sans jamais dire pourquoi.
  droit_cga: DroitAuxAvantagesCGA;
  /** Le droit est ouvert, et l'abattement ne figure pourtant pas : pourquoi. */
  abattement_cga_ecarte: string | null;
};

export async function lireLiasse(entreprise: string, exercice: string): Promise<Liasse> {
  return appeler<Liasse>(
    `/cloture/dossiers/${encodeURIComponent(entreprise)}/liasse/${encodeURIComponent(exercice)}`,
    { authentifie: true },
  );
}

export const LIBELLES_SYSTEME: Record<string, string> = {
  NORMAL: "Système Normal",
  MINIMAL: "Système Minimal de Trésorerie",
};

/** L'ordre de lecture d'un état financier : bilan d'abord, résultat ensuite. */
export const ORDRE_SENS: LigneLiasse["sens"][] = ["ACTIF", "PASSIF", "CHARGE", "PRODUIT"];

export const LIBELLES_SENS: Record<LigneLiasse["sens"], string> = {
  ACTIF: "Actif",
  PASSIF: "Passif",
  CHARGE: "Charges",
  PRODUIT: "Produits",
};

// ══ Clore ════════════════════════════════════════════════════════════════════

/** Une cause de refus de la clôture : une valeur fermée, une phrase, ce qui est en cause. */
export type Empechement = {
  motif:
    | "BROUILLON_SUBSISTANT"
    | "BALANCE_DESEQUILIBREE"
    | "BOUCLAGE_ROMPU"
    | "SEQUENCE_TROUEE"
    | "COMPTE_HORS_PLAN"
    | "EXERCICE_DEJA_CLOS"
    | "EXERCICE_ANTERIEUR_OUVERT"
    | "EXERCICE_SUIVANT_ABSENT"
    | "EXERCICE_NON_TERMINE"
    | "RIEN_A_CLORE";
  explication: string;
  en_cause: string[];
};

/**
 * Ce que la clôture a fait, ou ce qu'elle ferait : la même forme dans les deux modes.
 *
 * ⚠️ `possible` est rendu par le backend : l'écran grise le bouton sur ce champ,
 * sans interpréter la liste des obstacles.
 */
export type RapportDeCloture = {
  exercice: string;
  applique: boolean;
  possible: boolean;
  obstacles: Empechement[];
  resultat_de_l_exercice: string;
  exercice_suivant: string | null;
  cle_a_nouveau: string | null;
  lignes_reportees: number;
  suivant_ouvert_par_la_cloture: boolean;
};

/** L'exercice d'un dossier à une date, tel que le portefeuille le résout. */
type StatutsALaDate = {
  exercice: { libelle: string; ouverture: string; cloture: string; clos: boolean } | null;
};

/**
 * L'exercice est-il déjà clos ? `null` quand le portefeuille ne répond pas.
 *
 * ⚠️ Une commodité d'affichage, pas un contrôle : elle évite d'inviter à écrire un
 * motif sur un exercice fermé. Le refus, lui, reste celui du backend, qui dira
 * « exercice déjà clos » si l'écran s'est trompé.
 */
export async function exerciceDejaClos(entreprise: string, cloture: string): Promise<boolean | null> {
  try {
    const statuts = await appeler<StatutsALaDate>(
      `/portefeuille/entreprises/${encodeURIComponent(entreprise)}/statuts?a_la_date=${encodeURIComponent(cloture)}`,
      { authentifie: true },
    );
    return statuts.exercice?.clos ?? null;
  } catch {
    return null;
  }
}

/** Une ligne du plan de correspondance balance → postes de la liasse (pas 90). */
export type LignePlanLiasse = { code: string; libelle: string; sens: string; prefixes: string[] };
export type SystemeDsf = "NORMAL" | "MINIMAL";

/** Le plan qui dit « ce qui alimente quoi » : aucune donnée d'adhérent, la mécanique seule. */
export function lirePlanDeLaLiasse(systeme: SystemeDsf) {
  return appeler<LignePlanLiasse[]>(`/cloture/plan-liasse?systeme=${systeme}`, { authentifie: true });
}
