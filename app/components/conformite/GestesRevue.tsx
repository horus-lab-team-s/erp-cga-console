"use client";

import { useActionState, useEffect, useState } from "react";

import { exporterLesDerogations, signalerUneRegle } from "@/app/lib/actions-conformite-revue";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

/** Les gestes des écrans de revue (pas 99) : exporter le journal, signaler une règle. */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };

export function ExporterLeJournal({ filtres }: { filtres: Record<string, string | undefined> }) {
  const [etat, exporter, enCours] = useActionState(exporterLesDerogations, { echec: null, fichier: null });
  useEffect(() => {
    if (etat.fichier) declencherTelechargement(etat.fichier);
  }, [etat.fichier]);
  return (
    <form action={exporter} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {Object.entries(filtres).map(([cle, valeur]) => (valeur ? <input key={cle} type="hidden" name={cle} value={valeur} /> : null))}
      <button type="submit" className="action-secondaire" disabled={enCours}>
        {enCours ? "…" : "Exporter pour contrôle"}
      </button>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}

export function SignalerLaRegle({ code }: { code: string }) {
  const [etat, envoyer, enCours] = useActionState(signalerUneRegle, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Signaler au fiscaliste
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="code" value={code} />
      <input name="motif" required minLength={10} placeholder="Ce qui ne va pas…" aria-label={`Motif du signalement de ${code}`} style={{ padding: "4px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", font: "400 12.5px/1.4 var(--police-texte)", minWidth: 220 }} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Signaler"}
      </button>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}
