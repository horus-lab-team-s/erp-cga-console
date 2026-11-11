"use server";

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatDebit } from "./honoraires-etats";
import type { EtatActe } from "./saisie";

const champ = (donnees: FormData, cle: string) => String(donnees.get(cle) ?? "").trim();

/**
 * L'adhérent demande le débit de son mobile money pour une période (14 octobre 2026).
 *
 * ⚠️ RIEN N'EST RÉGLÉ ICI : l'opérateur pousse la demande sur son téléphone, il valide avec son
 * code, et c'est la notification de l'opérateur qui règle la période. La page se relit seule.
 */
export async function demanderLeDebit(_precedent: EtatDebit, donnees: FormData): Promise<EtatDebit> {
  const niu = champ(donnees, "niu");
  const periode = champ(donnees, "periode");
  const telephone = champ(donnees, "telephone");
  if (!telephone) return { echec: "Indiquez le numéro mobile money à débiter.", demande: null };
  try {
    const demande = await appeler<{ accepte: boolean; message: string; telephone: string; simule: boolean }>(
      `/souscription/honoraires/${encodeURIComponent(niu)}/paiement-en-ligne`,
      { methode: "POST", authentifie: true, corps: { periode, telephone } },
    );
    if (!demande.accepte) return { echec: demande.message, demande: null };
    return { echec: null, demande };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, demande: null };
    throw erreur;
  }
}

/** La responsable de caisse constate un règlement d'honoraires au guichet. Le montant n'est pas saisi. */
export async function constaterDesHonoraires(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = champ(donnees, "niu");
  const periode = champ(donnees, "periode");
  const reference = champ(donnees, "reference_externe");
  if (!reference) return { echec: "Indiquez la référence du reçu.", fait: null };
  if (champ(donnees, "rapproche") !== "oui") return { echec: "Attestez avoir constaté le versement.", fait: null };
  try {
    await appeler(`/souscription/honoraires/${encodeURIComponent(niu)}/encaissement`, {
      methode: "POST",
      authentifie: true,
      corps: { periode, reference_externe: reference },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/caisse", "page");
  return { echec: null, fait: "Encaissé. L'échéance de l'adhérent est réglée." };
}

/** La direction fixe le contrat d'honoraires d'un adhérent. */
export async function fixerLeContratDHonoraires(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = champ(donnees, "niu");
  const montant = champ(donnees, "montant").replace(/\s/g, "");
  if (!/^\d+$/.test(montant) || Number(montant) <= 0) return { echec: "Un montant en francs, sans décimale.", fait: null };
  try {
    await appeler(`/souscription/honoraires/${encodeURIComponent(niu)}/contrat`, {
      methode: "PUT",
      authentifie: true,
      corps: { montant, periodicite: champ(donnees, "periodicite"), debut: champ(donnees, "debut") },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/portefeuille/[niu]", "page");
  return { echec: null, fait: "Contrat enregistré. L'échéancier de l'adhérent suit." };
}
