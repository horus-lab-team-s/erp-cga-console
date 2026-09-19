"use client";

import { useActionState, useState } from "react";

import { inscrireReclassement } from "@/app/lib/actions-portefeuille";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Le geste qui répond à « Reclassement dû ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REPLIÉ PAR DÉFAUT, COMME LA CONTRE-PASSATION
 *
 * Inscrire un changement de régime engage le cabinet vis-à-vis de l'administration.
 * Un formulaire ouvert sur chaque ligne d'alerte inviterait à le remplir par
 * habitude ; un bouton qui le déplie demande de le vouloir.
 *
 * ⚠️ LA DATE D'EFFET EST PROPOSÉE, PAS IMPOSÉE
 *
 * Le 1er janvier qui suit l'exercice mesuré est le cas normal, et le formulaire le
 * propose. Il reste modifiable : une décision de l'administration peut fixer une
 * autre date, et c'est le backend qui refuse une date traversant un exercice clos.
 * L'écran ne rejoue pas cette règle : deux contrôles qui disent la même chose
 * divergent au premier correctif.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function InscrireReclassement({
  dossier,
  dateProposee,
}: {
  dossier: string;
  dateProposee: string;
}) {
  const [etat, envoyer, enCours] = useActionState(inscrireReclassement, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);

  // Une fois inscrit, la page est revalidée et la ligne affiche « Reclassement
  // inscrit » ; ce message couvre l'instant entre les deux.
  if (etat.fait) {
    return (
      <span
        role="status"
        style={{ display: "block", font: "400 12px/1.4 var(--police-texte)", color: "var(--success)" }}
      >
        {etat.fait}
      </span>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        className="bouton-discret"
        style={{ marginTop: 6 }}
        onClick={() => setOuvert(true)}
      >
        Inscrire le passage au réel
      </button>
    );
  }

  const champ: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 2,
    padding: "4px 8px",
    border: "1px solid var(--line-200)",
    borderRadius: "var(--rayon-petit)",
    font: "400 12px/1.4 var(--police-texte)",
  };
  const etiquette: React.CSSProperties = {
    font: "600 11px/1.4 var(--police-texte)",
    color: "var(--ink-500)",
  };

  return (
    <form
      action={envoyer}
      style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, maxWidth: 360 }}
    >
      <input type="hidden" name="dossier" value={dossier} />
      <label style={etiquette}>
        Date d&rsquo;effet
        <input type="date" name="a_compter_du" defaultValue={dateProposee} required style={champ} />
      </label>
      <label style={etiquette}>
        Justification
        <textarea
          name="justification"
          required
          minLength={30}
          maxLength={500}
          rows={3}
          placeholder="Liasse de l'exercice : chiffre d'affaires constaté, pièce de référence…"
          style={{ ...champ, resize: "vertical" }}
        />
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Inscrire"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && (
        <span role="alert" style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--danger)" }}>
          {etat.echec}
        </span>
      )}
    </form>
  );
}
