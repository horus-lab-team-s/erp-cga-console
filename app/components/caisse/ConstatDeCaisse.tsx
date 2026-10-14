"use client";

import { startTransition, useActionState } from "react";

import { confirmerLEncaissement } from "@/app/lib/actions-acquisition";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Le constat d'un versement reçu au guichet ou par virement.
 *
 * ⚠️ DEUX CHOSES, ET RIEN D'AUTRE : la référence du reçu, et l'attestation.
 *
 * La référence est ce que le rapprochement cherchera. L'attestation engage le
 * nom de celle qui encaisse, et elle est tracée. Tout le reste est déjà connu :
 * le montant vient de la proposition acceptée, le client de sa demande. Lui
 * redemander l'un ou l'autre serait une seconde saisie, donc une seconde chance
 * de se tromper sur ce que le client a réellement payé.
 *
 * ⚠️ L'envoi passe par une transition : après un refus du serveur, la référence
 * saisie reste dans le champ au lieu d'être effacée par la réinitialisation du
 * formulaire.
 */
export function ConstatDeCaisse({ numero, montant }: { numero: string; montant: string }) {
  const [etat, confirmer, enCours] = useActionState(confirmerLEncaissement, ETAT_ACTE_INITIAL);

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
    startTransition(() => confirmer(donnees));
  }

  return (
    <form action={confirmer} onSubmit={soumettre} className="caisse__constat">
      <input type="hidden" name="numero" value={numero} />
      <input type="hidden" name="sans_espace" value="oui" />
      <label className="caisse__etiquette">
        Référence du reçu ou du virement
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
