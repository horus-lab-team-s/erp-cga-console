"use client";

import { useActionState } from "react";

import { renvoyerUnLienDAcces } from "@/app/lib/actions-portefeuille";
import type { AccesDUnAdherent } from "@/app/lib/portefeuille";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const ETATS: Record<AccesDUnAdherent["etat"], string> = {
  EN_ATTENTE_ACTIVATION: "En attente d'activation : le mot de passe n'a jamais été défini",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
};

/**
 * « Renvoyer un lien d'accès » (pas 116, maquette « Espace adhérent », vue A, note 5).
 *
 * ⚠️ Le lien part **à l'adresse affichée**, et nulle part ailleurs : un appelant qui demande de
 * l'envoyer à une autre adresse est le scénario d'usurpation. La vérification est obligatoire et va
 * au journal, au nom du chargé de clientèle.
 */
export function AccesDesAdherents({ dossier, acces }: { dossier: string; acces: AccesDUnAdherent[] }) {
  if (acces.length === 0) {
    return <p style={{ margin: 0, padding: "10px 16px", font: "400 13px/1.5 var(--police-texte)" }}>Aucun compte adhérent sur ce dossier.</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {acces.map((a) => (
        <li key={a.compte} style={{ padding: "10px 16px", borderTop: "1px solid var(--line-100)" }}>
          <UnAdherent dossier={dossier} acces={a} />
        </li>
      ))}
    </ul>
  );
}

function UnAdherent({ dossier, acces: a }: { dossier: string; acces: AccesDUnAdherent }) {
  const [etat, agir, enCours] = useActionState(renvoyerUnLienDAcces, ETAT_ACTE_INITIAL);
  const texte: React.CSSProperties = { margin: 0, font: "400 13px/1.5 var(--police-texte)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={texte}>
        <strong>{a.nom}</strong> · {a.courriel}
        {a.telephone ? ` · ${a.telephone}` : ""} · {ETATS[a.etat]}
      </p>
      {a.liens_renvoyes.slice(0, 3).map((l) => (
        <p key={l.le} style={{ ...texte, color: "var(--ink-500)" }}>
          Lien {l.type === "ACTIVATION" ? "d'activation" : "de réinitialisation"} renvoyé le{" "}
          {l.le.slice(0, 10).split("-").reverse().join("/")} par {l.par} : « {l.verification} »
        </p>
      ))}
      {a.etat !== "SUSPENDU" && (
        <form action={agir} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="compte" value={a.compte} />
          <label style={{ flex: "1 1 260px", font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
            Comment avez-vous reconnu votre interlocuteur ?
            <input
              name="verification"
              required
              maxLength={300}
              placeholder="Rappelé au numéro du dossier"
              style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 2, padding: "5px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", font: "400 13px/1.4 var(--police-texte)" }}
            />
          </label>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {a.etat === "ACTIF" ? "Renvoyer un lien de réinitialisation" : "Renvoyer le lien d'activation"}
          </button>
        </form>
      )}
      <p style={{ ...texte, color: "var(--ink-500)", fontSize: 12 }}>
        Le lien part à l&rsquo;adresse ci-dessus, jamais à une autre : une adresse à changer se signale et s&rsquo;instruit à part.
      </p>
      {etat.echec && <p role="alert" style={{ ...texte, color: "var(--danger)" }}>{etat.echec}</p>}
      {etat.fait && <p role="status" style={{ ...texte, color: "var(--success)" }}>{etat.fait}</p>}
    </div>
  );
}
