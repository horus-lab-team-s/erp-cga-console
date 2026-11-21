"use client";

import { useActionState } from "react";

import { demanderUneRelectureDeLaBalance } from "@/app/lib/actions-comptabilite";
import { montantFcfa } from "@/app/lib/formats";
import type { EtatDeLaRelectureDeBalance, SoldeARegarder } from "@/app/lib/soldes-a-regarder-etats";

const INITIAL: EtatDeLaRelectureDeBalance = { echec: null, message: null, remarques: [] };

/**
 * Les soldes à regarder, puis la relecture par l'agent (18 octobre 2026, point 15).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Le relevé est déterministe : le plan SYSCOHADA dit à lui seul qu'une caisse n'est pas
 * créditrice ou qu'un compte d'attente se solde à la clôture. Il tourne sans clé.
 *
 * ⚠️ L'AGENT PROPOSE. Il lit la balance et ce relevé, et suggère où regarder et quelle
 * régularisation envisager. Il n'écrit aucune écriture : le comptable saisit, un autre valide.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SoldesARegarder({
  dossier,
  exercice,
  soldes,
  intitules,
}: {
  dossier: string;
  exercice: string;
  soldes: SoldeARegarder[];
  intitules: Record<string, string>;
}) {
  const [etat, demander, enCours] = useActionState(demanderUneRelectureDeLaBalance, INITIAL);
  return (
    <section className="soldes-a-regarder" aria-label="Soldes à regarder">
      <p className="soldes-a-regarder__titre">
        <strong>Soldes à regarder</strong> ·{" "}
        {soldes.length === 0
          ? "aucun solde ne contredit la nature de son compte."
          : `${soldes.length} solde${soldes.length > 1 ? "s" : ""} de sens inattendu. Ce n'est pas forcément une erreur : à juger.`}
      </p>
      {soldes.length > 0 && (
        <ul className="soldes-a-regarder__liste">
          {soldes.map((s) => (
            <li key={s.compte}>
              <span className="tabulaire">{s.compte}</span>
              {intitules[s.compte] && <small> {intitules[s.compte]}</small>} · {montantFcfa(s.solde)} · {s.constat}{" "}
              <em>{s.suggestion}</em>
            </li>
          ))}
        </ul>
      )}
      <form action={demander} className="soldes-a-regarder__agent">
        <input type="hidden" name="dossier" value={dossier} />
        <input type="hidden" name="exercice" value={exercice} />
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "Relecture…" : "Demander une relecture de la balance à l'agent"}
        </button>
        {etat.echec && (
          <p role="alert" className="soldes-a-regarder__message" data-ton="echec">
            {etat.echec}
          </p>
        )}
        {etat.message && (
          <p role="status" className="soldes-a-regarder__message">
            {etat.message}
          </p>
        )}
        {etat.remarques.length > 0 && (
          <ul className="soldes-a-regarder__liste">
            {etat.remarques.map((r, i) => (
              <li key={i}>
                {r.compte && <span className="tabulaire">{r.compte} · </span>}
                {r.constat} <em>{r.suggestion}</em>
              </li>
            ))}
          </ul>
        )}
      </form>
    </section>
  );
}
