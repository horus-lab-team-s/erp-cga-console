import { appeler } from "./api";
import type { AppelDeFonds, MesFondsConfies } from "./fonds-etats";

/** Ce que le cabinet paie pour l'adhérent (mandat), et ses appels de fonds. Hors portée, 404. */
export async function lireLesFondsConfies(niu: string): Promise<MesFondsConfies> {
  return appeler<MesFondsConfies>(`/souscription/fonds-de-tiers/${encodeURIComponent(niu)}`, { authentifie: true });
}

/** Les fonds à recevoir, puis ceux reçus depuis un mois. */
export async function lireLaCaisseDesFonds(): Promise<AppelDeFonds[]> {
  return appeler<AppelDeFonds[]>("/souscription/fonds-de-tiers/caisse", { authentifie: true });
}
