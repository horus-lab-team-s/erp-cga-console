/** Lecture du registre des immobilisations et du tableau des amortissements (17 octobre 2026). */

import { appeler } from "@/app/lib/api";
import type { Immobilisation, TableauEtDotation } from "@/app/lib/immobilisations-etats";

export type { Immobilisation, TableauEtDotation } from "@/app/lib/immobilisations-etats";

export function lireLeRegistre(dossier: string): Promise<Immobilisation[]> {
  return appeler<Immobilisation[]>(`/comptabilite/dossiers/${encodeURIComponent(dossier)}/immobilisations`, {
    authentifie: true,
  });
}

export function lireLeTableau(dossier: string, exercice: string): Promise<TableauEtDotation> {
  return appeler<TableauEtDotation>(
    `/comptabilite/dossiers/${encodeURIComponent(dossier)}/amortissements/${encodeURIComponent(exercice)}`,
    { authentifie: true },
  );
}
