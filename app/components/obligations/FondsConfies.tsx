"use client";

import { startTransition, useActionState } from "react";

import { reverserAvecQuittance } from "@/app/lib/actions-collecte";
import { arreterUnAppel } from "@/app/lib/actions-fonds";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";
import { ChampFichier } from "@/app/components/ChampFichier";

/**
 * Les deux gestes du comptable sur une échéance que le cabinet paie pour l'adhérent
 * (14 octobre 2026) : arrêter le montant à appeler, puis porter la quittance de
 * l'administration une fois les fonds reçus et reversés.
 *
 * ⚠️ Envois par transition : un refus du serveur n'efface pas ce qui vient d'être saisi.
 */
function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <p role="alert" className="fonds-confies__retour" data-ton="echec">{etat.echec}</p>;
  if (etat.fait) return <p role="status" className="fonds-confies__retour">{etat.fait}</p>;
  return null;
}

function envoyer(action: (d: FormData) => void) {
  return (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    startTransition(() => action(donnees));
  };
}

export function ArreterUnAppel({
  niu,
  codeObligation,
  libelle,
  periodeDebut,
  periodeFin,
  estime,
}: {
  niu: string;
  codeObligation: string;
  libelle: string;
  periodeDebut: string;
  periodeFin: string;
  estime: string | null;
}) {
  const [etat, arreter, enCours] = useActionState(arreterUnAppel, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={arreter} onSubmit={envoyer(arreter)} className="fonds-confies">
      <input type="hidden" name="niu" value={niu} />
      <input type="hidden" name="code_obligation" value={codeObligation} />
      <input type="hidden" name="libelle" value={libelle} />
      <input type="hidden" name="periode_debut" value={periodeDebut} />
      <input type="hidden" name="periode_fin" value={periodeFin} />
      <label>
        Montant à appeler (FCFA)
        <input name="montant" inputMode="numeric" required defaultValue={estime ?? ""} />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Arrêter le montant"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function PorterLaQuittance({ niu, appel }: { niu: string; appel: string }) {
  const [etat, reverser, enCours] = useActionState(reverserAvecQuittance, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={reverser} onSubmit={envoyer(reverser)} className="fonds-confies">
      <input type="hidden" name="dossier" value={niu} />
      <input type="hidden" name="appel" value={appel} />
      <label>
        Quittance de l&rsquo;administration
        <ChampFichier name="fichier" required accept="image/jpeg,image/png,image/tiff,application/pdf" />
      </label>
      <button type="submit" className="bouton-primaire" disabled={enCours}>
        {enCours ? "…" : "Porter la quittance : payée"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}
