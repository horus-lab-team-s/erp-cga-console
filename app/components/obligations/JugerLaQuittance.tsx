"use client";

import { startTransition, useActionState, useState } from "react";

import { enregistrerLEcritureDePaiement, jugerLaQuittance } from "@/app/lib/actions-obligations";
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
  montantAttendu = null,
  validee = null,
}: {
  dossier: string;
  codeObligation: string;
  periodeDebut: string;
  piece: string;
  /**
   * 19 octobre 2026 (point 7) : ce que porte l'accusé de dépôt de l'échéance, s'il est
   * consigné. La quittance s'y compare à la saisie ; un écart demande un mot.
   */
  montantAttendu?: string | null;
  /**
   * 18 octobre 2026 : la quittance est déjà validée, sans écriture de paiement encore. Toute
   * action serveur relit la page, et une quittance validée quittait la liste : son écriture ne
   * se proposait jamais. Elle reste donc au panneau, et n'offre plus que son écriture.
   * `montant` : celui relevé au verdict, s'il l'a été.
   */
  validee?: { montant: string | null; ecriture: string | null } | null;
}) {
  const [etat, juger, enCours] = useActionState(jugerLaQuittance, ETAT_ACTE_INITIAL);
  const [refuser, setRefuser] = useState(false);
  const [montant, setMontant] = useState("");
  const attendu = montantAttendu ? Math.round(Number(montantAttendu)) : null;
  const ecart = attendu !== null && montant ? Number(montant) - attendu : null;
  const ecartAJustifier = ecart !== null && Math.abs(ecart) > 1;

  if (validee?.ecriture) {
    return (
      <p role="status" style={{ margin: 0, color: "var(--success)", font: "500 12.5px/1.4 var(--police-texte)" }}>
        Quittance validée, écriture de paiement passée : {validee.ecriture}, à relire et valider sur l&rsquo;écran
        de saisie.
      </p>
    );
  }
  if (validee) {
    return (
      <>
        <p style={{ margin: 0, color: "var(--success)", font: "500 12.5px/1.4 var(--police-texte)" }}>
          Quittance validée : l&rsquo;adhérent lit « Payée ». Reste son écriture de paiement.
        </p>
        <EcritureDePaiement
          dossier={dossier}
          codeObligation={codeObligation}
          periodeDebut={periodeDebut}
          piece={piece}
          montant={validee.montant ? String(Math.round(Number(validee.montant))) : ""}
        />
      </>
    );
  }

  if (etat.fait) {
    return (
      <>
        <p role="status" style={{ margin: 0, color: "var(--success)", font: "500 12.5px/1.4 var(--police-texte)" }}>
          {etat.fait}
        </p>
        {!refuser && (
          <EcritureDePaiement dossier={dossier} codeObligation={codeObligation} periodeDebut={periodeDebut} piece={piece} montant={montant} />
        )}
      </>
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
          {/* 18 octobre 2026 (point 7) : le montant de la quittance sert son écriture. */}
          <label className="juger-quittance__motif">
            Montant de la quittance (facultatif)
            <input
              name="montant_quittance"
              inputMode="numeric"
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="ex. 84000"
            />
          </label>
          {attendu !== null && (
            <p className="juger-quittance__attendu" style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: ecartAJustifier ? "var(--warning)" : "var(--ink-500)" }}>
              L&rsquo;accusé de dépôt porte {attendu.toLocaleString("fr-FR")} FCFA
              {ecart !== null &&
                (ecartAJustifier
                  ? ` : écart de ${ecart > 0 ? "+" : "−"}${Math.abs(ecart).toLocaleString("fr-FR")} FCFA.`
                  : " : la quittance concorde.")}
            </p>
          )}
          {ecartAJustifier && (
            <label className="juger-quittance__motif">
              Pourquoi la valider malgré l&rsquo;écart ?
              <input name="motif" maxLength={500} required placeholder="Paiement partiel, le solde suit le 30 août." />
            </label>
          )}
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

/**
 * Proposer l'écriture de paiement d'une quittance validée (18 octobre 2026, point 7) : la
 * trésorerie se choisit, le brouillon se valide ensuite sur l'écran de saisie.
 */
function EcritureDePaiement({
  dossier,
  codeObligation,
  periodeDebut,
  piece,
  montant,
}: {
  dossier: string;
  codeObligation: string;
  periodeDebut: string;
  piece: string;
  montant: string;
}) {
  const [etat, enregistrer, enCours] = useActionState(enregistrerLEcritureDePaiement, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return (
      <p role="status" style={{ margin: 0, color: "var(--success)", font: "500 12.5px/1.4 var(--police-texte)" }}>
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={enregistrer} className="juger-quittance">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="code_obligation" value={codeObligation} />
      <input type="hidden" name="periode_debut" value={periodeDebut} />
      <input type="hidden" name="piece" value={piece} />
      {montant ? (
        <input type="hidden" name="montant" value={montant} />
      ) : (
        <label className="juger-quittance__motif">
          Montant payé
          <input name="montant" inputMode="numeric" required />
        </label>
      )}
      <label className="juger-quittance__motif">
        Payé par
        <select name="compte_tresorerie" defaultValue="521">
          <option value="521">la banque (521)</option>
          <option value="5231">le mobile money (5231)</option>
          <option value="571">la caisse (571)</option>
        </select>
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Proposer l'écriture de paiement"}
      </button>
      {etat.echec && (
        <p role="alert" className="juger-quittance__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
