"use client";

import { useActionState, useState } from "react";

import { validerLaReaffectation } from "@/app/lib/actions-pilotage-charge";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Valider une réaffectation proposée (pas 105). Le motif est demandé et jamais prérempli :
 * c'est lui que lira le chargé de clientèle du dossier.
 *
 * « Écarter » une proposition n'est pas conservé : une proposition se recalcule à chaque
 * lecture, et une proposition écartée qui reviendrait le lendemain dit qu'elle est toujours
 * fondée. Le bouton la masque pour la séance.
 */
export function ValiderLaReaffectation({ dossier, de, vers, libelle }: { dossier: string; de: string; vers: string; libelle: string }) {
  const [etat, envoyer, enCours] = useActionState(validerLaReaffectation, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [ecartee, setEcartee] = useState(false);
  const [motif, setMotif] = useState("");
  const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)" };
  if (etat.fait) return <p role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</p>;
  if (ecartee) return <p style={{ ...note, color: "var(--ink-500)" }}>Proposition écartée pour cette séance.</p>;
  if (!ouvert) {
    return (
      <span style={{ display: "inline-flex", gap: 8 }}>
        <button type="button" className="action-secondaire" onClick={() => setOuvert(true)}>
          Valider
        </button>
        <button type="button" className="bouton-discret" onClick={() => setEcartee(true)}>
          Écarter
        </button>
      </span>
    );
  }
  return (
    <form action={envoyer} style={{ display: "grid", gap: 6, width: "100%" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="de" value={de} />
      <input type="hidden" name="vers" value={vers} />
      <input
        name="motif"
        required
        minLength={10}
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Pourquoi ce dossier change de comptable"
        aria-label={`Motif de la réaffectation de ${libelle}`}
        style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", font: "400 13px/1.4 var(--police-texte)", width: "100%", boxSizing: "border-box" }}
      />
      <span style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Réaffecter"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </span>
      {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</p>}
    </form>
  );
}
