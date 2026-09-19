/**
 * Le catalogue des règles de conformité, lu par le cabinet (pas 90).
 *
 * ⚠️ Réservé au cabinet au backend depuis le pas 90 : le catalogue porte les prédicats
 * exécutables, c'est-à-dire le produit. L'adhérent, qui détient `LIRE_DOSSIER`, le lisait.
 *
 * ⚠️ Le prédicat est affiché tel que le moteur l'exécute (JsonLogic) : c'est la réponse
 * juste à « que vérifie exactement cette règle ? ». Le traduire en français ici ferait une
 * seconde version de la règle, qui divergerait de la première.
 */

import { appeler, type SeveriteApi } from "./api";

export type RegleDuCatalogue = {
  code: string;
  libelle: string;
  categorie: string;
  version: string;
  applicable_du: string;
  applicable_au: string | null;
  severite: SeveriteApi;
  statut: string;
  valide_par: string | null;
  valide_le: string | null;
  fondement: { texte: string; source: string };
  predicat: Record<string, unknown>;
  message: string;
  remediation: string;
};

export function lireCatalogueDesRegles(jour: string) {
  return appeler<RegleDuCatalogue[]>(`/conformite/regles?a_la_date=${encodeURIComponent(jour)}`, { authentifie: true });
}
