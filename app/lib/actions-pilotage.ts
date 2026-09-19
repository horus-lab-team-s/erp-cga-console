"use server";

/**
 * Décider une mesure sur un dossier à risque, et la clore (pas 100).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'ÉCRAN NE TRANSMET PAS : LE SCORE
 *
 * Le backend recalcule le score à l'instant de la décision. L'écran n'envoie que la
 * mesure, le motif et l'échéance : une vue ouverte depuis la veille montrerait un niveau
 * qui n'est peut-être plus le bon, et la décision serait fondée sur un état disparu.
 *
 * Le motif est vérifié ici aussi (longueur), pour épargner un aller-retour ; la règle
 * qui fait foi reste celle du backend, lue au catalogue du cabinet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { DecisionLue } from "./pilotage";
import type { EtatActe } from "./saisie";

function rafraichir() {
  // La vue risque, et la fiche adhérent où la décision est aussi lisible.
  revalidatePath("/[locale]/pilotage/[niu]", "page");
  revalidatePath("/[locale]/portefeuille/[niu]", "page");
}

export async function deciderUneMesure(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = String(donnees.get("niu") ?? "");
  const mesure = String(donnees.get("mesure") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  const echeance = String(donnees.get("echeance") ?? "").trim();
  const minimum = Number(donnees.get("motif_minimum") ?? 20);
  if (motif.length < minimum) {
    return { echec: `Écrivez pourquoi (${minimum} caractères au moins) : le motif se relit en comité.`, fait: null };
  }
  try {
    const lue = await appeler<DecisionLue>(`/pilotage/dossiers/${encodeURIComponent(niu)}/decisions`, {
      methode: "POST",
      authentifie: true,
      corps: { mesure, motif, echeance: echeance || null },
    });
    rafraichir();
    return { echec: null, fait: `« ${lue.decision.libelle} » décidée et inscrite au journal.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function cloreUneDecision(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = String(donnees.get("niu") ?? "");
  const identifiant = String(donnees.get("identifiant") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  const minimum = Number(donnees.get("motif_minimum") ?? 20);
  if (motif.length < minimum) {
    return { echec: `Dites pourquoi la mesure est close (${minimum} caractères au moins).`, fait: null };
  }
  try {
    await appeler<DecisionLue>(
      `/pilotage/dossiers/${encodeURIComponent(niu)}/decisions/${encodeURIComponent(identifiant)}/cloture`,
      { methode: "POST", authentifie: true, corps: { motif } },
    );
    rafraichir();
    return { echec: null, fait: "Mesure close. Elle reste lisible dans l'histoire du dossier." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
