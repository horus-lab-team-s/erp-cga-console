"use server";

/**
 * Éprouver les règles sur une facture (pas 90).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE N'EST PAS UN CONTRÔLE DE PIÈCE
 *
 * La facture est écrite à la main dans l'écran du référentiel, à partir d'une facture de
 * démonstration : on change le mode de règlement, un montant, le NIU du fournisseur, et
 * l'on voit quelle règle réagit. Rien n'est enregistré : `POST /conformite/controler`
 * rend un rapport et n'écrit rien.
 *
 * ⚠️ LE PÉRIMÈTRE RESTE CELUI DE LA SESSION
 *
 * Une facture dont le destinataire est un dossier que l'on ne suit pas est refusée par le
 * backend, qui le contrôle : l'essai ne sert pas à lire, par le rapport, les montants d'un
 * dossier d'autrui.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler, ErreurApi, type ReponseControle } from "./api";

export type EtatEssai = { echec: string | null; reponse: ReponseControle | null };

export async function eprouverSurUneFacture(_precedent: EtatEssai, donnees: FormData): Promise<EtatEssai> {
  const texte = String(donnees.get("facture") ?? "");
  const aLaDate = String(donnees.get("a_la_date") ?? "").trim();
  let facture: unknown;
  try {
    facture = JSON.parse(texte);
  } catch (erreur) {
    return { echec: `La facture n'est pas du JSON lisible : ${(erreur as Error).message}`, reponse: null };
  }
  const requete = aLaDate ? `?a_la_date=${encodeURIComponent(aLaDate)}` : "";
  try {
    const reponse = await appeler<ReponseControle>(`/conformite/controler${requete}`, {
      methode: "POST",
      authentifie: true,
      corps: facture,
    });
    return { echec: null, reponse };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, reponse: null };
    throw erreur;
  }
}
