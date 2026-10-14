import { appeler } from "./api";
import type { LigneDeCaisseHonoraires, MesHonoraires } from "./honoraires-etats";

/** Le contrat et l'échéancier d'un dossier. L'adhérent lit le sien ; hors portée, 404. */
export async function lireLesHonoraires(niu: string): Promise<MesHonoraires> {
  return appeler<MesHonoraires>(`/souscription/honoraires/${encodeURIComponent(niu)}`, { authentifie: true });
}

/** Ce qui est dû (en retard d'abord), puis ce qui a été réglé depuis un mois. */
export async function lireLaCaisseDesHonoraires(): Promise<LigneDeCaisseHonoraires[]> {
  return appeler<LigneDeCaisseHonoraires[]>("/souscription/honoraires/caisse", { authentifie: true });
}
