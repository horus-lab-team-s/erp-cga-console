/**
 * La recherche globale, côté écran (pas 93).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'ÉCRAN NE CHERCHE RIEN LUI-MÊME
 *
 * La recherche est fédérée : chaque service qui a quelque chose à trouver répond sous
 * son propre préfixe, avec son périmètre, et se déclare au registre des services. Cet
 * écran demande d'abord **quelles sources la session peut appeler**
 * (`GET /transverse/services/recherche`), puis les interroge toutes en parallèle. Une
 * source en panne manque au résultat ; les autres s'affichent.
 *
 * ⚠️ POURQUOI UNE TABLE D'APPELS ÉCRITS EN TOUTES LETTRES, ET UN APPEL GÉNÉRIQUE
 *
 * L'outil de contrat des écrans ne vérifie que les chemins écrits en littéral : un appel
 * construit depuis le registre lui échapperait. Les sources connues ont donc chacune leur
 * appel écrit, vérifié contre le schéma de l'API. Une source **déclarée demain** au
 * registre, et encore absente de cette table, est interrogée par l'appel générique : elle
 * s'affiche sans modifier l'écran, et le backend garantit qu'elle rend le même contrat
 * (voir `tests/test_recherche_globale.py`, « déclarer, c'est brancher »). L'ajouter à la
 * table ensuite la fait entrer dans la vérification.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type SourceOuverte = { service: string; libelle: string; chemin: string };

export type ResultatDeRecherche = {
  nature: string;
  identifiant: string;
  titre: string;
  detail: string | null;
  dossier: string | null;
  /** Chemin d'écran sans préfixe de langue ; `null` si aucun écran ne l'ouvre. */
  lien: string | null;
  pertinence: number;
};

export type ReponseDeRecherche = { service: string; resultats: ResultatDeRecherche[]; tronque: boolean };

const authentifie = { authentifie: true } as const;

export function lireSourcesDeRecherche() {
  return appeler<SourceOuverte[]>("/transverse/services/recherche", authentifie);
}

// ⚠️ `?q=` est écrit en littéral dans chaque appel, et non produit par une aide : l'outil
// de contrat coupe le chemin au premier `?` littéral. Un `${parametre(q)}` collé au chemin
// donnait `/collecte/recherche{}`, que l'outil rattachait à une autre route.
const APPELS: Record<string, (q: string) => Promise<ReponseDeRecherche>> = {
  portefeuille: (q) => appeler<ReponseDeRecherche>(`/portefeuille/recherche?q=${encodeURIComponent(q)}`, authentifie),
  collecte: (q) => appeler<ReponseDeRecherche>(`/collecte/recherche?q=${encodeURIComponent(q)}`, authentifie),
  transverse: (q) => appeler<ReponseDeRecherche>(`/transverse/recherche?q=${encodeURIComponent(q)}`, authentifie),
  souscription: (q) => appeler<ReponseDeRecherche>(`/acquisition/recherche?q=${encodeURIComponent(q)}`, authentifie),
};

/** Interroge une source : par son appel vérifié si l'écran la connaît, sinon par son chemin déclaré. */
export function chercherDans(source: SourceOuverte, q: string): Promise<ReponseDeRecherche> {
  const appel = APPELS[source.service];
  return appel ? appel(q) : appeler<ReponseDeRecherche>(`${source.chemin}?q=${encodeURIComponent(q)}`, authentifie);
}
