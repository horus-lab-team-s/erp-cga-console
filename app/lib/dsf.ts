import { appeler } from "./api";
import type { PiecesDeLaDsf } from "./pieces-dsf-etats";
import type { VersionDsf } from "./dsf-etats";

export type { EtatDsf, VersionDsf } from "./dsf-etats";
export { LIBELLES_ETAT_DSF } from "./dsf-etats";

export async function lireLesVersionsDsf(niu: string, exercice: string): Promise<VersionDsf[]> {
  const r = await appeler<{ versions: VersionDsf[] }>(
    `/cloture/dossiers/${encodeURIComponent(niu)}/dsf/${encodeURIComponent(exercice)}`,
    { authentifie: true },
  );
  return r.versions;
}

/** La DSF au format DGI : prête ou non, et pourquoi (15 octobre 2026). Voir `routes_dsf.py`. */
export type FormatDgi = {
  pret: boolean;
  obstacles: string[];
  avertissements: string[];
  nom_du_fichier: string;
  total_bilan: string;
  resultat: string;
  avec_exercice_precedent: boolean;
};

export async function lireLeFormatDgi(niu: string, exercice: string): Promise<FormatDgi> {
  return appeler<FormatDgi>(
    `/cloture/dossiers/${encodeURIComponent(niu)}/dsf/${encodeURIComponent(exercice)}/format-dgi`,
    { authentifie: true },
  );
}

/** Les pièces à joindre à la DSF selon le guide de la DGI, et ce qui manque (15 octobre 2026). */
export function lireLesPiecesDsf(niu: string, exercice: string) {
  return appeler<PiecesDeLaDsf>(
    `/cloture/dossiers/${encodeURIComponent(niu)}/dsf/${encodeURIComponent(exercice)}/pieces-jointes`,
    { authentifie: true },
  );
}
