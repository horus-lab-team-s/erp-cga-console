"use client";

import { useActionState } from "react";

import { CleAffichee, SaisieDuCode } from "@/app/components/securite/CleEtCode";
import { confirmerEnrolement, type EtatEnrolement } from "@/app/lib/actions-second-facteur";

const INITIAL: EtatEnrolement = {
  echec: null,
  secret: null,
  uri: null,
  consigne: null,
  confirmation_par_courriel: false,
};

/**
 * La page où mène le lien reçu : un bouton, puis la clé et le premier code.
 *
 * ⚠️ Le jeton n'est présenté qu'au clic. Voir `confirmerEnrolement`.
 */
export function ConfirmationEnrolement({ jeton }: { jeton: string }) {
  const [etat, confirmer, enCours] = useActionState(confirmerEnrolement, INITIAL);
  const note: React.CSSProperties = { margin: 0, font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-500)" };

  if (etat.secret) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px" }}>
        <CleAffichee secret={etat.secret} uri={etat.uri} qr={etat.qr_svg ?? null} consigne={etat.consigne} />
        <p style={note}>
          <strong>3.</strong> Saisissez le code à six chiffres que l&rsquo;application affiche
          maintenant, puis « Activer ». Le code change toutes les trente secondes : prenez celui
          qui est affiché au moment où vous validez.
        </p>
        <SaisieDuCode activation />
      </div>
    );
  }
  return (
    <form action={confirmer} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px" }}>
      <input type="hidden" name="jeton" value={jeton} />
      <p style={note}>
        Préparez votre téléphone avec une application d&rsquo;authentification (Google
        Authenticator, Microsoft Authenticator, 2FAS…). En cliquant sur « Afficher ma clé »,
        un code QR s&rsquo;affiche : il ne s&rsquo;affichera qu&rsquo;une fois.
      </p>
      <div>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Afficher ma clé"}
        </button>
      </div>
      {etat.echec && (
        <p role="alert" style={{ ...note, color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
    </form>
  );
}
