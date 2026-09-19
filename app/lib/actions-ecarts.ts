"use server";

/**
 * Les gestes sur un écart de constat (pas 92) : proposer, trancher, lever.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE NAVIGATEUR N'ENVOIE QUE CE QUE LA PERSONNE A DÉCIDÉ
 *
 * La référence de la pièce, la règle visée, la décision et le motif. Jamais le
 * constat, jamais son enjeu : le backend recalcule le rapport au moment du geste,
 * et c'est le constat qu'il produit **alors** qui est écarté. Un écran resté ouvert
 * depuis la veille ne fait pas écarter un montant qui a changé.
 *
 * ⚠️ AUCUN GESTE NE SE FAIT SANS MOTIF
 *
 * `ECARTER_CONSTAT` figure dans `EXIGE_MOTIF` côté backend. Le plancher de dix
 * caractères est vérifié ici pour éviter un aller-retour, la longueur vraie est
 * celle de la politique du cabinet, vérifiée là-bas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, type EtatDUnEcart } from "./api";
import type { EtatActe } from "./saisie";

function rafraichir() {
  revalidatePath("/[locale]/pieces/[reference]", "page");
  revalidatePath("/[locale]/pieces", "page");
}

function lire(donnees: FormData, nom: string): string {
  return String(donnees.get(nom) ?? "").trim();
}

async function geste(appel: () => Promise<EtatDUnEcart>, fait: (e: EtatDUnEcart) => string): Promise<EtatActe> {
  try {
    const etat = await appel();
    rafraichir();
    return { echec: null, fait: fait(etat) };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function ecarterUnConstat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = lire(donnees, "reference");
  const code_regle = lire(donnees, "code_regle");
  const motif = lire(donnees, "motif");
  const piece_appui = lire(donnees, "piece_appui");
  if (!code_regle) return { echec: "Choisir le constat à écarter.", fait: null };
  if (motif.length < 10) return { echec: "Le motif doit compter au moins 10 caractères.", fait: null };
  return geste(
    () =>
      appeler<EtatDUnEcart>(`/conformite/pieces/${encodeURIComponent(reference)}/ecarts`, {
        methode: "POST",
        authentifie: true,
        corps: piece_appui ? { code_regle, motif, piece_appui } : { code_regle, motif },
      }),
    (e) =>
      e.ecart.statut === "EN_ATTENTE"
        ? `Écart ${e.ecart.identifiant} proposé : le constat compte jusqu'au second regard.`
        : `Constat ${e.ecart.code_regle} écarté (${e.ecart.identifiant}).`,
  );
}

export async function donnerLeSecondRegard(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = lire(donnees, "reference");
  const identifiant = lire(donnees, "identifiant");
  const decision = lire(donnees, "decision");
  const motif = lire(donnees, "motif");
  if (decision !== "CONFIRMER" && decision !== "REFUSER") {
    return { echec: "Choisir de confirmer ou de refuser l'écart.", fait: null };
  }
  if (motif.length < 10) return { echec: "Le motif doit compter au moins 10 caractères.", fait: null };
  return geste(
    () =>
      appeler<EtatDUnEcart>(
        `/conformite/pieces/${encodeURIComponent(reference)}/ecarts/${encodeURIComponent(identifiant)}/second-regard`,
        { methode: "POST", authentifie: true, corps: { decision, motif } },
      ),
    (e) => (e.ecart.statut === "EFFECTIF" ? `Écart ${e.ecart.identifiant} confirmé.` : `Écart ${e.ecart.identifiant} refusé.`),
  );
}

export async function leverUnEcart(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = lire(donnees, "reference");
  const identifiant = lire(donnees, "identifiant");
  const motif = lire(donnees, "motif");
  if (motif.length < 10) return { echec: "Le motif doit compter au moins 10 caractères.", fait: null };
  return geste(
    () =>
      appeler<EtatDUnEcart>(
        `/conformite/pieces/${encodeURIComponent(reference)}/ecarts/${encodeURIComponent(identifiant)}/levee`,
        { methode: "POST", authentifie: true, corps: { motif } },
      ),
    (e) => `Écart ${e.ecart.identifiant} levé : le constat ${e.ecart.code_regle} compte de nouveau.`,
  );
}

/**
 * Joindre la pièce d'appui d'une dérogation (pas 118, maquette réviseur vue B).
 *
 * Le motif dit ce que le cabinet a vérifié ; la pièce d'appui est ce qu'il montrera au
 * vérificateur. Elle se joint après coup, parce qu'elle arrive souvent après la décision.
 */
export async function joindreLaPieceDAppui(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = lire(donnees, "reference");
  const identifiant = lire(donnees, "identifiant");
  const piece = lire(donnees, "piece");
  if (!identifiant || !reference) return { echec: "Dérogation non désignée.", fait: null };
  if (piece.length < 3) {
    return { echec: "Désignez la pièce : l'identifiant d'une pièce du dossier, ou la référence du document conservé.", fait: null };
  }
  return geste(
    () =>
      appeler<EtatDUnEcart>(
        `/conformite/pieces/${encodeURIComponent(reference)}/ecarts/${encodeURIComponent(identifiant)}/piece-appui`,
        { methode: "POST", authentifie: true, corps: { piece } },
      ),
    (e) => `Pièce d'appui « ${e.ecart.piece_appui} » jointe à la dérogation ${e.ecart.identifiant}.`,
  );
}
