"use client";

import { useActionState, useState } from "react";

import {
  donnerLeSecondRegard,
  ecarterUnConstat,
  joindreLaPieceDAppui,
  leverUnEcart,
} from "@/app/lib/actions-ecarts";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * Les gestes d'écart sur l'écran E02 (pas 92).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE BOUTON EXISTAIT DEPUIS LE PREMIER JOUR, ET NE FAISAIT RIEN
 *
 * « Écarter un constat » figurait au pied de l'écran, `type="button"` sans action.
 * Il ne pouvait pas se brancher simplement : écarter est le seul contournement
 * légitime d'un contrôle, et il fallait d'abord au backend un motif, un second
 * regard, une politique lue au référentiel et une trace au journal.
 *
 * TROIS GESTES, TROIS FORMES
 *
 *   écarter          choisir le constat, écrire le motif ; la note dit si un
 *                    second regard sera nécessaire, **avant** l'envoi
 *   second regard    confirmer ou refuser, avec motif ; jamais proposé à l'auteur
 *   lever            un motif ; le constat compte de nouveau
 *
 * Aucun formulaire ne se ferme sur un refus : la phrase du backend s'affiche, et
 * le réviseur corrige sans ressaisir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};
const zone: React.CSSProperties = { ...champ, display: "block", width: "100%", boxSizing: "border-box", resize: "vertical" };

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>;
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  return null;
}

/** Un constat que la politique permet d'écarter, tel que le formulaire le propose. */
export type ConstatCandidat = {
  code_regle: string;
  libelle: string;
  severite: string;
  /** Lu à la politique : l'écart attendra-t-il un second regard ? */
  second_regard: boolean;
};

export function EcarterUnConstat({
  reference,
  candidats,
  fermes,
  motifMinimum,
}: {
  reference: string;
  candidats: ConstatCandidat[];
  /** Les constats que la politique interdit d'écarter : dits, pour qu'on ne les cherche pas. */
  fermes: { code_regle: string; severite: string }[];
  motifMinimum: number;
}) {
  const [etat, envoyer, enCours] = useActionState(ecarterUnConstat, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [choisi, setChoisi] = useState(candidats[0]?.code_regle ?? "");
  if (etat.fait) return <Retour etat={etat} />;
  if (candidats.length === 0) {
    // Pas de bouton inerte : on dit pourquoi il n'y a rien à écarter.
    return fermes.length > 0 ? (
      <span style={note}>
        Aucun constat écartable : la politique du cabinet ferme {fermes.map((f) => `${f.code_regle} (${f.severite})`).join(", ")}.
      </span>
    ) : null;
  }
  if (!ouvert) {
    return (
      <button type="button" className="action-secondaire" onClick={() => setOuvert(true)}>
        Écarter un constat
      </button>
    );
  }
  const candidat = candidats.find((c) => c.code_regle === choisi);
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, flexBasis: "100%" }}>
      <input type="hidden" name="reference" value={reference} />
      <label style={note}>
        Constat à écarter{" "}
        <select name="code_regle" value={choisi} onChange={(e) => setChoisi(e.target.value)} style={champ}>
          {candidats.map((c) => (
            <option key={c.code_regle} value={c.code_regle}>
              {c.code_regle} · {c.severite} · {c.libelle}
            </option>
          ))}
        </select>
      </label>
      <label style={note}>
        Pourquoi ce constat n&rsquo;en est pas un sur cette facture (au moins {motifMinimum} caractères ; le
        vérificateur le lira)
        <textarea name="motif" required minLength={motifMinimum} rows={2} style={zone} placeholder="Règlement par virement, attesté par le relevé bancaire déposé le…" />
      </label>
      {/* Pas 118 : la preuve de ce que le motif affirme. Facultative ici, exigible ensuite selon la
          politique : elle arrive souvent après la décision (le fournisseur envoie son attestation
          le lendemain), et le journal des dérogations le rappelle passé le délai. */}
      <label style={note}>
        Pièce d&rsquo;appui (facultative ici) : l&rsquo;identifiant d&rsquo;une pièce du dossier, ou la
        référence du document que vous conservez
        <input name="piece_appui" maxLength={120} style={champ} placeholder="PJ-2026-0042, ou « attestation DGI du 09/08 »" />
      </label>
      {fermes.length > 0 && (
        <p style={note}>
          Non proposés, la politique du cabinet les ferme : {fermes.map((f) => `${f.code_regle} (${f.severite})`).join(", ")}.
        </p>
      )}
      <p style={note}>
        {candidat?.second_regard
          ? "△ Cet écart attendra un second regard : le constat continue de compter jusque-là."
          : "L'écart s'appliquera dès l'envoi."}
      </p>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Écarter"}
        </button>
        <button type="button" className="action-secondaire" onClick={() => setOuvert(false)}>
          Annuler
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

export function SecondRegard({ reference, identifiant }: { reference: string; identifiant: string }) {
  const [etat, envoyer, enCours] = useActionState(donnerLeSecondRegard, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 480 }}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea name="motif" required minLength={10} rows={2} aria-label="Motif du second regard" placeholder="Relevé bancaire relu : virement du…" style={zone} />
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* Deux boutons de soumission, et non une case : la décision est le geste. */}
        <button type="submit" name="decision" value="CONFIRMER" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Confirmer l'écart"}
        </button>
        <button type="submit" name="decision" value="REFUSER" className="action-secondaire" disabled={enCours}>
          Refuser
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

export function LeverLEcart({ reference, identifiant }: { reference: string; identifiant: string }) {
  const [etat, envoyer, enCours] = useActionState(leverUnEcart, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Lever l&rsquo;écart
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 480 }}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea name="motif" required minLength={10} rows={2} aria-label="Motif de la levée" placeholder="Pièce justificative finalement non probante…" style={zone} />
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Lever : le constat compte de nouveau"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

/**
 * Joindre la pièce d'appui d'une dérogation déjà posée (pas 118).
 *
 * Sur la fiche de la pièce, sous chaque écart : la preuve arrive souvent après la décision, et
 * c'est elle que le vérificateur demandera.
 */
export function JoindreLaPieceDAppui({
  reference,
  identifiant,
  piece,
}: {
  reference: string;
  identifiant: string;
  /** La pièce déjà jointe, s'il y en a une : le geste la remplace, et le journal garde les deux. */
  piece: string | null;
}) {
  const [etat, envoyer, enCours] = useActionState(joindreLaPieceDAppui, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="action-secondaire" onClick={() => setOuvert(true)}>
        {piece ? "Remplacer la pièce d'appui" : "Joindre une pièce d'appui"}
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <label style={note}>
        Pièce d&rsquo;appui
        <input name="piece" required minLength={3} maxLength={120} defaultValue={piece ?? ""} style={champ} />
      </label>
      <button type="submit" className="action-principale" disabled={enCours}>
        {enCours ? "…" : "Joindre"}
      </button>
      <button type="button" className="action-secondaire" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      <Retour etat={etat} />
    </form>
  );
}
