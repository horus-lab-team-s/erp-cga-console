"use client";

import { useActionState, useState } from "react";

import { admettreAuCentre, resilierLAdhesion } from "@/app/lib/actions-portefeuille";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Admettre un dossier au Centre, ou résilier son adhésion.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN SEUL GESTE PROPOSÉ, CELUI QUE LE DOSSIER ADMET
 *
 *   adhérent, rien de résilié        « Résilier »
 *   adhérent, fin déjà inscrite      aucun geste : la fin est affichée
 *   adhésion à venir déjà inscrite   aucun geste : la date est affichée
 *   non adhérent                     « Admettre »
 *
 * La page décide lequel sur les dates rendues par le backend. Proposer les deux
 * et laisser refuser l'autre apprendrait à cliquer au hasard.
 *
 * ⚠️ CE QUE L'ADMISSION DIT AVANT D'ÊTRE ENVOYÉE
 *
 * Deux vérités qui surprennent : la date d'effet ne remonte pas avant aujourd'hui,
 * et une adhésion prise en cours d'exercice n'ouvre pas l'abattement CGA pour cet
 * exercice (question ouverte Q17). Le réviseur qui promet l'abattement de l'année
 * à un nouvel adhérent de septembre engage le Centre sur un avantage refusé.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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
const note: React.CSSProperties = {
  margin: 0,
  font: "400 11.5px/1.45 var(--police-texte)",
  color: "var(--ink-500)",
};

function Retour({ echec, fait }: { echec: string | null; fait: string | null }) {
  if (fait) {
    return (
      <span role="status" style={{ ...note, color: "var(--success)" }}>
        {fait}
      </span>
    );
  }
  if (echec) {
    return (
      <span role="alert" style={{ ...note, color: "var(--danger)" }}>
        {echec}
      </span>
    );
  }
  return null;
}

export function Admission({ dossier, aujourdhui }: { dossier: string; aujourdhui: string }) {
  const [etat, envoyer, enCours] = useActionState(admettreAuCentre, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);

  if (etat.fait) return <Retour {...etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" style={{ marginTop: 4 }} onClick={() => setOuvert(true)}>
        Admettre
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <input type="hidden" name="dossier" value={dossier} />
      <label style={etiquette}>
        Date d&rsquo;effet
        <input type="date" name="a_compter_du" min={aujourdhui} defaultValue={aujourdhui} required style={champ} />
      </label>
      <label style={etiquette}>
        Chiffre d&rsquo;affaires déclaré (FCFA)
        <input name="chiffre_affaires_declare" inputMode="numeric" required style={champ} />
      </label>
      <label style={etiquette}>
        Source du chiffre
        <input name="source_du_chiffre" required minLength={5} maxLength={200} placeholder="Liasse de l'exercice précédent…" style={champ} />
      </label>
      <label style={etiquette}>
        Justification
        <textarea name="justification" required minLength={30} maxLength={500} rows={3} placeholder="Demande signée, pièces d'éligibilité reçues…" style={{ ...champ, resize: "vertical" }} />
      </label>
      <p style={note}>
        La date d&rsquo;effet ne remonte pas avant aujourd&rsquo;hui. Une adhésion prise en cours
        d&rsquo;exercice n&rsquo;ouvre pas l&rsquo;abattement CGA pour cet exercice.
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Inscrire l’adhésion"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      <Retour {...etat} />
    </form>
  );
}

export function Resiliation({ dossier }: { dossier: string }) {
  const [etat, envoyer, enCours] = useActionState(resilierLAdhesion, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);

  if (etat.fait) return <Retour {...etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" style={{ marginTop: 4 }} onClick={() => setOuvert(true)}>
        Résilier
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <input type="hidden" name="dossier" value={dossier} />
      <label style={etiquette}>
        Plus adhérent à compter du
        <input type="date" name="au" required style={champ} />
      </label>
      <label style={etiquette}>
        Justification
        <textarea name="justification" required minLength={30} maxLength={500} rows={3} placeholder="Lettre de résiliation reçue le…, signée par le gérant" style={{ ...champ, resize: "vertical" }} />
      </label>
      <p style={note}>
        La veille de cette date est encore couverte. Une résiliation ne traverse pas un exercice
        clos : le Centre y a déjà attesté l&rsquo;adhésion.
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Résilier l’adhésion"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      <Retour {...etat} />
    </form>
  );
}
