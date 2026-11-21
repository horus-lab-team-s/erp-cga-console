/**
 * Les rendez-vous de création, côté cabinet (9 novembre 2026). Lectures serveur.
 *
 * ⚠️ Les heures sont celles de Douala, sans fuseau : « 2026-11-10T09:00:00 » veut dire
 * mardi 9 h au cabinet, quel que soit le fuseau du navigateur.
 */

import { appeler } from "./api";
import type { AgendaDeCreation, CreneauxProposes, RendezVousDuCabinet } from "./rendez-vous-etats";

const authentifie = { authentifie: true } as const;

export function lireLAgenda() {
  return appeler<{ agenda: AgendaDeCreation; par_defaut: boolean }>("/acquisition/agenda", authentifie);
}

export function lireLesRendezVous() {
  return appeler<RendezVousDuCabinet[]>("/acquisition/rendez-vous", authentifie);
}

export function lireLesCreneauxLibres() {
  return appeler<CreneauxProposes>("/acquisition/rendez-vous/creneaux");
}
