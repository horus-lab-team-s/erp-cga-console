"use server";

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { FactureSaisie, LectureProposee, PropositionDeLaPiece } from "./facture-etats";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; echec: string };

async function essayer<T>(appel: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, valeur: await appel() };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { ok: false, echec: erreur.message };
    throw erreur;
  }
}

/**
 * Lire automatiquement la facture d'une pièce (14 octobre 2026). ⚠️ Le document part à l'API
 * d'Anthropic ; rien n'est enregistré : les valeurs reviennent préremplir le formulaire.
 */
export async function lireAutomatiquement(identifiant: string): Promise<Resultat<LectureProposee>> {
  return essayer(() =>
    appeler<LectureProposee>(`/collecte/pieces/${encodeURIComponent(identifiant)}/lecture-automatique`, {
      methode: "POST",
      authentifie: true,
    }),
  );
}

/** Enregistrer la facture confirmée : la pièce devient une facture d'achat lue. */
export async function enregistrerLaFacture(identifiant: string, facture: FactureSaisie): Promise<Resultat<null>> {
  const r = await essayer(() =>
    appeler(`/collecte/pieces/${encodeURIComponent(identifiant)}/facture`, {
      methode: "POST",
      authentifie: true,
      corps: facture,
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/[locale]/pieces", "page");
  return { ok: true, valeur: null };
}

/** Proposer l'écriture de la pièce : contrôle de conformité et imputation, sans rien écrire. */
export async function proposerLEcriture(dossier: string, identifiant: string): Promise<Resultat<PropositionDeLaPiece>> {
  return essayer(() =>
    appeler<PropositionDeLaPiece>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/pieces/${encodeURIComponent(identifiant)}/proposition`,
      { methode: "POST", authentifie: true, corps: {} },
    ),
  );
}

/**
 * Enregistrer la proposition en brouillon. ⚠️ On repropose côté serveur plutôt que de renvoyer
 * la saisie reçue de l'écran : un brouillon s'écrit depuis la facture enregistrée, jamais depuis
 * ce qu'un navigateur prétend avoir affiché.
 */
export async function enregistrerLeBrouillon(
  dossier: string,
  identifiant: string,
): Promise<Resultat<{ journal: string; exercice: string; numero: number }>> {
  const proposition = await proposerLEcriture(dossier, identifiant);
  if (!proposition.ok) return proposition;
  if (!proposition.valeur.comptabilisable || !proposition.valeur.saisie) {
    return { ok: false, echec: proposition.valeur.empechements.join(" ") || "Pièce non comptabilisable." };
  }
  const saisie = proposition.valeur.saisie;
  const r = await essayer(() =>
    appeler<{ journal: string; exercice: string; numero: number }>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures`,
      { methode: "POST", authentifie: true, corps: saisie },
    ),
  );
  if (r.ok) revalidatePath("/[locale]/comptabilite/saisie", "page");
  return r;
}
