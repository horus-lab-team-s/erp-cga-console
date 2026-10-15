import { appeler } from "./api";
import type { Mission } from "./missions-etats";

export type { Mission } from "./missions-etats";

export async function lireMissions(): Promise<Mission[]> {
  return appeler<Mission[]>("/missions", { authentifie: true });
}

export async function lireMission(identifiant: string): Promise<Mission> {
  return appeler<Mission>(`/missions/${encodeURIComponent(identifiant)}`, { authentifie: true });
}

export async function lectureAutomatiqueDisponible(): Promise<boolean> {
  return (await appeler<{ disponible: boolean }>("/missions/lecture-automatique", { authentifie: true })).disponible;
}
