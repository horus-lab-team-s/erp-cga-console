"use client";

import { startTransition, useActionState, useState } from "react";

import { jugerLaQuittance } from "@/app/lib/actions-obligations";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Valider ou refuser la quittance de l'adhérent (14 octobre 2026).
 *
 * ⚠️ Le refus ouvre un champ de motif, exigé : c'est la phrase que l'adhérent lira. L'envoi passe
 * par une transition pour que le motif ne s'efface pas si le serveur refuse.
 */
export function JugerLaQuittance({
  dossier,
  codeObligation,
  periodeDebut,
  piece,
}: {
  dossier: string;
  codeObligation: string;
  periodeDebut: string;
  piece: string;
}) {
  const [etat, juger, enCours] = useActionState(jugerLaQuittance, ETAT_ACTE_INITIAL);
  const [refuser, setRefuser] = useState(false);

  if (etat.fait) {
    return (
      <p role="status" style={{ margin: 0, color: "var(--success)", font: "500 12.5px/1.4 var(--police-texte)" }}>
        {etat.fait}
      </p>
    );
  }

  function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    const bouton = (evenement.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (bouton?.name === "verdict") donnees.set("verdict", bouton.value);
    startTransition(() => juger(donnees));
  }

  return (
    <form action={juger} onSubmit={soumettre} className="juger-quittance">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="code_obligation" value={codeObligation} />
      <input type="hidden" name="periode_debut" value={periodeDebut} />
      <input type="hidden" name="piece" value={piece} />
      {refuser ? (
        <>
          <label className="juger-quittance__motif">
            Motif du refus, lu par l&rsquo;adhérent
            <input name="motif" maxLength={500} required placeholder="Quittance de juin, pas de juillet." />
          </label>
          <button type="submit" name="verdict" value="REFUSEE" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Refuser la quittance"}
          </button>
          <button type="button" className="bouton-discret" onClick={() => setRefuser(false)}>
            Annuler
          </button>
        </>
      ) : (
        <>
          <button type="submit" name="verdict" value="VALIDEE" className="bouton-primaire" disabled={enCours}>
            {enCours ? "…" : "Valider : payée"}
          </button>
          <button type="button" className="bouton-discret" onClick={() => setRefuser(true)}>
            Refuser…
          </button>
        </>
      )}
      {etat.echec && (
        <p role="alert" className="juger-quittance__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
