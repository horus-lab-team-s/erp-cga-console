/**
 * Le contexte E · Comptabilité SYSCOHADA, côté écran.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA BALANCE ET LE GRAND LIVRE SONT CALCULÉS PAR LE BACKEND, JAMAIS ICI
 *
 * Il n'existe qu'une source : le journal. Une balance recalculée dans le
 * navigateur serait un second exemplaire de la vérité, et le jour où les deux
 * divergeraient personne ne saurait lequel croire — alors qu'il n'y a rien à
 * croire : la balance *est* la somme des écritures.
 *
 * Le front affiche. Il n'additionne pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

/**
 * Une ligne d'écriture, telle que l'API la rend.
 *
 * ⚠️ `sens` et `montant`, **pas** `debit` et `credit`. Ce type déclarait les
 * seconds, qui n'ont jamais existé côté backend : personne ne l'avait exécuté,
 * le compilateur ne pouvait rien dire, et le premier écran à s'en servir a
 * affiché des montants vides. C'est la même classe de défaut que le reste du
 * projet : un type juste en apparence, faux à l'exécution.
 *
 * Le sens est une **donnée**, pas un calcul : mettre le montant dans la colonne
 * qui lui revient reste de la présentation. Le front continue de ne rien
 * additionner.
 */
export type LigneEcriture = {
  compte: string;
  libelle: string;
  sens: "DEBIT" | "CREDIT";
  montant: string;
  tiers: string | null;
  lettrage: string | null;
  attribut_fiscal: unknown | null;
};

/** Deux états, et il n'y en a pas de troisième : une écriture validée ne
 *  s'annule pas, elle se contre-passe par une écriture nouvelle. */
export type Ecriture = {
  journal: string;
  exercice: string;
  numero: number;
  date_operation: string;
  libelle: string;
  piece_justificative: string | null;
  reference_externe: string | null;
  lignes: LigneEcriture[];
  etat: "BROUILLON" | "VALIDEE";
  type: string;
  ecriture_contrepassee: string | null;
  motif_contrepassation: string | null;
  saisie_par: string | null;
  validee_par: string | null;
  validee_le: string | null;
};

/** Le corps d'une saisie, tel que la proposition le rend et que `/ecritures` l'attend. */
export type SaisieProposee = {
  journal: string;
  exercice: string;
  date_operation: string;
  libelle: string;
  piece_justificative: string | null;
  reference_externe: string | null;
  lignes: LigneEcriture[];
};

/** Ce que rend `POST /comptabilite/dossiers/{niu}/propositions` (pas 73). */
export type PropositionDEcriture = {
  comptabilisable: boolean;
  saisie: SaisieProposee | null;
  numero_pressenti: number | null;
  empechements: string[];
  /** Ce que le portefeuille a rectifié sur le destinataire déclaré par la facture. */
  rectifications: string[];
};

/**
 * ⚠️ Pas 77 : ce type déclarait `libelle`, que la balance ne rend pas (elle se calcule
 * sur les écritures, et l'intitulé d'un compte appartient au plan). La colonne
 * « Intitulé » de l'écran était vide pour chaque compte. L'écran lit désormais
 * l'intitulé au plan comptable. Relevé par `outils/contrat_des_ecrans.py`.
 */
export type SoldeCompte = {
  compte: string;
  total_debit: string;
  total_credit: string;
  solde: string;
  /** `null` pour un compte soldé (pas 79 : ce type le déclarait toujours présent). */
  sens_solde: "DEBIT" | "CREDIT" | null;
  solde_debiteur: string;
  solde_crediteur: string;
};

/**
 * Une ligne du grand livre, **au champ près** du modèle `LigneGrandLivre` du backend.
 *
 * ⚠️ Pas 77 : ce type déclarait `numero`, `debit` et `credit`, qui n'existent pas. Le
 * commentaire de `LigneEcriture`, plus haut, racontait déjà cette faute pour les lignes
 * d'écriture ; le grand livre l'avait gardée. Chaque ligne affichait « AC / undefined »
 * et « — » dans les deux colonnes de montant : seul le solde progressif était rempli.
 */
export type LigneGrandLivre = {
  date_operation: string;
  journal: string;
  /** « 2026/AC/000001 » : la clé de l'écriture, qui porte déjà le journal et le numéro. */
  cle_ecriture: string;
  libelle: string;
  sens: "DEBIT" | "CREDIT";
  montant: string;
  solde_progressif: string;
  tiers: string | null;
  lettrage: string | null;
  /** Pas 108 : le rang de la ligne dans son écriture, qui la désigne pour le lettrage. */
  rang: number;
  /** Pas 108 : `PLATEFORME` (lettré ici, se défait), `REPRISE` (lettre du logiciel du client). */
  lettrage_origine: "PLATEFORME" | "REPRISE" | null;
  lettrage_identifiant: string | null;
  /** Pas 108 : « toute ligne remonte à sa pièce en un clic ». */
  piece_justificative: string | null;
};

/** Pas 108 : le filtre « Lettrage » du grand livre. */
export type FiltreDeLettrage = "TOUTES" | "LETTREES" | "NON_LETTREES";

/** Pas 108 : la période et le journal, communs à la balance et au grand livre. */
export type FiltresComptables = { du?: string; au?: string; journal?: string };

/** ⚠️ Pas 77 : `numeros_manquants` et `numeros_en_double`, pas `manquants`. */
export type TrouSequence = {
  journal: string;
  exercice: string;
  numeros_manquants: number[];
  numeros_en_double: number[];
};

export type SanteComptable = {
  exercice: string;
  equilibree: boolean;
  total_debit: string;
  total_credit: string;
  resultat: string;
  trous_de_sequence: TrouSequence[];
  /** Sérialisé par le backend : l'écran ne recalcule pas la règle. */
  deposable: boolean;
};

/** ⚠️ Pas 77 : `classe` et `sens_normal` n'existent pas dans la réponse ; aucun écran ne les lisait. */
export type Compte = {
  numero: string;
  intitule: string;
  /** Le compte du plan de référence dont celui-ci dérive, s'il en dérive. */
  compte_reference: string | null;
  lettrable: boolean;
  rapprochable: boolean;
};

const authentifie = { authentifie: true } as const;

export function lireEcritures(niu: string, exercice: string, journal?: string) {
  const p = new URLSearchParams({ exercice });
  if (journal) p.set("journal", journal);
  return appeler<Ecriture[]>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/ecritures?${p}`,
    authentifie,
  );
}

export function lireBalance(niu: string, exercice: string, filtres: FiltresComptables = {}) {
  const p = new URLSearchParams({ exercice });
  if (filtres.du) p.set("du", filtres.du);
  if (filtres.au) p.set("jusqu_au", filtres.au);
  if (filtres.journal) p.set("journal", filtres.journal);
  return appeler<SoldeCompte[]>(`/comptabilite/dossiers/${encodeURIComponent(niu)}/balance?${p}`, authentifie);
}

export function lireSante(niu: string, exercice: string, filtres: FiltresComptables = {}) {
  // Pas 108 : les totaux du pied de la balance filtrée viennent d'ici, jamais d'une addition.
  const p = new URLSearchParams({ exercice });
  if (filtres.du) p.set("du", filtres.du);
  if (filtres.au) p.set("jusqu_au", filtres.au);
  if (filtres.journal) p.set("journal", filtres.journal);
  return appeler<SanteComptable>(`/comptabilite/dossiers/${encodeURIComponent(niu)}/sante?${p}`, authentifie);
}

export function lireGrandLivre(
  niu: string,
  compte: string,
  exercice: string,
  filtres: FiltresComptables & { lettrage?: FiltreDeLettrage } = {},
) {
  const p = new URLSearchParams({ exercice });
  if (filtres.du) p.set("du", filtres.du);
  if (filtres.au) p.set("au", filtres.au);
  if (filtres.journal) p.set("journal", filtres.journal);
  if (filtres.lettrage && filtres.lettrage !== "TOUTES") p.set("lettrage", filtres.lettrage);
  return appeler<LigneGrandLivre[]>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/grand-livre/${encodeURIComponent(compte)}?${p}`,
    authentifie,
  );
}

export function lirePlanComptable(classe?: number) {
  return appeler<Compte[]>(
    `/comptabilite/plan-comptable${classe ? `?classe=${classe}` : ""}`,
    authentifie,
  );
}

/** L'exercice en cours, faute de sélecteur d'exercice à l'écran. */
export function exerciceCourant(): string {
  return String(new Date().getFullYear());
}


// ══ Écrire ═══════════════════════════════════════════════════════════════════
//
// ⚠️ Les constantes et les états de formulaire vivent dans `saisie.ts`, et non
// ici : ce module importe `api.ts`, donc `next/headers`, donc le serveur. Un
// composant client qui y prendrait une constante embarquerait tout le module et
// la compilation échouerait. Voir l'en-tête de `saisie.ts`.

export type Journal = {
  code: string;
  intitule: string;
  nature: string;
  compte_contrepartie: string | null;
};

/** Les journaux ouverts. Saisir sur un code absent d'ici reçoit un 409. */
export function lireJournaux() {
  return appeler<Journal[]>("/comptabilite/journaux", authentifie);
}
