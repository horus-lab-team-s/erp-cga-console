/**
 * Le contexte A · Référentiel normatif, côté écran.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST L'ÉCRAN LE PLUS IMPORTANT DU PRODUIT, ET LE MOINS SPECTACULAIRE
 *
 * Tant qu'aucun paramètre n'est validé sur le Code général des impôts, **aucun
 * chiffre produit par la plateforme n'est opposable**. Cet écran est le seul
 * endroit où cela se voit d'un coup d'œil, paramètre par paramètre, avec son
 * fondement et sa source.
 *
 * Il sert d'abord à répondre à une question que le cabinet doit pouvoir poser tous
 * les jours : **sur quoi repose ce chiffre ?**
 *
 * ⚠️ PAS 95 : LE CABINET DÉCIDE DEPUIS L'ÉCRAN, POUR LUI SEUL
 *
 * Valider une version livrée « à valider », proposer une nouvelle version datée, la
 * faire valider par une autre personne : ces décisions forment la surcouche du cabinet,
 * appliquée au calcul suivant. Le fichier commun n'est jamais réécrit. Qui peut quoi
 * est lu au circuit (`GET /transverse/referentiel/circuit`), jamais déduit ici.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";
import { aujourdhui } from "./portefeuille";

export type Fondement = { texte: string; source: string };

export type ParametreResolu = {
  code: string;
  libelle: string;
  valeur: string | number | boolean;
  unite: string;
  applicable_du: string;
  statut: "A_VALIDER" | "VALIDE" | "ABROGE";
  nature: "LOI" | "POLITIQUE_CABINET";
  valide_par: string | null;
  fondement: Fondement;
  note: string | null;
};

export type EtatValidation = {
  a_la_date: string;
  total: number;
  non_valides: string[];
  /** Sérialisé par le backend : l'écran ne réinvente pas la règle. */
  opposable: boolean;
};

const authentifie = { authentifie: true } as const;

export function lireCodes() {
  return appeler<string[]>("/referentiel/parametres", authentifie);
}

export function lireParametre(code: string, a_la_date = aujourdhui()) {
  return appeler<ParametreResolu>(
    `/referentiel/parametres/${encodeURIComponent(code)}?a_la_date=${a_la_date}`,
    authentifie,
  );
}

export function lireValidation(a_la_date = aujourdhui()) {
  return appeler<EtatValidation>(
    `/referentiel/validation?a_la_date=${a_la_date}`,
    authentifie,
  );
}


// ── Les décisions du cabinet (pas 95) ───────────────────────────────────────

export type DroitsSurUneNature = { peut_proposer: boolean; peut_valider: boolean; quatre_yeux: boolean };

export type MonCircuit = {
  par_nature: Partial<Record<ParametreResolu["nature"], DroitsSurUneNature>>;
  motif_minimum: number;
  /** Le fichier de circuit lu, ou « aucun fichier » : dit pourquoi rien n'est proposé. */
  source: string;
};

export type DecisionSurLeReferentiel = {
  identifiant: string;
  code: string;
  sorte: "VALIDATION" | "NOUVELLE_VERSION";
  applicable_du: string;
  valeur: string | number | boolean | null;
  fondement: Fondement | null;
  note: string | null;
  motif: string;
  propose_par: string;
  propose_par_nom: string;
  propose_le: string;
  statut: "PROPOSEE" | "APPLIQUEE" | "REFUSEE";
  tranche_par: string | null;
  tranche_par_nom: string | null;
  tranche_le: string | null;
  motif_de_la_decision: string | null;
  /** Pas 98 : la décision cesse de s'appliquer à compter de cette date. */
  fin_d_effet: string | null;
  retire_par_nom: string | null;
  motif_du_retrait: string | null;
};

export type EtatDUneDecision = {
  decision: DecisionSurLeReferentiel;
  nature: ParametreResolu["nature"] | null;
  sans_objet: string | null;
};

export function lireMonCircuit() {
  return appeler<MonCircuit>("/transverse/referentiel/circuit", authentifie);
}

export function lireDecisions() {
  return appeler<EtatDUneDecision[]>("/transverse/referentiel/decisions", authentifie);
}
