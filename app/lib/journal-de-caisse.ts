import { appeler } from "./api";
import type { JournalDeCaisse, NotificationNonRattachee } from "./journal-de-caisse-etats";

/** Le journal de caisse, sur une période ; le serveur ne rend que les familles visibles. */
export function lireLeJournalDeCaisse(du?: string, au?: string): Promise<JournalDeCaisse> {
  const params = new URLSearchParams();
  if (du) params.set("du", du);
  if (au) params.set("au", au);
  return appeler<JournalDeCaisse>(`/souscription/caisse/journal?${params}`, { authentifie: true });
}

/** Les notifications Tara que rien n'attendait : à traiter à la main. */
export function lireLesNonRattaches(): Promise<NotificationNonRattachee[]> {
  return appeler<NotificationNonRattachee[]>("/souscription/caisse/non-rattaches", { authentifie: true });
}
