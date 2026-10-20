import { appeler } from "./api";
import type { GraceDeReglement, LigneDeCaisseHonoraires, MesHonoraires, SituationDeReglement } from "./honoraires-etats";

/** Le contrat et l'échéancier d'un dossier. L'adhérent lit le sien ; hors portée, 404. */
export async function lireLesHonoraires(niu: string): Promise<MesHonoraires> {
  return appeler<MesHonoraires>(`/souscription/honoraires/${encodeURIComponent(niu)}`, { authentifie: true });
}

/** Ce qui est dû (en retard d'abord), puis ce qui a été réglé depuis un mois. */
export async function lireLaCaisseDesHonoraires(): Promise<LigneDeCaisseHonoraires[]> {
  return appeler<LigneDeCaisseHonoraires[]>("/souscription/honoraires/caisse", { authentifie: true });
}

/** 18 octobre 2026 : la situation et les grâces d'un dossier. */
export async function lireLesGraces(niu: string): Promise<{ situation: SituationDeReglement; graces: GraceDeReglement[] }> {
  return appeler(`/souscription/honoraires/${encodeURIComponent(niu)}/graces`, { authentifie: true });
}

/** 18 octobre 2026 : qui est en règle, sur la portée du compte ; bloqués d'abord. */
export async function lireLesSituations(): Promise<{ denomination: string; situation: SituationDeReglement }[]> {
  return appeler("/souscription/reglement/situations", { authentifie: true });
}

/** 18 octobre 2026 : la règle de dépassement du cabinet ; `d_office` si aucune n'est fixée. */
export async function lireLaRegleDeDepassement(): Promise<{ regle: { delai_jours: number; motif: string }; d_office: boolean }> {
  return appeler("/souscription/reglement/regle", { authentifie: true });
}
