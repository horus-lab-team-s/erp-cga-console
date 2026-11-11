import { appeler, ErreurApi } from "./api";
import type { AccordDuDossier, EtatDeLaLecture, LecturePreparee } from "./lecture-au-depot-etats";

export function lireLaLectureAuDepot(): Promise<EtatDeLaLecture> {
  return appeler<EtatDeLaLecture>("/collecte/lecture-au-depot", { authentifie: true });
}

export function lireMonAccordDeLecture(niu: string): Promise<AccordDuDossier> {
  return appeler<AccordDuDossier>(`/collecte/dossiers/${encodeURIComponent(niu)}/consentement-de-lecture`, {
    authentifie: true,
  });
}

/** La lecture préparée d'une pièce, ou `null` si l'agent ne l'a pas lue. */
export async function lireLaLecturePreparee(piece: string): Promise<LecturePreparee | null> {
  try {
    return await appeler<LecturePreparee>(`/collecte/pieces/${encodeURIComponent(piece)}/lecture-preparee`, {
      authentifie: true,
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi && erreur.statut === 404) return null;
    throw erreur;
  }
}
