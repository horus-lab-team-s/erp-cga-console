"use client";

import { useActionState, useState } from "react";

import {
  classerUneDemande,
  demanderUneRectificative,
  satisfaireUneDemande,
  tracerUneRelance,
} from "@/app/lib/actions-collecte";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * Les gestes sur une demande de pièce (pas 74).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS NIVEAUX DE GRAVITÉ, TROIS FORMES
 *
 *   demander une rectificative   un motif, qui partira à l'adhérent  ; pas de case
 *   rattacher la pièce reçue     un identifiant de pièce             ; pas de case
 *   tracer une relance           un canal                            ; pas de case
 *   classer sans suite           un motif, et une case : une demande classée ne se
 *                                relance plus, et l'adhérent ne sera plus sollicité
 *
 * Aucun formulaire ne se ferme sur un refus : la phrase du backend s'affiche, et le
 * collaborateur corrige sans ressaisir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>;
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  return null;
}

/** Sur la fiche d'une facture : demander la rectificative. */
export function DemandeRectificative({
  reference,
  dossier,
  motifPropose,
  principale,
}: {
  reference: string;
  dossier: string;
  /** Le verdict du contrôle, en point de départ : le collaborateur le reformule pour l'adhérent. */
  motifPropose: string;
  /** Sur une pièce bloquante, c'est l'action principale de l'écran. */
  principale: boolean;
}) {
  const [etat, demander, enCours] = useActionState(demanderUneRectificative, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className={principale ? "action-principale" : "action-secondaire"} onClick={() => setOuvert(true)}>
        Demander une facture rectificative
      </button>
    );
  }
  return (
    <form action={demander} style={{ display: "flex", flexDirection: "column", gap: 6, flexBasis: "100%" }}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="dossier" value={dossier} />
      <label style={note}>
        Ce qui est à rectifier (le texte part à l&rsquo;adhérent, qui le transmettra au fournisseur)
        <textarea name="motif" required minLength={10} rows={2} defaultValue={motifPropose} style={{ ...champ, display: "block", width: "100%", boxSizing: "border-box", resize: "vertical" }} />
      </label>
      <label style={note}>
        Attendue pour le <input type="date" name="attendue_pour" style={champ} /> (facultatif : une date sans échéance n&rsquo;engage personne)
      </label>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Émettre la demande"}
        </button>
        <button type="button" className="action-secondaire" onClick={() => setOuvert(false)}>
          Annuler
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

export function RattacherLaPiece({ demande }: { demande: string }) {
  const [etat, envoyer, enCours] = useActionState(satisfaireUneDemande, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="demande" value={demande} />
      <input name="piece" required placeholder="PJ-2026-0024" aria-label="Pièce reçue" style={{ ...champ, width: 130 }} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Rattacher la pièce reçue"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function TracerLaRelance({ demande }: { demande: string }) {
  const [etat, envoyer, enCours] = useActionState(tracerUneRelance, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="demande" value={demande} />
      <select name="canal" required defaultValue="WHATSAPP" aria-label="Canal de la relance" style={champ}>
        <option value="WHATSAPP">WhatsApp</option>
        <option value="COURRIEL">Courriel</option>
        <option value="PORTAIL">Portail</option>
        <option value="DEPOT_CABINET">Au cabinet ou par téléphone</option>
      </select>
      <button type="submit" className="bouton-discret" disabled={enCours} title="Consigne une relance déjà émise : tracer n'est pas envoyer.">
        {enCours ? "…" : "Tracer la relance émise"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function ClasserLaDemande({ demande }: { demande: string }) {
  const [etat, envoyer, enCours] = useActionState(classerUneDemande, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Classer sans suite
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 420 }}>
      <input type="hidden" name="demande" value={demande} />
      <textarea name="motif" required minLength={10} rows={2} placeholder="Opération annulée par le client le…" style={{ ...champ, resize: "vertical" }} />
      <label style={{ ...note, display: "flex", gap: 6 }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>La demande ne se relancera plus, et l&rsquo;adhérent ne sera plus sollicité pour cette pièce.</span>
      </label>
      <span style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Classer"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </span>
      <Retour etat={etat} />
    </form>
  );
}
