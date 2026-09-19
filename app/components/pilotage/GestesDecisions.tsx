"use client";

import { useActionState, useState } from "react";

import { cloreUneDecision, deciderUneMesure } from "@/app/lib/actions-pilotage";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les gestes de la vue risque (pas 100) : décider une mesure, clore une décision.
 *
 * ⚠️ Ce module est un composant client : il n'importe pas `pilotage.ts`, qui tire
 * `api.ts` et donc `next/headers`. Les formes des données sont passées en props simples.
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

type Mesure = { code: string; libelle: string; description: string; echeance_requise: boolean };

/**
 * Une mesure proposée : son libellé, ce qu'elle engage, et le formulaire qui s'ouvre au clic.
 *
 * Le formulaire est fermé par défaut : une décision de direction ne se prend pas d'un clic
 * distrait, et le motif est la première chose qu'on demande.
 */
export function DeciderLaMesure({ niu, mesure, motifMinimum, demain }: { niu: string; mesure: Mesure; motifMinimum: number; demain: string }) {
  const [etat, envoyer, enCours] = useActionState(deciderUneMesure, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  // ⚠️ Champs contrôlés, et c'est une correction (pas 100) : React réinitialise un
  // formulaire soumis par action. Sur un refus (mesure déjà en cours, échéance passée),
  // la direction perdait le motif qu'elle venait d'écrire. Constaté en parcours réel.
  const [motif, setMotif] = useState("");
  const [echeance, setEcheance] = useState("");
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-100)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ font: "600 13px/1.4 var(--police-texte)" }}>{mesure.libelle}</strong>
        {!ouvert && !etat.fait && (
          <button type="button" className="bouton-discret" style={{ marginLeft: "auto" }} onClick={() => setOuvert(true)}>
            Décider
          </button>
        )}
      </div>
      <p style={note}>{mesure.description}</p>
      {etat.fait && <p role="status" style={{ ...note, color: "var(--success)", marginTop: 6 }}>{etat.fait}</p>}
      {ouvert && !etat.fait && (
        <form action={envoyer} style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <input type="hidden" name="niu" value={niu} />
          <input type="hidden" name="mesure" value={mesure.code} />
          <input type="hidden" name="motif_minimum" value={motifMinimum} />
          <textarea
            name="motif"
            required
            minLength={motifMinimum}
            rows={2}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder={`Pourquoi cette mesure, sur ce dossier, maintenant (${motifMinimum} caractères au moins)`}
            aria-label={`Motif : ${mesure.libelle}`}
            style={{ ...champ, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {mesure.echeance_requise && (
              <label style={{ font: "600 12px/1.4 var(--police-texte)" }}>
                Échéance{" "}
                <input type="date" name="echeance" required min={demain} value={echeance} onChange={(e) => setEcheance(e.target.value)} aria-label={`Échéance : ${mesure.libelle}`} style={champ} />
              </label>
            )}
            <button type="submit" className="action-principale" disabled={enCours}>
              {enCours ? "…" : "Signer la décision"}
            </button>
            <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
              Annuler
            </button>
          </div>
          {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</p>}
        </form>
      )}
    </div>
  );
}

export function CloreLaDecision({ niu, identifiant, libelle, motifMinimum }: { niu: string; identifiant: string; libelle: string; motifMinimum: number }) {
  const [etat, envoyer, enCours] = useActionState(cloreUneDecision, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  // Contrôlé pour la même raison que le motif de décision : un refus ne vide pas le champ.
  const [motif, setMotif] = useState("");
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Clore
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
      <input type="hidden" name="niu" value={niu} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <input type="hidden" name="motif_minimum" value={motifMinimum} />
      <input
        name="motif"
        required
        minLength={motifMinimum}
        placeholder="Ce qui a changé…"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        aria-label={`Motif de clôture : ${libelle}`}
        style={{ ...champ, minWidth: 260, flex: 1 }}
      />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Clore la mesure"}
      </button>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}
