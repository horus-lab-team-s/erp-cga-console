import { appeler } from "./api";
import type { VueDeLaFiche } from "./fiche-dsf-etats";

/** La fiche signalétique de la DSF d'un dossier, et ce qui y manque (15 octobre 2026). */
export function lireLaFicheDsf(niu: string) {
  return appeler<VueDeLaFiche>(`/portefeuille/entreprises/${encodeURIComponent(niu)}/fiche-signaletique`, {
    authentifie: true,
  });
}
