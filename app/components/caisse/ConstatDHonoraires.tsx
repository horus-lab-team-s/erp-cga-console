"use client";

import { startTransition, useActionState } from "react";

import { constaterDesHonoraires } from "@/app/lib/actions-honoraires";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Constater au guichet le règlement d'une période d'honoraires (14 octobre 2026).
 *
 * ⚠️ Le montant n'est pas saisi : c'est celui de l'échéance, affiché dans
 * l'attestation. Le même geste que pour une proposition (`ConstatDeCaisse`).
 */
export function ConstatDHonoraires({ niu, periode, montant }: { niu: string; periode: string; montant: string }) {
  const [etat, constater, enCours] = useActionState(constaterDesHonoraires, ETAT_ACTE_INITIAL);

  if (etat.fait) {
    return (
      <p role="status" className="caisse__fait">
        {etat.fait}
      </p>
    );
  }

  function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    startTransition(() => constater(donnees));
  }

  return (
    <form action={constater} onSubmit={soumettre} className="caisse__constat">
      <input type="hidden" name="niu" value={niu} />
      <input type="hidden" name="periode" value={periode} />
      <label className="caisse__etiquette">
        Référence du reçu
        <input name="reference_externe" maxLength={120} required className="caisse__champ" />
      </label>
      <label className="caisse__attestation">
        <input type="checkbox" name="rapproche" value="oui" required />
        <span>J&rsquo;ai constaté le versement de {montant}.</span>
      </label>
      <button type="submit" className="bouton-primaire" disabled={enCours}>
        {enCours ? "…" : "Encaisser"}
      </button>
      {etat.echec && (
        <p role="alert" className="caisse__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
