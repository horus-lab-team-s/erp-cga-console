"use client";

import { useActionState, useState } from "react";

import { reglerMesRappels } from "@/app/lib/actions-obligations";
import type { VueDesRappels } from "@/app/lib/espace-adherent";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { soumettreSansReinitialiser } from "@/app/lib/soumission";

/**
 * « Rappels avant les échéances » (pas 115, maquette « Espace adhérent », vue F).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ DES CASES, DONC SANS RÉINITIALISATION (leçon du pas 108)
 *
 * Avec `<form action>`, React réinitialise les cases à cocher après chaque action, refus compris :
 * l'écran montrerait « 7 jours » décoché alors que l'état le tient coché. La soumission passe par
 * `soumettreSansReinitialiser`, et les cases sont contrôlées.
 *
 * « Recevoir aussi par WhatsApp » est affiché, grisé, avec son motif : un canal inactif dit pourquoi.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ReglerMesRappels({ dossier, vue }: { dossier: string; vue: VueDesRappels }) {
  const [etat, agir, enCours] = useActionState(reglerMesRappels, ETAT_ACTE_INITIAL);
  const [actifs, setActifs] = useState(vue.preference.actifs);
  const [jalons, setJalons] = useState<number[]>(vue.preference.jalons);
  const basculer = (j: number) =>
    setJalons((courants) => (courants.includes(j) ? courants.filter((c) => c !== j) : [...courants, j]));
  return (
    <form onSubmit={soumettreSansReinitialiser(agir)} className="adherent__depot" aria-label="Rappels avant les échéances">
      <input type="hidden" name="dossier" value={dossier} />
      <label className="adherent__bascule">
        <input
          type="checkbox"
          name="actifs"
          value="oui"
          checked={actifs}
          onChange={(e) => setActifs(e.target.checked)}
        />
        <span>Me prévenir avant mes échéances, par courriel et dans mon espace</span>
      </label>
      <fieldset className="adherent__jalons" disabled={!actifs}>
        <legend>Combien de jours avant</legend>
        {vue.jalons_possibles.map((j) => (
          <label key={j} className="adherent__bascule">
            <input type="checkbox" name="jalons" value={j} checked={jalons.includes(j)} onChange={() => basculer(j)} />
            <span>
              {j} jour{j > 1 ? "s" : ""} avant
            </span>
          </label>
        ))}
      </fieldset>
      {!vue.preference.defini && (
        <small>Réglage proposé par le cabinet : vous ne l&rsquo;avez pas encore modifié.</small>
      )}
      <label className="adherent__bascule" aria-disabled="true">
        <input type="checkbox" disabled checked={false} readOnly />
        <span>
          Recevoir aussi par WhatsApp <small>({vue.motif_whatsapp})</small>
        </span>
      </label>
      <button type="submit" className="adherent__depot-envoyer" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer mes rappels"}
      </button>
      {(etat.echec || etat.fait) && (
        <p className="adherent__depot-retour" data-ton={etat.echec ? "echec" : "fait"} role="status">
          {etat.echec ?? etat.fait}
        </p>
      )}
    </form>
  );
}
