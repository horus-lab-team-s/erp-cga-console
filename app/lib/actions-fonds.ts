"use server";

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatDebit } from "./honoraires-etats";
import type { EtatActe } from "./saisie";

const champ = (donnees: FormData, cle: string) => String(donnees.get(cle) ?? "").trim();
const base = (niu: string) => `/souscription/fonds-de-tiers/${encodeURIComponent(niu)}`;

/**
 * L'adhérent remet au cabinet, par mobile money, les fonds d'une échéance que le cabinet paie
 * pour lui (14 octobre 2026). ⚠️ Rien n'est reçu ici : c'est la notification de l'opérateur.
 */
export async function confierLesFonds(_precedent: EtatDebit, donnees: FormData): Promise<EtatDebit> {
  const niu = champ(donnees, "niu");
  const appel = champ(donnees, "periode"); // l'identifiant de l'appel, sous le nom du formulaire commun
  const telephone = champ(donnees, "telephone");
  if (!telephone) return { echec: "Indiquez le numéro mobile money à débiter.", demande: null };
  try {
    const demande = await appeler<{ accepte: boolean; message: string; telephone: string; simule: boolean }>(
      `${base(niu)}/appels/${encodeURIComponent(appel)}/paiement-en-ligne`,
      { methode: "POST", authentifie: true, corps: { telephone } },
    );
    if (!demande.accepte) return { echec: demande.message, demande: null };
    return { echec: null, demande };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, demande: null };
    throw erreur;
  }
}

/** La caisse constate les fonds remis au guichet pour l'administration. Le montant n'est pas saisi. */
export async function constaterDesFonds(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = champ(donnees, "reference_externe");
  if (!reference) return { echec: "Indiquez la référence du reçu.", fait: null };
  if (champ(donnees, "rapproche") !== "oui") return { echec: "Attestez avoir constaté le versement.", fait: null };
  try {
    await appeler(`${base(champ(donnees, "niu"))}/appels/${encodeURIComponent(champ(donnees, "appel"))}/encaissement`, {
      methode: "POST",
      authentifie: true,
      corps: { reference_externe: reference },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/caisse", "page");
  return { echec: null, fait: "Fonds reçus. Ils sont à reverser à l'administration : ce ne sont pas des honoraires." };
}

/** Le comptable ou le réviseur arrête le montant à appeler pour une échéance sous mandat. */
export async function arreterUnAppel(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const montant = champ(donnees, "montant").replace(/\s/g, "");
  if (!/^\d+$/.test(montant) || Number(montant) <= 0) return { echec: "Un montant en francs, sans décimale.", fait: null };
  try {
    await appeler(`${base(champ(donnees, "niu"))}/appels`, {
      methode: "POST",
      authentifie: true,
      corps: {
        code_obligation: champ(donnees, "code_obligation"),
        libelle: champ(donnees, "libelle"),
        periode_debut: champ(donnees, "periode_debut"),
        periode_fin: champ(donnees, "periode_fin"),
        montant,
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/obligations", "page");
  return { echec: null, fait: "Montant arrêté : l'adhérent le lit, et peut remettre ses fonds." };
}
