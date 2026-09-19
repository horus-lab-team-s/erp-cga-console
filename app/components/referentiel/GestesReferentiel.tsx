"use client";

import { useActionState, useState } from "react";

import { proposerUneVersion, retirerUneDecision, trancherUneProposition, validerUneVersionLivree } from "@/app/lib/actions-referentiel";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * Les gestes de décision sur le référentiel (pas 95).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CHAQUE GESTE ICI CHANGE UN CALCUL
 *
 * Une version validée entre au calcul suivant du cabinet. Les formulaires le disent
 * avant l'envoi, et aucun ne propose ce que le circuit refuserait : l'écran lit le
 * circuit et n'affiche que les gestes ouverts à la session.
 *
 *   valider une version livrée   un motif : le texte confronté
 *   proposer une version         valeur, date d'effet, fondement (texte et source), motif
 *   trancher une proposition     valider ou refuser, un motif ; jamais proposé à l'auteur
 *                                quand le circuit exige quatre yeux
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

export function ValiderLaVersion({ code, applicableDu, motifMinimum }: { code: string; applicableDu: string; motifMinimum: number }) {
  const [etat, envoyer, enCours] = useActionState(validerUneVersionLivree, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Valider cette version
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 520 }}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="applicable_du" value={applicableDu} />
      <textarea
        name="motif"
        required
        minLength={motifMinimum}
        rows={2}
        aria-label={`Motif de la validation de ${code}`}
        placeholder="Confronté au CGI, article…, dans sa rédaction issue de la loi de finances…"
        style={zone}
      />
      <p style={note}>La version devient validée pour le cabinet, à votre nom, dès l&rsquo;envoi.</p>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Valider"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

export type ParametreProposable = { code: string; libelle: string; unite: string; valeur: string | number | boolean; depuis: string };

export function ProposerUneVersion({
  parametres,
  motifMinimum,
  premierJour,
}: {
  parametres: ParametreProposable[];
  motifMinimum: number;
  /** Première date d'effet admise : une nouvelle version ne prend pas effet dans le passé. */
  premierJour: string;
}) {
  const [etat, envoyer, enCours] = useActionState(proposerUneVersion, ETAT_ACTE_INITIAL);
  const [choisi, setChoisi] = useState(parametres[0]?.code ?? "");
  if (parametres.length === 0) return null;
  const courant = parametres.find((p) => p.code === choisi) ?? parametres[0];
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
      <label style={note}>
        Paramètre{" "}
        <select name="code" value={`${courant.code}|${courant.unite}`} onChange={(e) => setChoisi(e.target.value.split("|")[0])} style={champ}>
          {parametres.map((p) => (
            <option key={p.code} value={`${p.code}|${p.unite}`}>
              {p.code} · {p.libelle}
            </option>
          ))}
        </select>
      </label>
      <p style={note}>
        En vigueur : <strong>{String(courant.valeur)}</strong> ({courant.unite.toLowerCase()}) depuis le {courant.depuis.split("-").reverse().join("/")}.
      </p>
      <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={note}>
          Nouvelle valeur <input name="valeur" required style={{ ...champ, width: 160 }} />
        </label>
        <label style={note}>
          À compter du <input type="date" name="applicable_du" required min={premierJour} style={champ} />
        </label>
      </span>
      <label style={note}>
        Texte qui fonde la valeur
        <input name="fondement_texte" required minLength={5} placeholder="Loi de finances 2027, article…" style={{ ...champ, display: "block", width: "100%", boxSizing: "border-box" }} />
      </label>
      <label style={note}>
        Source consultée
        <input name="fondement_source" required minLength={5} placeholder="Journal officiel du…, consulté le…" style={{ ...champ, display: "block", width: "100%", boxSizing: "border-box" }} />
      </label>
      <label style={note}>
        Motif de la proposition (au moins {motifMinimum} caractères)
        <textarea name="motif" required minLength={motifMinimum} rows={2} style={zone} />
      </label>
      <p style={note}>△ Sans effet tant qu&rsquo;une personne désignée par le circuit ne l&rsquo;a pas validée.</p>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Proposer"}
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

export function TrancherLaProposition({ identifiant, motifMinimum }: { identifiant: string; motifMinimum: number }) {
  const [etat, envoyer, enCours] = useActionState(trancherUneProposition, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 520 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea
        name="motif"
        required
        minLength={motifMinimum}
        rows={2}
        aria-label="Motif de la décision"
        placeholder="Relu sur le texte cité : valeur conforme…"
        style={zone}
      />
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" name="decision" value="VALIDER" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Valider : appliquer au cabinet"}
        </button>
        <button type="submit" name="decision" value="REFUSER" className="action-secondaire" disabled={enCours}>
          Refuser
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

/**
 * Retirer une décision validée, à compter d'une date (pas 98) : une valeur du référentiel
 * (`sorte="parametre"`) ou une règle du cabinet (`sorte="regle"`).
 *
 * La date proposée par défaut est aujourd'hui, et rien d'antérieur n'est admis : les calculs
 * et contrôles déjà rendus ne changent pas. Le formulaire le dit avant l'envoi.
 */
export function RetirerLaDecision({
  sorte,
  identifiant,
  premierJour,
  motifMinimum,
}: {
  sorte: "parametre" | "regle";
  identifiant: string;
  premierJour: string;
  motifMinimum: number;
}) {
  const [etat, envoyer, enCours] = useActionState(retirerUneDecision, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Retirer
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 520 }}>
      <input type="hidden" name="sorte" value={sorte} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <label style={note}>
        À compter du <input type="date" name="a_compter_du" required min={premierJour} defaultValue={premierJour} style={champ} />
      </label>
      <textarea name="motif" required minLength={motifMinimum} rows={2} aria-label="Motif du retrait" placeholder="Pourquoi la décision cesse de valoir…" style={zone} />
      <p style={note}>
        {sorte === "regle"
          ? "À compter de cette date, la règle ne contrôle plus. Les contrôles déjà rendus ne changent pas."
          : "À compter de cette date, la valeur du référentiel commun reprend. Les calculs déjà rendus ne changent pas."}
      </p>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Retirer à compter de cette date"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}
