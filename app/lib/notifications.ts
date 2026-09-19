/**
 * Les notifications, côté écran (pas 94).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ UNE NOTIFICATION EST UNE LECTURE DU JOURNAL, PAS UN MESSAGE ÉCRIT
 *
 * Le backend lit le journal d'audit à travers les abonnements du référentiel
 * (`Docs/referentiel/notifications/abonnements.yaml`) et rend ce qui concerne la
 * session : sa permission, son périmètre, son compte. L'écran n'en déduit rien. Il
 * affiche, et il avance la position de lecture.
 *
 * `source` dit quel fichier d'abonnements a été lu, ou qu'il n'y en a pas : une cloche
 * muette sur une installation sans abonnements doit se comprendre, pas se déboguer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type Notification = {
  rang: number;
  action: string;
  horodatage: string;
  titre: string;
  texte: string;
  lien: string | null;
  lue: boolean;
};

export type MesNotifications = {
  non_lues: number;
  notifications: Notification[];
  source: string;
  fenetre_jours: number;
};

export function lireMesNotifications() {
  return appeler<MesNotifications>("/transverse/notifications", { authentifie: true });
}
