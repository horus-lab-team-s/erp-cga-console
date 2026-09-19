"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { connexion, type EtatConnexion } from "@/app/lib/actions-session";
import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Formulaire de connexion à l'espace client.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'AUTHENTIFICATION SE FAIT CÔTÉ SERVEUR, ET RIEN NE TRANSITE PAR LE NAVIGATEUR
 *
 * Ce composant ne compare rien, ne connaît aucun identifiant, et ne sait pas
 * décider. Il envoie un formulaire à une action serveur, qui appelle le backend,
 * pose le témoin `HttpOnly` et redirige. Voir `app/lib/actions-session.ts`.
 *
 * Il en découle une propriété qui manquait à la version précédente : **la page
 * de destination est réellement gardée**. Taper `/tableau-de-bord` dans la barre
 * d'adresse sans session renvoie ici, parce que le gabarit `(collaborateur)`
 * vérifie la session avant de rendre quoi que ce soit.
 *
 * LE ROUTAGE APRÈS CONNEXION N'EST PAS UN CHOIX OFFERT
 *
 * La page ne demande pas « êtes-vous collaborateur ou adhérent ». Le backend rend
 * `interne`, et l'action serveur route en conséquence. Poser la question
 * apprendrait au visiteur qu'il existe deux espaces, et laisserait un adhérent
 * atterrir sur des écrans dont aucune donnée ne le concerne.
 *
 * LE MESSAGE D'ÉCHEC VIENT DU BACKEND, TEL QUEL
 *
 * Il est **le même** quelle que soit la cause — compte inconnu, mot de passe
 * faux, compte suspendu, jamais activé, verrouillé. Le préciser ici rouvrirait
 * l'oracle d'énumération que le backend prend soin de refermer : on essaie une
 * liste d'adresses, on note ce qui répond différemment, et l'on obtient la liste
 * des adhérents du cabinet.
 *
 * LE FORMULAIRE FONCTIONNE SANS JAVASCRIPT
 *
 * `action={...}` sur un `<form>` : la soumission est un POST ordinaire tant que
 * le script n'a pas pris la main. Sur les connexions visées, c'est la différence
 * entre « je peux me connecter » et « la page ne fait rien ».
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ETAT_INITIAL: EtatConnexion = { echec: null };

export function FormulaireConnexion() {
  const t = useTranslations("pages.connexion");
  const [etat, envoyer, enCours] = useActionState(connexion, ETAT_INITIAL);

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
      <div>
        <label style={etiquette} htmlFor="courriel">
          {t("identifiant")}
        </label>
        <input
          id="courriel"
          name="courriel"
          type="email"
          required
          style={saisie}
          autoComplete="username"
          aria-invalid={etat.echec !== null}
        />
      </div>

      <div>
        <label style={etiquette} htmlFor="motDePasse">
          {t("motDePasse")}
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          required
          style={saisie}
          autoComplete="current-password"
          aria-invalid={etat.echec !== null}
        />
      </div>

      {/* `role="alert"` : le refus est annoncé sans déplacer le focus, la
          correction se fait dans le champ où l'on est déjà. */}
      {etat.echec && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "10px 12px",
            borderRadius: 9,
            background: "rgb(255 255 255 / 12%)",
            border: "1px solid var(--danger)",
            font: "500 12.5px/1.55 var(--police-texte)",
            color: "#fff",
          }}
        >
          {etat.echec}
        </p>
      )}

      <button
        type="submit"
        className="bouton bouton--inverse formulaire-heros__envoi"
        disabled={enCours}
      >
        {enCours ? "Connexion…" : t("bouton")}
        <IconeVitrine nom="connexion" taille={16} />
      </button>

      <p className="formulaire-heros__pied">{t("aide")}</p>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          paddingTop: 4,
        }}
      >
        {/* ⚠️ Ce lien manquait. « Mot de passe oublié ? » figurait dans les
            traductions depuis l'origine et n'était rendu nulle part : la route
            backend, le gabarit de courriel et le jeton de deux heures
            existaient tous, sans aucun moyen de les déclencher depuis le site.
            Un adhérent qui oubliait son mot de passe n'avait que le téléphone. */}
        <Link
          href="/mot-de-passe-oublie"
          style={{ font: "600 12.5px/1.4 var(--police-texte)", color: "rgb(255 255 255 / 72%)" }}
        >
          {t("oubli")}
        </Link>
        <Link
          href="/devenir-adherent"
          style={{ font: "600 12.5px/1.4 var(--police-texte)", color: "#d9a3d6" }}
        >
          {t("creer")}
        </Link>
        <Link
          href="/"
          style={{ font: "600 12.5px/1.4 var(--police-texte)", color: "rgb(255 255 255 / 72%)" }}
        >
          {t("retour")}
        </Link>
      </div>

      <p
        style={{
          margin: 0,
          paddingTop: 12,
          borderTop: "1px solid rgb(255 255 255 / 18%)",
          font: "400 11.5px/1.6 var(--police-texte)",
          color: "rgb(255 255 255 / 62%)",
        }}
      >
        {t("note")}
      </p>
    </form>
  );
}
