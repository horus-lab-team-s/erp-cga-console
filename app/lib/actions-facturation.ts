"use server";

/** Saisir l'identité fiscale du cabinet, quand la direction l'a (18 octobre 2026). */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { IdentiteLue } from "./facturation-etats";
import type { EtatActe } from "./saisie";

export async function saisirLIdentiteFiscale(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const texte = (nom: string) => String(donnees.get(nom) ?? "").trim() || null;
  const regime = texte("regime_tva");
  const assujetti = regime === "ASSUJETTI";
  try {
    const r = await appeler<IdentiteLue>("/souscription/facturation/identite-fiscale", {
      methode: "PUT",
      authentifie: true,
      corps: {
        niu: texte("niu"),
        rccm: texte("rccm"),
        regime_tva: regime,
        // Ce qui ne vaut que pour un autre régime ne part pas : le serveur le refuserait.
        taux_tva: assujetti ? texte("taux_tva")?.replace(",", ".") ?? null : null,
        montants_convenus: assujetti ? texte("montants_convenus") : null,
        fondement_exoneration: regime === "EXONERE" ? texte("fondement_exoneration") : null,
      },
    });
    revalidatePath("/[locale]/tarifs", "page");
    return {
      echec: null,
      fait: r.complete
        ? "Identité enregistrée : les factures définitives s'émettent."
        : `Enregistré. Il manque encore ${r.manques.join(", ")}.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
