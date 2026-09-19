"use client";

import { useActionState } from "react";

import { SaisieDuCode } from "@/app/components/securite/CleEtCode";
import { enrolerSecondFacteur, type EtatEnrolement } from "@/app/lib/actions-second-facteur";

/**
 * Ce qui se tient devant un geste qui exige le second facteur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX ÉTATS, ET L'ÉCRAN NE LES CONFOND PAS
 *
 *   jamais enrôlé   demander l'association : un lien part à l'adresse du compte,
 *                   et la clé s'affiche sur la page où ce lien mène (pas 62)
 *   enrôlé          saisir un code : c'est tout
 *
 * ⚠️ AUCUNE CLÉ NE S'AFFICHE ICI
 *
 * Depuis le pas 62, un premier enrôlement se prouve par la boîte aux lettres : la
 * session seule, donc le mot de passe seul, ne rend plus de clé. Et l'écran ne
 * propose jamais de ré-enrôler : un appareil perdu se réinitialise par
 * l'administrateur (pas 60).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ENROLEMENT_INITIAL: EtatEnrolement = {
  echec: null,
  secret: null,
  uri: null,
  consigne: null,
  confirmation_par_courriel: false,
};

const note: React.CSSProperties = {
  margin: 0,
  font: "400 12.5px/1.5 var(--police-texte)",
  color: "var(--ink-500)",
};

export function PorteSecondFacteur({ enrole, geste }: { enrole: boolean; geste: string }) {
  const [enrolement, enroler, enCours] = useActionState(enrolerSecondFacteur, ENROLEMENT_INITIAL);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 16px" }}>
      <p style={note}>
        <strong style={{ color: "var(--ink-900)" }}>{geste} exige le second facteur.</strong>{" "}
        La session reste renforcée quinze minutes.
      </p>

      {enrole ? (
        <SaisieDuCode />
      ) : enrolement.confirmation_par_courriel ? (
        <p role="status" style={{ ...note, color: "var(--ink-900)" }}>
          {enrolement.consigne}
        </p>
      ) : (
        <form action={enroler}>
          <p style={{ ...note, marginBottom: 8 }}>
            Aucune application d&rsquo;authentification n&rsquo;est associée à votre compte. Un
            lien de confirmation sera envoyé à votre adresse.
          </p>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Associer une application d’authentification"}
          </button>
          {enrolement.echec && (
            <p role="alert" style={{ ...note, color: "var(--danger)", marginTop: 6 }}>
              {enrolement.echec}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
