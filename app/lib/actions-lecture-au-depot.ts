"use server";

/** La lecture au dépôt (18 octobre 2026, point 13) : l'interrupteur du cabinet, l'accord de l'adhérent. */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

export async function reglerLaLectureAuDepot(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const actif = donnees.get("actif") === "oui";
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Le motif s'écrit en dix caractères au moins.", fait: null };
  try {
    await appeler("/collecte/lecture-au-depot", { methode: "PUT", authentifie: true, corps: { actif, motif } });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/pieces", "page");
  return {
    echec: null,
    fait: actif
      ? "Lecture au dépôt activée : elle lit les pièces des adhérents qui y consentent."
      : "Lecture au dépôt coupée : plus aucun document ne part chez l'agent.",
  };
}

export async function donnerMonAccordDeLecture(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const niu = String(donnees.get("niu") ?? "");
  const accorde = donnees.get("accorde") === "oui";
  try {
    await appeler(`/collecte/dossiers/${encodeURIComponent(niu)}/consentement-de-lecture`, {
      methode: "PUT",
      authentifie: true,
      corps: { accorde },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/mon-espace/reglages", "page");
  return {
    echec: null,
    fait: accorde
      ? "Merci : vos prochaines pièces seront lues dès leur dépôt."
      : "C'est noté : vos pièces ne seront plus lues automatiquement.",
  };
}
