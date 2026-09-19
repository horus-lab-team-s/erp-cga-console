"use client";

import { useActionState } from "react";

import { renforcerLaSession } from "@/app/lib/actions-second-facteur";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const note: React.CSSProperties = {
  margin: 0,
  font: "400 12.5px/1.5 var(--police-texte)",
  color: "var(--ink-500)",
};

/**
 * La clé affichée une fois, par groupes de quatre, avec le lien `otpauth://`.
 *
 * Séparée de la saisie du code : la page de confirmation montre les deux, la porte
 * d'un geste sensible ne montre que le code.
 */
export function CleAffichee({
  secret,
  uri,
  consigne,
}: {
  secret: string;
  uri: string | null;
  consigne: string | null;
}) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }}>
      <p style={note}>Saisissez cette clé dans l&rsquo;application, ou ouvrez le lien depuis le téléphone :</p>
      <p style={{ margin: "6px 0", font: "600 15px/1.4 var(--police-mono)", letterSpacing: "0.08em", wordBreak: "break-all" }}>
        {secret.match(/.{1,4}/g)?.join(" ")}
      </p>
      {uri && (
        <a href={uri} style={{ font: "400 12.5px/1.5 var(--police-texte)" }}>
          Ouvrir dans l&rsquo;application d&rsquo;authentification
        </a>
      )}
      {consigne && <p style={{ ...note, marginTop: 6 }}>{consigne}</p>}
      <p style={{ ...note, marginTop: 6, color: "var(--warning)" }}>
        Cette clé ne sera plus affichée : ne la conservez nulle part ailleurs que dans l&rsquo;application.
      </p>
    </div>
  );
}

/** La saisie d'un code, qui renforce la session pour quinze minutes. */
export function SaisieDuCode() {
  const [etat, renforcer, enCours] = useActionState(renforcerLaSession, ETAT_ACTE_INITIAL);
  return (
    <form action={renforcer} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
        Code à six chiffres{" "}
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={9}
          style={{
            width: 110,
            padding: "4px 8px",
            border: "1px solid var(--line-200)",
            borderRadius: "var(--rayon-petit)",
            font: "500 14px/1.4 var(--police-mono)",
          }}
        />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Renforcer la session"}
      </button>
      {etat.echec && (
        <span role="alert" style={{ ...note, color: "var(--danger)" }}>
          {etat.echec}
        </span>
      )}
      {etat.fait && (
        <span role="status" style={{ ...note, color: "var(--success)" }}>
          {etat.fait}
        </span>
      )}
    </form>
  );
}
