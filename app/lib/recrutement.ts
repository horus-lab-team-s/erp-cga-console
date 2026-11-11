import { appeler } from "./api";
import type { Candidature, OffreDuCabinet } from "./recrutement-etats";

/** Les offres de poste du cabinet, brouillons compris (16 octobre 2026). */
export function lireLesOffresDuCabinet(): Promise<OffreDuCabinet[]> {
  return appeler<OffreDuCabinet[]>("/vitrine/cabinet/offres", { authentifie: true });
}

export function lireLesCandidatures(offre: string): Promise<Candidature[]> {
  return appeler<Candidature[]>(`/vitrine/cabinet/offres/${encodeURIComponent(offre)}/candidatures`, {
    authentifie: true,
  });
}
