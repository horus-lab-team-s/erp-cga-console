import { appeler } from "./api";
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
