import { appeler } from "./api";
import type { MaDsf } from "./ma-dsf-etats";

/** Où en est la DSF de chaque exercice clos, et les pièces attendues (18 octobre 2026). */
export function lireMaDsf(niu: string) {
  return appeler<MaDsf>(`/cloture/dossiers/${encodeURIComponent(niu)}/ma-dsf`, { authentifie: true });
}
