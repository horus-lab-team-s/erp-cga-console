"use client";

import { useActionState, useState } from "react";

import { reinitialiserSecondFacteur } from "@/app/lib/actions-second-facteur";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Retirer le second facteur d'un collaborateur qui a perdu son appareil.
 *
 * ⚠️ Replié, avec motif et confirmation : c'est la condition que l'écran des comptes
 * posait à tout geste d'administration. Le geste ferme toutes les sessions du
 * titulaire ; la case le dit avant l'envoi. Le compte de l'administrateur connecté
 * ne reçoit pas ce bouton, et le backend refuserait de toute façon.
 */
export function ReinitialiserSecondFacteur({ identifiant, nom }: { identifiant: string; nom: string }) {
  const [etat, envoyer, enCours] = useActionState(reinitialiserSecondFacteur, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const note: React.CSSProperties = { margin: 0, font: "400 11.5px/1.45 var(--police-texte)", color: "var(--ink-500)" };

  if (etat.fait) {
    return (
      <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>
        {etat.fait}
      </span>
    );
  }
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" style={{ marginTop: 4 }} onClick={() => setOuvert(true)}>
        Réinitialiser
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, minWidth: 220 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea
        name="motif"
        required
        minLength={30}
        maxLength={500}
        rows={3}
        placeholder="Perte signalée le…, vérifiée par appel au titulaire"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "4px 8px",
          border: "1px solid var(--line-200)",
          borderRadius: "var(--rayon-petit)",
          font: "400 12px/1.4 var(--police-texte)",
        }}
      />
      <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>
          Les sessions ouvertes de {nom} seront fermées, et il devra associer un nouvel appareil.
        </span>
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Retirer le second facteur"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && (
        <span role="alert" style={{ ...note, color: "var(--danger)" }}>
          {etat.echec}
        </span>
      )}
    </form>
  );
}
