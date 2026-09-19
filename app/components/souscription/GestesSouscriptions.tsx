"use client";

import { useActionState, useState } from "react";

import {
  activerUneSouscription,
  lancerLaReconciliation,
  lancerLesPrelevements,
} from "@/app/lib/actions-souscription";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "5px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

/**
 * Ouvrir l'accès d'une souscription payée, après vérification d'identité (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE GESTE DONNE À UN INCONNU LA LECTURE D'UN DOSSIER
 *
 * C'est précisément ce que faisait le paiement seul avant le pas 83. Le formulaire exige
 * donc une description de la vérification faite (au moins vingt caractères au backend :
 * « RCCM et CNI du gérant présentés au cabinet »), et une case qui dit ce qu'on fait.
 *
 * ⚠️ L'AUTEUR N'EST PAS UN CHAMP
 *
 * Le backend le prend de la session et l'écrit au journal. Le formulaire ne propose pas
 * de « vérifié par » : on ne fait pas porter l'ouverture d'un dossier à un collègue.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ActiverSouscription({
  reference,
  courriel,
  niu,
}: {
  reference: string;
  courriel: string;
  niu: string | null;
}) {
  const [etat, activer, enCours] = useActionState(activerUneSouscription, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Vérifier et ouvrir l&rsquo;accès
      </button>
    );
  }
  return (
    <form action={activer} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260, paddingBlock: 6 }}>
      <input type="hidden" name="reference" value={reference} />
      <textarea
        name="verification"
        required
        minLength={20}
        rows={2}
        placeholder="Comment l'identité a été vérifiée : RCCM et CNI du gérant présentés au cabinet le…"
        style={{ ...champ, resize: "vertical" }}
      />
      <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>
          {courriel} pourra lire le dossier {niu ?? "déclaré"} et y déposer des pièces. Mon nom sera inscrit au journal.
        </span>
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Ouvrir l’accès"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}

/**
 * Les deux tâches d'exploitation, déclenchables à la main.
 *
 * ⚠️ Toutes deux sont idempotentes au backend : rejouer ne produit ni second débit, ni
 * second encaissement. Elles sont normalement planifiées ; le bouton sert au jour où la
 * planification a manqué, et le rapport dit ce qui a été fait.
 */
export function TachesDExploitation() {
  const [rapprochement, rapprocher, enRapprochement] = useActionState(lancerLaReconciliation, ETAT_ACTE_INITIAL);
  const [prelevement, prelever, enPrelevement] = useActionState(lancerLesPrelevements, ETAT_ACTE_INITIAL);
  return (
    <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
      <form action={rapprocher} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={note}>
          Interroge le prestataire sur chaque paiement resté en attente : une notification perdue ne laisse pas un client
          payé sans suite.
        </p>
        <div>
          <button type="submit" className="bouton-discret" disabled={enRapprochement}>
            {enRapprochement ? "…" : "Rapprocher les paiements"}
          </button>
        </div>
        {rapprochement.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{rapprochement.fait}</span>}
        {rapprochement.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{rapprochement.echec}</span>}
      </form>
      <form action={prelever} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={note}>
          Appelle les mensualités dues. Un prélèvement refusé n&rsquo;est pas rappelé automatiquement : le rattrapage passe
          par la relance.
        </p>
        <div>
          <button type="submit" className="bouton-discret" disabled={enPrelevement}>
            {enPrelevement ? "…" : "Appeler les mensualités"}
          </button>
        </div>
        {prelevement.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{prelevement.fait}</span>}
        {prelevement.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{prelevement.echec}</span>}
      </form>
    </div>
  );
}
