"use client";

import { useActionState, useState } from "react";

import { genererLeRapport } from "@/app/lib/actions-rapport-mensuel";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/** Générer le rapport d'un mois, et l'imprimer (pas 106). */

export function GenererLeRapport({ moisParDefaut }: { moisParDefaut: string }) {
  const [etat, envoyer, enCours] = useActionState(genererLeRapport, ETAT_ACTE_INITIAL);
  const [mois, setMois] = useState(moisParDefaut);
  return (
    <form action={envoyer} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "12px 16px" }}>
      <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
        Mois
        <input type="month" name="mois" required value={mois} onChange={(e) => setMois(e.target.value)} style={{ padding: "6px 8px" }} />
      </label>
      <button type="submit" className="action-principale" disabled={enCours}>
        {enCours ? "Génération…" : "Générer le rapport mensuel"}
      </button>
      {etat.echec && (
        <p role="alert" style={{ margin: 0, flexBasis: "100%", font: "400 12px/1.5 var(--police-texte)", color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
    </form>
  );
}

/** L'export PDF passe par l'impression du navigateur : voir les règles `@media print`. */
export function ImprimerLeRapport() {
  return (
    <button type="button" className="action-secondaire sans-impression" onClick={() => window.print()}>
      Exporter en PDF (imprimer)
    </button>
  );
}
