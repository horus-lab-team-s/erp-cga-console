/**
 * Les règles construites par le cabinet, côté écran (pas 97) : lectures et types.
 *
 * ⚠️ L'écran ne compose aucun prédicat. Il envoie des conditions en clair (fait, opérateur,
 * valeur ou paramètre) ; le backend les confronte au schéma des faits et au référentiel,
 * pose lui-même la négation, et rend la phrase et l'essai. Ce que l'écran propose (faits,
 * opérateurs, paramètres) vient du catalogue : il ne le recopie pas.
 */

import { appeler } from "./api";

export type FaitDuCatalogue = {
  code: string;
  libelle: string;
  type: string;
  unite: string | null;
  valeurs: string[] | null;
  operateurs: string[];
};

export type CatalogueDuConstructeur = {
  faits: FaitDuCatalogue[];
  parametres: { code: string; libelle: string; unite: string }[];
  limites: string;
  peut_proposer: boolean;
  peut_valider: boolean;
  quatre_yeux: boolean;
  motif_minimum: number;
};

export type ConditionDAnomalie = {
  fait: string;
  operateur: string;
  valeur: string | null;
  parametre: string | null;
  autre_fait: string | null;
};

export type PropositionDeRegle = {
  identifiant: string;
  regle: { code: string; libelle: string; severite: string; applicable_du: string };
  phrase: string;
  essai: { eprouvees: number; reagit_sur: string[] };
  motif: string;
  propose_par: string;
  propose_par_nom: string;
  propose_le: string;
  statut: "PROPOSEE" | "APPLIQUEE" | "REFUSEE";
  tranche_par_nom: string | null;
  motif_de_la_decision: string | null;
  /** Pas 98 : la règle cesse de contrôler à compter de cette date. */
  fin_d_effet: string | null;
  retire_par_nom: string | null;
  motif_du_retrait: string | null;
};


export function lireCatalogueDuConstructeur() {
  return appeler<CatalogueDuConstructeur>("/conformite/constructeur/catalogue", { authentifie: true });
}

export function lirePropositionsDeRegles() {
  return appeler<PropositionDeRegle[]>("/conformite/regles/propositions", { authentifie: true });
}
