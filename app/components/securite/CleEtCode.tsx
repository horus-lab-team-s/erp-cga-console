"use client";

import { useActionState } from "react";

import { activerLeSecondFacteur, renforcerLaSession } from "@/app/lib/actions-second-facteur";
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
  qr = null,
  consigne,
}: {
  secret: string;
  uri: string | null;
  qr?: string | null;
  consigne: string | null;
}) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }}>
      {/* 17 novembre 2026 : le code QR d'abord. La clé seule, recopiée à la main, a fait
          échouer l'association en recette en ligne : une faute de frappe rend tous les
          codes faux sans que rien ne le signale. */}
      <p style={note}>
        <strong>1.</strong> Dans l&rsquo;application d&rsquo;authentification du téléphone,
        choisissez « Ajouter un compte » puis « Scanner un code QR », et visez ce code :
      </p>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element -- une image en ligne, sans optimisation possible
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`}
          alt="Code QR de votre clé, à scanner avec l'application d'authentification"
          width={200}
          height={200}
          style={{ display: "block", margin: "8px 0", imageRendering: "pixelated" }}
        />
      )}
      <p style={note}>
        <strong>2.</strong> L&rsquo;application ajoute « CGA Broad Range ». Si le scan est impossible,
        saisissez plutôt cette clé à la main (type « basé sur le temps »), ou, sur le téléphone,
        touchez le lien :
      </p>
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
        Elle ne protège votre compte qu&rsquo;après la saisie du premier code ; si cette page se ferme
        avant, redemandez simplement l&rsquo;association.
      </p>
    </div>
  );
}

/**
 * La saisie d'un code. Par défaut elle renforce la session pour quinze minutes ;
 * `activation` : c'est le premier code, qui active la clé qu'on vient d'afficher.
 */
export function SaisieDuCode({ activation = false }: { activation?: boolean } = {}) {
  const [etat, renforcer, enCours] = useActionState(
    activation ? activerLeSecondFacteur : renforcerLaSession,
    ETAT_ACTE_INITIAL,
  );
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
        {enCours ? "…" : activation ? "Activer" : "Renforcer la session"}
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
