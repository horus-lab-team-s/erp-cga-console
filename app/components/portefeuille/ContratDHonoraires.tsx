"use client";

import { startTransition, useActionState } from "react";

import { fixerLeContratDHonoraires } from "@/app/lib/actions-honoraires";
import type { ContratDHonoraires as Contrat } from "@/app/lib/honoraires-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Fixer le contrat d'honoraires d'un adhérent (14 octobre 2026). La direction seule
 * (`FIXER_LES_TARIFS`) : un montant d'honoraires engage le cabinet, comme un prix.
 *
 * ⚠️ L'envoi passe par une transition : un refus du serveur ne doit pas effacer
 * ce qui vient d'être saisi (réinitialisation des formulaires de React 19).
 */
export function FixerLeContrat({ niu, actuel }: { niu: string; actuel: Contrat | null }) {
  const [etat, fixer, enCours] = useActionState(fixerLeContratDHonoraires, ETAT_ACTE_INITIAL);

  function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    startTransition(() => fixer(donnees));
  }

  return (
    <form action={fixer} onSubmit={soumettre} className="contrat-honoraires">
      <input type="hidden" name="niu" value={niu} />
      <label>
        Montant par période (FCFA)
        <input name="montant" inputMode="numeric" required defaultValue={actuel ? String(Math.round(Number(actuel.montant))) : ""} />
      </label>
      <label>
        Périodicité
        <select name="periodicite" defaultValue={actuel?.periodicite ?? "MENSUELLE"}>
          <option value="MENSUELLE">Mensuelle</option>
          <option value="TRIMESTRIELLE">Trimestrielle</option>
          <option value="ANNUELLE">Annuelle</option>
        </select>
      </label>
      <label>
        Début de la première période
        <input type="date" name="debut" required defaultValue={actuel?.debut ?? ""} />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : actuel ? "Modifier le contrat" : "Enregistrer le contrat"}
      </button>
      {etat.echec && (
        <p role="alert" className="contrat-honoraires__retour" data-ton="echec">
          {etat.echec}
        </p>
      )}
      {etat.fait && (
        <p role="status" className="contrat-honoraires__retour">
          {etat.fait}
        </p>
      )}
    </form>
  );
}
