"use client";

import { useActionState, useState } from "react";

import { confierUnDossier, fermerLesSessions, fermerUneHabilitation } from "@/app/lib/actions-administration";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les gestes sur une habilitation et sur les sessions d'un compte (pas 70).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUE L'ÉCRAN NE DÉCIDE PAS
 *
 * Qui peut recevoir un dossier, et à partir de quand : le backend refuse une
 * habilitation transverse, fermée, d'adhérent ou d'inspecteur, ou qui porte déjà le
 * dossier, et relaie une habilitation qui a déjà couru plutôt que de réécrire son
 * passé. L'écran masque le bouton quand le refus est certain (transverse), et
 * affiche la phrase du backend dans tous les autres cas.
 *
 * ⚠️ TROIS GESTES, TROIS NIVEAUX DE GRAVITÉ
 *
 *   confier un dossier     s'ajoute, se lit au journal ; pas de case
 *   fermer une habilitation ne se rouvre pas            ; case obligatoire
 *   fermer les sessions    le titulaire se reconnecte  ; pas de case
 * ─────────────────────────────────────────────────────────────────────────────
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

export function ConfierUnDossier({ habilitation }: { habilitation: string }) {
  const [etat, confier, enCours] = useActionState(confierUnDossier, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert) {
    return (
      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Confier un dossier
        </button>
        {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
      </span>
    );
  }
  return (
    <form
      action={async (donnees) => {
        await confier(donnees);
      }}
      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
    >
      <input type="hidden" name="habilitation" value={habilitation} />
      <input name="niu" required placeholder="NIU du dossier" aria-label="NIU du dossier" style={{ ...champ, width: 170 }} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Confier à compter d’aujourd’hui"}
      </button>
      <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
        Fermer
      </button>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
      {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
    </form>
  );
}

export function FermerUneHabilitation({
  habilitation,
  libelle,
  aujourdhui,
}: {
  habilitation: string;
  /** « Comptable de Léonard FOTSO » : ce que la case de confirmation nomme. */
  libelle: string;
  aujourdhui: string;
}) {
  const [etat, fermer, enCours] = useActionState(fermerUneHabilitation, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Fermer ce rôle
      </button>
    );
  }
  return (
    <form action={fermer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360 }}>
      <input type="hidden" name="habilitation" value={habilitation} />
      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <label style={note}>
          Ne vaut plus à compter du{" "}
          <input name="le" type="date" required defaultValue={aujourdhui} style={champ} />
        </label>
        <select name="motif" required defaultValue="" aria-label="Motif" style={champ}>
          <option value="" disabled>
            Motif
          </option>
          <option value="DEPART">Départ</option>
          <option value="CHANGEMENT_DE_POSTE">Changement de poste</option>
          <option value="REMPLACEMENT">Remplacement</option>
          <option value="FIN_DE_MISSION">Fin de mission</option>
          <option value="CORRECTION">Correction d&rsquo;une erreur</option>
        </select>
      </span>
      <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>
          {libelle} : l&rsquo;habilitation sera fermée et ne se rouvre pas. Elle reste dans l&rsquo;historique ; le
          compte n&rsquo;est pas suspendu.
        </span>
      </label>
      <span style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Fermer l’habilitation"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </span>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}

export function FermerLesSessions({ identifiant }: { identifiant: string }) {
  const [etat, fermer, enCours] = useActionState(fermerLesSessions, ETAT_ACTE_INITIAL);
  return (
    <form action={fermer} style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <button
        type="submit"
        className="bouton-discret"
        disabled={enCours}
        title="Appareil perdu ou session douteuse : le titulaire se reconnecte, l'intrus non."
      >
        {enCours ? "…" : "Fermer ses sessions"}
      </button>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
      {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
    </form>
  );
}
