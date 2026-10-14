"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { demanderLeDebit } from "@/app/lib/actions-honoraires";
import { DEBIT_INITIAL } from "@/app/lib/honoraires-etats";

/**
 * Régler une période d'honoraires par mobile money (14 octobre 2026).
 *
 * ⚠️ UN CLIC N'EST PAS UN PAIEMENT. Le bouton demande à l'opérateur de pousser la
 * demande sur le téléphone ; l'adhérent valide avec son code ; la notification
 * de l'opérateur règle la période. L'écran le dit, puis se relit toutes les huit
 * secondes pendant deux minutes : la ligne passe à « Réglée » sans qu'il ait à
 * recharger.
 *
 * ⚠️ Sans identifiants marchands, la plateforme est en mode simulé : aucun débit
 * n'est demandé, et l'écran le dit au lieu de laisser attendre.
 */
export function ReglerUnePeriode({
  niu,
  periode,
  montant,
  telephone,
}: {
  niu: string;
  periode: string;
  montant: string;
  telephone: string | null;
}) {
  const [etat, demander, enCours] = useActionState(demanderLeDebit, DEBIT_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!etat.demande) return;
    let tours = 0;
    const minuterie = setInterval(() => {
      tours += 1;
      router.refresh();
      if (tours >= 15) clearInterval(minuterie);
    }, 8000);
    return () => clearInterval(minuterie);
  }, [etat.demande, router]);

  if (etat.demande) {
    return (
      <p role="status" className="honoraires__attente">
        {etat.demande.simule
          ? "Démonstration : aucun débit réel n'est demandé, la plateforme n'a pas encore ses identifiants marchands."
          : `Validez le paiement sur votre téléphone (${etat.demande.telephone}). Cette page se met à jour toute seule.`}
      </p>
    );
  }
  if (!ouvert) {
    return (
      <button type="button" className="honoraires__payer" onClick={() => setOuvert(true)}>
        Payer {montant} par mobile money
      </button>
    );
  }
  return (
    <form action={demander} className="honoraires__formulaire">
      <input type="hidden" name="niu" value={niu} />
      <input type="hidden" name="periode" value={periode} />
      <label className="honoraires__etiquette">
        Numéro mobile money à débiter
        <input
          name="telephone"
          type="tel"
          inputMode="tel"
          defaultValue={telephone ?? ""}
          required
          className="honoraires__champ"
        />
      </label>
      <button type="submit" className="honoraires__payer" disabled={enCours}>
        {enCours ? "Envoi de la demande…" : `Recevoir la demande de ${montant}`}
      </button>
      {etat.echec && (
        <p role="alert" className="honoraires__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
