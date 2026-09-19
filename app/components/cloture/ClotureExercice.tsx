"use client";

import { useActionState, useState } from "react";

import { soumettreLaCloture, type EtatCloture } from "@/app/lib/actions-cloture";
import { soumettreSansReinitialiser } from "@/app/lib/soumission";

const ETAT_INITIAL: EtatCloture = { echec: null, rapport: null, motif: "" };

const texteDiscret: React.CSSProperties = {
  font: "400 12.5px/1.5 var(--police-texte)",
  color: "var(--ink-500)",
};

/**
 * La clôture de l'exercice, sous la liasse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE PARCOURS
 *
 *   replié        « Préparer la clôture »
 *   motif         écrit par le réviseur, puis « Contrôler » : rien n'est écrit
 *   rapport       tous les obstacles d'un coup, ou ce que la clôture fera :
 *                 résultat reporté, lignes d'à-nouveau, exercice suivant, et s'il
 *                 sera ouvert par la clôture elle-même
 *   confirmation  une case à cocher, puis « Clore l'exercice »
 *
 * ⚠️ LA CONFIRMATION N'EST PAS UNE FORMALITÉ
 *
 * Elle dit les deux choses qu'un réviseur doit savoir avant de cliquer : l'exercice
 * ne se rouvre pas, et la DSF n'est pas déposée pour autant. La case est vérifiée
 * par l'action serveur aussi, pas seulement par le navigateur.
 *
 * ⚠️ LES OBSTACLES SONT AFFICHÉS TELS QUE LE BACKEND LES NOMME
 *
 * Chacun avec sa phrase et ce qui est en cause (les écritures, les comptes,
 * l'exercice). L'écran ne les reformule pas et n'en masque aucun.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ClotureExercice({ dossier, exercice }: { dossier: string; exercice: string }) {
  const [etat, envoyer, enCours] = useActionState(soumettreLaCloture, ETAT_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const rapport = etat.rapport;

  if (rapport?.applique) {
    return (
      <div role="status" style={{ ...texteDiscret, padding: "12px 16px" }}>
        <strong style={{ color: "var(--success)" }}>Exercice {rapport.exercice} clos.</strong>{" "}
        {rapport.lignes_reportees} ligne{rapport.lignes_reportees > 1 ? "s" : ""} reportée
        {rapport.lignes_reportees > 1 ? "s" : ""} sur l&rsquo;exercice {rapport.exercice_suivant}
        {rapport.cle_a_nouveau && <> par l&rsquo;écriture d&rsquo;à-nouveau {rapport.cle_a_nouveau}</>}.
        {rapport.suivant_ouvert_par_la_cloture && <> L&rsquo;exercice {rapport.exercice_suivant} a été ouvert.</>}{" "}
        La déclaration statistique et fiscale reste à déposer : clore n&rsquo;est pas déposer.
      </div>
    );
  }

  if (!ouvert) {
    return (
      <div style={{ padding: "12px 16px" }}>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Préparer la clôture de l&rsquo;exercice {exercice}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px" }}>
      <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="hidden" name="dossier" value={dossier} />
        <input type="hidden" name="exercice" value={exercice} />
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
          Motif de la clôture
          <textarea
            name="motif"
            required
            minLength={30}
            maxLength={500}
            rows={3}
            defaultValue={etat.motif}
            placeholder="Revue achevée, rapprochements bancaires faits, balance validée…"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: 2,
              padding: "6px 8px",
              border: "1px solid var(--line-200)",
              borderRadius: "var(--rayon-petit)",
              font: "400 13px/1.4 var(--police-texte)",
              resize: "vertical",
            }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Contrôler, sans rien écrire"}
          </button>
          <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
            Annuler
          </button>
        </div>
      </form>

      {etat.echec && (
        <span role="alert" style={{ ...texteDiscret, color: "var(--danger)" }}>
          {etat.echec}
        </span>
      )}

      {rapport && !rapport.possible && (
        <div role="alert">
          <strong style={{ font: "600 13px/1.4 var(--police-texte)", color: "var(--danger)" }}>
            La clôture est impossible en l&rsquo;état : {rapport.obstacles.length} obstacle
            {rapport.obstacles.length > 1 ? "s" : ""}
          </strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {rapport.obstacles.map((obstacle) => (
              <li key={obstacle.motif + obstacle.en_cause.join()} style={texteDiscret}>
                {obstacle.explication}
                {obstacle.en_cause.length > 0 && <> En cause : {obstacle.en_cause.join(", ")}.</>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rapport && rapport.possible && (
        // ⚠️ Un second formulaire, qui renvoie le motif **contrôlé** : le réviseur
        // applique ce qu'il a contrôlé, pas un texte retouché entre-temps.
        // ⚠️ Pas 108 : soumis sans réinitialisation. Avec `action`, un refus décochait la
        // confirmation à l'écran en laissant le bouton actif. Voir `lib/soumission.ts`.
        <form onSubmit={soumettreSansReinitialiser(envoyer)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="exercice" value={exercice} />
          <input type="hidden" name="motif" value={etat.motif} />
          <input type="hidden" name="appliquer" value="oui" />
          <p style={{ ...texteDiscret, margin: 0 }}>
            <strong style={{ color: "var(--ink-900)" }}>La clôture est possible.</strong> Résultat
            reporté au compte 13 : {Number(rapport.resultat_de_l_exercice).toLocaleString("fr-FR")}{" "}
            FCFA. {rapport.lignes_reportees} ligne{rapport.lignes_reportees > 1 ? "s" : ""}{" "}
            d&rsquo;à-nouveau sur l&rsquo;exercice {rapport.exercice_suivant}
            {rapport.suivant_ouvert_par_la_cloture
              ? <>, <strong>qui n&rsquo;existe pas encore et sera ouvert par la clôture</strong>.</>
              : "."}
          </p>
          <label style={{ ...texteDiscret, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              name="confirmation"
              value="oui"
              checked={confirme}
              onChange={(e) => setConfirme(e.target.checked)}
            />
            <span>
              Je comprends que l&rsquo;exercice {exercice} sera fermé et ne pourra pas être
              rouvert, et que la clôture ne dépose pas la déclaration statistique et fiscale.
            </span>
          </label>
          <div>
            <button type="submit" className="bouton-discret" disabled={enCours || !confirme}>
              {enCours ? "…" : `Clore l’exercice ${exercice}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
