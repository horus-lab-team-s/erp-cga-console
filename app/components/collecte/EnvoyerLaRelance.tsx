"use client";

import { useActionState, useState } from "react";

import { envoyerLaRelance } from "@/app/lib/actions-collecte";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { soumettreSansReinitialiser } from "@/app/lib/soumission";

/**
 * Envoyer la relance (pas 111). Composant client : ni `api.ts` ni `relance-des-pieces.ts` ici.
 *
 * ⚠️ Des cases à cocher (les canaux) dans un formulaire relié à une action : soumis sans
 * réinitialisation, sinon un refus décocherait les canaux à l'écran (leçon du pas 108).
 * Les pièces cochées viennent de la page, qui les a déjà fait éprouver par l'aperçu.
 */

type Canal = { canal: "APPLICATION" | "COURRIEL" | "WHATSAPP"; actif: boolean; par_defaut: boolean; motif: string | null };

const LIBELLES = { APPLICATION: "Application", COURRIEL: "Courriel", WHATSAPP: "WhatsApp" } as const;
const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };

export function EnvoyerLaRelance({
  dossier,
  mois,
  modele,
  attentes,
  canaux,
  sansDestinataire,
}: {
  dossier: string;
  mois: string;
  modele: string;
  attentes: string[];
  canaux: Canal[];
  sansDestinataire: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(envoyerLaRelance, ETAT_ACTE_INITIAL);
  const [choisis, setChoisis] = useState<Set<string>>(new Set(canaux.filter((c) => c.actif && c.par_defaut).map((c) => c.canal)));
  const basculer = (canal: string) =>
    setChoisis((avant) => {
      const apres = new Set(avant);
      if (apres.has(canal)) apres.delete(canal);
      else apres.add(canal);
      return apres;
    });

  return (
    <form onSubmit={soumettreSansReinitialiser(envoyer)} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="mois" value={mois} />
      <input type="hidden" name="modele" value={modele} />
      {attentes.map((code) => (
        <input key={code} type="hidden" name="attente" value={code} />
      ))}
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <legend style={{ font: "600 12px/1.4 var(--police-texte)", marginBottom: 6 }}>Canaux</legend>
        {canaux.map((c) => (
          <label
            key={c.canal}
            title={c.actif ? undefined : c.motif ?? undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: "var(--rayon)",
              border: `1px solid ${choisis.has(c.canal) ? "var(--brand-magenta-600)" : "var(--line-200)"}`,
              background: choisis.has(c.canal) ? "var(--brand-magenta-100)" : "var(--surface)",
              color: c.actif ? "var(--ink-900)" : "var(--ink-300)",
              font: "500 12.5px/1.2 var(--police-texte)",
            }}
          >
            <input type="checkbox" name="canal" value={c.canal} disabled={!c.actif} checked={choisis.has(c.canal)} onChange={() => basculer(c.canal)} />
            {LIBELLES[c.canal]}
            {!c.actif && " (inactif)"}
          </label>
        ))}
      </fieldset>
      {canaux.some((c) => !c.actif) && (
        <p style={note}>
          {canaux
            .filter((c) => !c.actif)
            .map((c) => `${LIBELLES[c.canal]} : ${c.motif}`)
            .join(" · ")}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button type="submit" className="action-principale" disabled={enCours || attentes.length === 0 || choisis.size === 0 || sansDestinataire}>
          {enCours ? "…" : "Envoyer maintenant"}
        </button>
        {sansDestinataire && <span style={{ ...note, color: "var(--danger)" }}>Aucun compte adhérent actif : relancer par téléphone, puis tracer la relance.</span>}
      </div>
      {etat.echec && (
        <p role="alert" style={{ ...note, color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
      {etat.fait && (
        <p role="status" style={{ ...note, color: "var(--success)" }}>
          {etat.fait}
        </p>
      )}
    </form>
  );
}
