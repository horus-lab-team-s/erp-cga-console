/**
 * Le contexte K · Transverse, côté administration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CES ROUTES SONT RÉSERVÉES, ET L'ÉCRAN NE DOIT PAS L'IGNORER
 *
 * `GERER_COMPTES` pour la liste des comptes, `LIRE_AUDIT` pour le journal.
 * L'écran masque ce qui n'est pas permis — mais **masquer n'est pas protéger** :
 * l'API refuse de toute façon. Le masquage sert à ne pas proposer un bouton qui
 * échouerait.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";
import type { MandatAccorde } from "./mandats";
import type { Permission, Role } from "./acces";
import { aujourdhui } from "./portefeuille";

export type CompteAdministre = {
  identifiant: string;
  courriel: string;
  nom: string;
  prenom: string;
  etat: "EN_ATTENTE_ACTIVATION" | "ACTIF" | "SUSPENDU";
  cree_le: string;
  telephone: string | null;
  derniere_connexion: string | null;
  active: boolean;
  second_facteur_actif: boolean;
  nom_complet: string;
};

/** Une habilitation telle que l'API la rend : un rôle, un périmètre, un intervalle. */
export type HabilitationAdministree = {
  identifiant: string;
  compte: string;
  role: Role;
  /** `null` = tout le cabinet. */
  portee: string[] | null;
  debut: string;
  /** Borne exclue : l'habilitation ne vaut plus ce jour-là. */
  fin: string | null;
  motif: string;
  accordee_par: string;
  precision: string | null;
  transverse: boolean;
};

export type LigneCompte = {
  compte: CompteAdministre;
  roles: Role[];
  /** Les habilitations actives à la date (pas 70) : de quoi agir sur un rôle. */
  habilitations: HabilitationAdministree[];
  /** `null` = tout le portefeuille. Ne se confond pas avec une liste vide. */
  dossiers: string[] | null;
  /** Habilité mais affecté à aucun dossier — ni erreur, ni état normal. */
  sans_dossier: boolean;
};

export type FicheRole = {
  role: Role;
  permissions: Permission[];
  portee_obligatoire: boolean;
};

export type EntreeAudit = {
  rang: number;
  horodatage: string;
  acteur: string;
  action: string;
  objet_type: string;
  objet_id: string | null;
  motif: string | null;
  empreinte: string;
  /**
   * L'identifiant du mandat sous lequel l'action a été exercée, quand elle l'a été.
   *
   * ⚠️ `null` veut dire « chez soi », pas « on ne sait pas ». C'est toute la valeur du
   * champ : une entrée sans mandat dit qu'un compte du cabinet a agi sur les données du
   * cabinet, une entrée avec mandat nomme le titre auquel quelqu'un d'ailleurs y a
   * touché. La question d'un litige est celle-là, et elle ne se reconstitue pas après
   * coup.
   */
  mandat: string | null;
};

export type Verification = {
  entrees: number;
  intacte: boolean;
  /** Renseigné seulement si la chaîne est rompue : dit **où**, pas seulement que. */
  rupture: string | null;
};

const authentifie = { authentifie: true } as const;

export function lireComptes(a_la_date = aujourdhui()) {
  return appeler<LigneCompte[]>(
    `/transverse/comptes?a_la_date=${a_la_date}`,
    authentifie,
  );
}

/** Public : ce sont les règles du système, pas des données. */
export function lireRoles() {
  return appeler<FicheRole[]>("/transverse/roles");
}

export function lireAudit() {
  return appeler<EntreeAudit[]>("/transverse/audit", authentifie);
}

export function verifierChaine() {
  return appeler<Verification>("/transverse/audit/verification", authentifie);
}

/**
 * Les mandats **accordés** par ce locataire, et non ceux qu'il détient.
 *
 * ⚠️ Un mandat met en jeu les données de celui qui l'accorde : il est rangé chez lui, et
 * c'est chez lui qu'il se lit. Un cabinet qui voudrait la liste des mandats qu'il détient
 * devrait interroger chacun de ses mandants, et cette route n'existe pas : la créer
 * donnerait à un locataire une vue sur les décisions d'un autre.
 *
 * La forme et les libellés vivent dans `mandats.ts`, qui n'appelle rien : ils servent à un
 * composant interactif, donc envoyé au navigateur.
 */
export async function lireMandats(): Promise<MandatAccorde[]> {
  // ⚠️ `authentifie` : sans lui, le témoin de session n'est pas transmis et la route
  // rend 401. Le défaut a existé : le typage passait, la construction passait, et
  // l'outil de couverture aussi, puisqu'il ne regarde que l'adresse appelée. Seul
  // l'écran ouvert dans un navigateur l'a montré, par une page en erreur.
  return appeler<MandatAccorde[]>("/transverse/mandats", authentifie);
}
