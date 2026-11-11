/** Lectures serveur des documents à échéance et des expirations (lot 4, 9 novembre 2026). */

import { appeler } from "./api";
import type { CatalogueDesDocuments, DocumentsDuDossier, Expiration } from "./documents-a-echeance-etats";

const authentifie = { authentifie: true } as const;

export function lireLeCatalogueDesDocuments() {
  return appeler<CatalogueDesDocuments>("/portefeuille/documents-a-echeance/catalogue", authentifie);
}

export function lireLesDocumentsAEcheance(niu: string) {
  return appeler<DocumentsDuDossier>(
    `/portefeuille/entreprises/${encodeURIComponent(niu)}/documents-a-echeance`,
    authentifie,
  );
}

export function lireLesExpirations() {
  return appeler<{ a_la_date: string; tout_le_cabinet: boolean; expirations: Expiration[] }>(
    "/pilotage/expirations",
    authentifie,
  );
}
