"use client";

import { useActionState } from "react";

import { definirMotDePasse, type EtatDefinition } from "@/app/lib/actions-session";

/**
 * Choisir son mot de passe à partir d'un lien reçu par courriel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SERT DEUX PARCOURS QUI SE RESSEMBLENT SANS ÊTRE LE MÊME
 *
 * L'**activation** conclut une souscription : l'adhérent vient de payer, il
 * n'a jamais eu de mot de passe. La **réinitialisation** répare un oubli : le
 * compte existe et fonctionne.
 *
 * Le geste est identique, le contexte non — d'où le même formulaire et deux
 * pages qui le présentent différemment.
 *
 * ⚠️ LE JETON VOYAGE DANS UN CHAMP CACHÉ, PAS DANS L'ACTION
 *
 * Il vient de l'URL, donc du courriel. Le mettre dans un champ caché du
 * formulaire plutôt que de le refermer dans l'action serveur garde la page
 * fonctionnelle **sans JavaScript** : la soumission reste un POST ordinaire.
 * Sur les liaisons visées, c'est la différence entre « je peux activer mon
 * compte » et « le bouton ne fait rien ».
 *
 * Le jeton apparaît donc dans le balisage de la page. Ce n'est pas une fuite :
 * il est déjà dans la barre d'adresse, et il ne vaut que le temps d'un usage.
 *
 * LA CONFIRMATION SE VÉRIFIE AVANT L'APPEL
 *
 * Le lien est à usage unique. Le laisser consommer par une faute de frappe
 * obligerait à en redemander un — à quelqu'un qui vient de payer et qui ne
 * comprendrait pas pourquoi.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ETAT_INITIAL: EtatDefinition = { echec: null };

export function FormulaireMotDePasse({
  jeton,
  libelleAction,
}: {
  jeton: string;
  libelleAction: string;
}) {
  const [etat, envoyer, enCours] = useActionState(definirMotDePasse, ETAT_INITIAL);

  const etiquette: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    font: "600 11.5px/1.4 var(--police-texte)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "rgb(255 255 255 / 72%)",
  };
  const saisie: React.CSSProperties = {
    width: "100%",
    minHeight: 46,
    padding: "0 12px",
    border: "1px solid rgb(255 255 255 / 26%)",
    borderRadius: 9,
    background: "rgb(255 255 255 / 10%)",
    color: "#fff",
    font: "500 14px/1.3 var(--police-texte)",
  };

  return (
    <form className="formulaire-heros" action={envoyer}>
      <input type="hidden" name="jeton" value={jeton} />

      <div>
        <label style={etiquette} htmlFor="motDePasse">
          Nouveau mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          // ⚠️ `new-password` et non `current-password` : sans cela, le
          // gestionnaire de mots de passe propose l'ancien, qui est
          // précisément celui qu'on remplace.
          autoComplete="new-password"
          style={saisie}
        />
      </div>

      <div>
        <label style={etiquette} htmlFor="confirmation">
          Confirmer
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          style={saisie}
        />
      </div>

      {etat.echec && (
        <p role="alert" style={{ color: "#ffd9d6", font: "500 13px/1.5 var(--police-texte)" }}>
          {etat.echec}
        </p>
      )}

      <button type="submit" className="bouton bouton--principal" disabled={enCours}>
        {enCours ? "Un instant…" : libelleAction}
      </button>

      <p style={{ font: "400 12px/1.55 var(--police-texte)", color: "rgb(255 255 255 / 66%)" }}>
        Personne au cabinet ne connaîtra ce mot de passe, et personne ne vous le
        demandera jamais — ni par téléphone, ni par courriel.
      </p>
    </form>
  );
}
