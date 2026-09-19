/**
 * La fiche 360° d'un dossier : identité, histoire des statuts, collecte, accès (pas 86).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA FICHE MONTRE L'HISTOIRE, LES STATUTS LA RÉSOLVENT
 *
 * `GET /portefeuille/entreprises/{niu}` rend toutes les périodes, sans date : c'est là
 * qu'on répond à « depuis quand ? » et « pourquoi ? ». `…/statuts?a_la_date=` résout le
 * régime, le centre, l'exercice et le mandat **à une date** : c'est ce qu'on consulte
 * pour traiter une pièce de mars 2024. Les deux sont affichés, jamais confondus.
 *
 * ⚠️ QUI A ACCÈS NE NOMME QUE CE DOSSIER
 *
 * Depuis le pas 86, la portée de chaque habilitation est ramenée au dossier consulté :
 * la route rendait les NIU de tous les dossiers confiés au collaborateur.
 *
 * ⚠️ LA COMPLÉTUDE N'EST PAS UNE EXHAUSTIVITÉ
 *
 * Le backend connaît les pièces reçues et les demandes émises, pas les factures dont
 * personne n'a parlé. Un dossier « à jour » n'est pas un dossier complet, et l'écran
 * reprend la phrase du backend plutôt qu'un pourcentage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";
import type { CentreRattachement, RegimeFiscal } from "./portefeuille";
import type { Permission, Role } from "./acces";

type Periode = { debut: string; fin: string | null; motif: string; precision: string | null };

export type FicheEntreprise = {
  niu: string;
  denomination: string;
  forme_juridique: string;
  date_creation: string;
  rccm: string | null;
  capital: string | null;
  activite: string | null;
  siege: string | null;
  etablissements: string[];
  regimes: (Periode & { regime: RegimeFiscal })[];
  rattachements: (Periode & { centre: CentreRattachement })[];
  adhesions: (Periode & { numero: string | null })[];
  mandats: (Periode & { obligations: string[]; signe_le: string; signe_par: string })[];
  exercices: { libelle: string; ouverture: string; cloture: string; clos: boolean }[];
  dirigeants: { nom: string; qualite: string; depuis: string; jusqu_a: string | null; niu: string | null }[];
  associes: { nom: string; parts: string; depuis: string; niu: string | null }[];
  tiers: { code: string; denomination: string; type: string; niu: string | null; rccm: string | null; regime: RegimeFiscal | null; etranger: boolean }[];
};

export type StatutsResolus = {
  niu: string;
  denomination: string;
  a_la_date: string;
  regime: RegimeFiscal;
  centre: CentreRattachement;
  assujettie_tva: boolean;
  adherente: boolean;
  exercice: { libelle: string; ouverture: string; cloture: string; clos: boolean } | null;
  obligations_mandatees: string[];
};

export type AnomalieIdentifiant = {
  niu_entreprise: string;
  denomination: string;
  champ: string;
  valeur: string | null;
  motif: string;
  bloquante: boolean;
};

export type CompletudeDossier = {
  entreprise: string;
  periode_debut: string;
  periode_fin: string;
  pieces_recues: number;
  pieces_traitees: number;
  pieces_en_souffrance: string[];
  demandes_ouvertes: number;
  demandes_satisfaites: number;
  demandes_bloquantes_ouvertes: string[];
  demandes_en_retard: string[];
  plus_ancienne_en_souffrance: number | null;
  attentes_satisfaites: string | null;
  depot_possible: boolean;
  libelle: string;
};

export type HabilitationSurLeDossier = {
  identifiant: string;
  compte: string;
  role: Role;
  portee: string[] | null;
  debut: string;
  fin: string | null;
  motif: string;
  accordee_par: string;
  precision: string | null;
  transverse: boolean;
  permissions: Permission[];
};

export function lireFicheEntreprise(niu: string): Promise<FicheEntreprise> {
  return appeler<FicheEntreprise>(`/portefeuille/entreprises/${encodeURIComponent(niu)}`, { authentifie: true });
}

export function lireStatutsResolus(niu: string, jour: string): Promise<StatutsResolus> {
  return appeler<StatutsResolus>(
    `/portefeuille/entreprises/${encodeURIComponent(niu)}/statuts?a_la_date=${encodeURIComponent(jour)}`,
    { authentifie: true },
  );
}

/** Le portefeuille entier est contrôlé, restreint au périmètre par le backend. */
export function lireAnomaliesDuPortefeuille(jour: string): Promise<AnomalieIdentifiant[]> {
  return appeler<AnomalieIdentifiant[]>(`/portefeuille/anomalies?a_la_date=${encodeURIComponent(jour)}`, {
    authentifie: true,
  });
}

export function lireAccesAuDossier(niu: string, jour: string): Promise<HabilitationSurLeDossier[]> {
  return appeler<HabilitationSurLeDossier[]>(
    `/transverse/dossiers/${encodeURIComponent(niu)}/acces?a_la_date=${encodeURIComponent(jour)}`,
    { authentifie: true },
  );
}

export function lireCompletude(niu: string, debut: string, fin: string, jour: string): Promise<CompletudeDossier> {
  const requete = new URLSearchParams({ periode_debut: debut, periode_fin: fin, a_la_date: jour });
  return appeler<CompletudeDossier>(`/collecte/completude/${encodeURIComponent(niu)}?${requete}`, { authentifie: true });
}

/** Le mois précédant `jour` : celui dont la TVA se dépose ce mois-ci. Calcul sur les chiffres, sans `Date`. */
export function moisPrecedent(jour: string): { debut: string; fin: string; libelle: string } {
  const [a, m] = jour.split("-").map(Number);
  const annee = m === 1 ? a - 1 : a;
  const mois = m === 1 ? 12 : m - 1;
  const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  const mm = String(mois).padStart(2, "0");
  return { debut: `${annee}-${mm}-01`, fin: `${annee}-${mm}-${String(dernier).padStart(2, "0")}`, libelle: `${mm}/${annee}` };
}
