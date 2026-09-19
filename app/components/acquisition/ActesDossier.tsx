"use client";

import { useActionState, useState } from "react";

import { affecterLeDossier, classerSansSuite, cloreLeRappel } from "@/app/lib/actions-acquisition";
import type { MotifDeClassement } from "@/app/lib/console-acquisition";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const note: React.CSSProperties = { margin: 0, font: "400 11.5px/1.45 var(--police-texte)", color: "var(--ink-500)" };

function Retour({ echec, fait }: { echec: string | null; fait: string | null }) {
  if (fait) return <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>{fait}</span>;
  if (echec) return <span role="alert" style={{ ...note, display: "block", color: "var(--danger)" }}>{echec}</span>;
  return null;
}

/** Affecter, ou réaffecter : une seule route, le backend choisit selon l'état. */
export function Affecter({ reference, reaffecter }: { reference: string; reaffecter: boolean }) {
  const [etat, envoyer, enCours] = useActionState(affecterLeDossier, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "inline" }}>
      <input type="hidden" name="reference" value={reference} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : reaffecter ? "Réaffecter" : "Affecter"}
      </button>
      <Retour {...etat} />
    </form>
  );
}

/**
 * Classer sans suite, replié, avec un motif du vocabulaire.
 *
 * ⚠️ La précision n'est pas exigée par l'écran : c'est le motif choisi qui la rend
 * obligatoire, et le backend le dit. L'écran signale seulement les motifs qui la
 * demandent.
 */
export function ClasserSansSuite({ reference, motifs }: { reference: string; motifs: MotifDeClassement[] }) {
  const [etat, envoyer, enCours] = useActionState(classerSansSuite, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour {...etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Sans suite
      </button>
    );
  }
  const champ: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 4,
    padding: "4px 8px",
    border: "1px solid var(--line-200)",
    borderRadius: "var(--rayon-petit)",
    font: "400 12px/1.4 var(--police-texte)",
  };
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, minWidth: 220 }}>
      <input type="hidden" name="reference" value={reference} />
      <select name="motif" required defaultValue="" style={champ}>
        <option value="" disabled>
          Motif
        </option>
        {motifs.map((m) => (
          <option key={m.code} value={m.code}>
            {m.libelle}
            {m.precision_requise ? " (précision requise)" : ""}
          </option>
        ))}
      </select>
      <input name="precision" placeholder="Précision" maxLength={500} style={champ} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Classer"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      <Retour {...etat} />
    </form>
  );
}

/** Noter qu'on a rappelé. Le nom inscrit est celui de la session, jamais saisi. */
export function RappelFait({ identifiant }: { identifiant: string }) {
  const [etat, envoyer, enCours] = useActionState(cloreLeRappel, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour {...etat} />;
  return (
    <form action={envoyer}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "J’ai appelé"}
      </button>
      <Retour {...etat} />
    </form>
  );
}
