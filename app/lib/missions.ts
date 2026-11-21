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

/** 18 octobre 2026 (point 22) : les demandes ponctuelles payées, sans mission encore. */
export async function lireLesDemandesAOuvrir(): Promise<import("./missions-etats").DemandeAOuvrir[]> {
  return appeler("/missions/a-ouvrir", { authentifie: true });
}

export async function lireLesCandidatsALaMission(
  identifiant: string,
): Promise<import("./missions-etats").CandidatALaMission[]> {
  return appeler(`/missions/${encodeURIComponent(identifiant)}/candidats`, { authentifie: true });
}

/** 18 octobre 2026 (point 23) : les modèles de contrat, d'où partir avec ou sans l'agent. */
export async function lireLesModelesDeContrat(): Promise<import("./missions-etats").ModeleDeContrat[]> {
  return appeler("/missions/modeles-de-contrat", { authentifie: true });
}
