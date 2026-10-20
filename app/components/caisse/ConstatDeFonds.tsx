"use client";

import { startTransition, useActionState } from "react";

import { constaterDesFonds } from "@/app/lib/actions-fonds";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Constater au guichet les fonds qu'un adhérent remet pour l'administration (14 octobre 2026).
 * ⚠️ Ce ne sont pas des honoraires : le message de fin le rappelle à la caissière.
 */
export function ConstatDeFonds({ niu, appel, montant }: { niu: string; appel: string; montant: string }) {
  const [etat, constater, enCours] = useActionState(constaterDesFonds, ETAT_ACTE_INITIAL);
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
      <input type="hidden" name="appel" value={appel} />
      <label className="caisse__etiquette">
        Référence du reçu
        <input name="reference_externe" maxLength={120} required className="caisse__champ" />
      </label>
      <label className="caisse__attestation">
        <input type="checkbox" name="rapproche" value="oui" required />
        <span>J&rsquo;ai constaté le versement de {montant}, pour l&rsquo;administration.</span>
      </label>
      <button type="submit" className="bouton-primaire" disabled={enCours}>
        {enCours ? "…" : "Recevoir les fonds"}
      </button>
      {etat.echec && (
        <p role="alert" className="caisse__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
