"use client";

import { useActionState, useEffect, useRef } from "react";

import { envoyerUnePreuveDePaiement } from "@/app/lib/actions-collecte";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * « J'ai déjà payé : envoyer la preuve » (pas 113, maquette « Espace adhérent », vue D, note 5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * « J'ai déjà payé couvre le règlement au guichet : l'adhérent photographie la quittance, elle
 * rejoint le dossier. » Un seul champ, le document ; l'échéance est posée par la carte.
 *
 * ⚠️ Le formulaire se vide après un envoi réussi : une seconde preuve ne doit pas renvoyer la même
 * photo par inadvertance (le backend la refuserait d'ailleurs pour la même échéance).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EnvoyerLaPreuve({ dossier, echeance }: { dossier: string; echeance: string }) {
  const [etat, agir, enCours] = useActionState(envoyerUnePreuveDePaiement, ETAT_ACTE_INITIAL);
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (etat.fait) formulaire.current?.reset();
  }, [etat]);
  return (
    <form ref={formulaire} action={agir} className="adherent__depot" aria-label="Envoyer la preuve de paiement">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="echeance" value={echeance} />
      <label>
        La quittance ou le reçu de paiement
        <input type="file" name="fichier" accept="image/*,application/pdf" required className="adherent__file" />
      </label>
      <small>Photo ou PDF, 20 Mo au plus. Le cabinet la vérifie, puis la joint à la déclaration.</small>
      <button type="submit" className="adherent__depot-envoyer" disabled={enCours}>
        {enCours ? "Envoi…" : "J'ai déjà payé : envoyer la preuve"}
      </button>
      {(etat.echec || etat.fait) && (
        <p className="adherent__depot-retour" data-ton={etat.echec ? "echec" : "fait"} role="status">
          {etat.echec ?? etat.fait}
        </p>
      )}
    </form>
  );
}
