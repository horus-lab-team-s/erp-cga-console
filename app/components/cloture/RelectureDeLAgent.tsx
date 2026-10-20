"use client";

import { useActionState } from "react";

import { demanderUneRelectureDsf } from "@/app/lib/actions-dsf";
import type { EtatDeLaRelecture } from "@/app/lib/dsf-etats";

const INITIAL: EtatDeLaRelecture = { echec: null, message: null, remarques: [] };

/**
 * La relecture du dossier de la DSF par l'agent (18 octobre 2026, point 24).
 *
 * ⚠️ IL PROPOSE. Une activité sans code NACAM, une pièce que l'activité rend probable, une
 * rubrique de la fiche qui manque : le préparateur juge. Les chiffres de la liasse ne sont pas
 * son affaire, et sans clé l'écran le dit sans rien bloquer.
 */
export function RelectureDeLAgent({ dossier, exercice }: { dossier: string; exercice: string }) {
  const [etat, demander, enCours] = useActionState(demanderUneRelectureDsf, INITIAL);
  return (
    <form action={demander} className="dsf__geste" aria-label="Relecture par l'agent">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="exercice" value={exercice} />
      <p className="dsf__note">
        Un second regard sur le dossier avant de préparer : codes NACAM, pièces probables, fiche signalétique.
        L&rsquo;agent propose ; il ne touche à aucun chiffre.
      </p>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "Relecture…" : "Demander une relecture à l'agent"}
      </button>
      {etat.echec && (
        <p role="alert" className="dsf__message" data-ton="echec">
          {etat.echec}
        </p>
      )}
      {etat.message && (
        <p role="status" className="dsf__message">
          {etat.message}
        </p>
      )}
      {etat.remarques.length > 0 && (
        <ul className="dsf__remarques">
          {etat.remarques.map((r, i) => (
            <li key={i}>
              <strong>{r.sujet}</strong> · {r.constat}
              {r.suggestion && <em> {r.suggestion}</em>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
