"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Formulaire de connexion à l'espace client.
 *
 * ⚠️ CE N'EST PAS UNE AUTHENTIFICATION. La comparaison se fait **dans le
 * navigateur**, contre deux constantes présentes dans le code livré au visiteur.
 * N'importe qui peut les lire, et n'importe qui peut atteindre
 * `/tableau-de-bord` en tapant l'adresse : rien ne garde cette page.
 *
 * C'est un ouvre-porte de démonstration, assumé comme tel, pour que le parcours
 * « vitrine → espace client → tableau de bord » se parcoure du doigt pendant les
 * recettes. La vraie authentification appartient au backend : jeton signé émis
 * par FastAPI, session en cookie `httpOnly`, et vérification côté serveur dans
 * le layout `(collaborateur)`. Tant que ce n'est pas fait, aucune donnée réelle
 * ne doit être exposée derrière cet écran.
 *
 * Les identifiants sont affichés à l'écran : les cacher ne protégerait rien
 * puisqu'ils sont dans le code, et les montrer évite d'avoir à les demander.
 */

const IDENTIFIANT_DEMO = "demo@cga-brcgroup.com";
const MOT_DE_PASSE_DEMO = "CGA-demo-2026";

export function FormulaireConnexion() {
  const t = useTranslations("pages.connexion");
  const routeur = useRouter();

  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [refuse, setRefuse] = useState(false);
  const [enCours, setEnCours] = useState(false);

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

  function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const juste =
      identifiant.trim().toLowerCase() === IDENTIFIANT_DEMO && motDePasse === MOT_DE_PASSE_DEMO;
    if (!juste) {
      setRefuse(true);
      return;
    }
    setRefuse(false);
    setEnCours(true);
    routeur.push("/tableau-de-bord");
  }

  return (
    <form className="formulaire-heros" onSubmit={soumettre}>
      <div>
        <label style={etiquette} htmlFor="identifiant">
          {t("identifiant")}
        </label>
        <input
          id="identifiant"
          type="text"
          style={saisie}
          autoComplete="username"
          value={identifiant}
          onChange={(e) => {
            setIdentifiant(e.target.value);
            setRefuse(false);
          }}
          aria-invalid={refuse}
        />
      </div>

      <div>
        <label style={etiquette} htmlFor="motdepasse">
          {t("motDePasse")}
        </label>
        <input
          id="motdepasse"
          type="password"
          style={saisie}
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => {
            setMotDePasse(e.target.value);
            setRefuse(false);
          }}
          aria-invalid={refuse}
        />
      </div>

      <label
        style={{
          display: "flex",
          gap: 9,
          alignItems: "center",
          font: "400 12.5px/1.5 var(--police-texte)",
          color: "rgb(255 255 255 / 72%)",
        }}
      >
        <input type="checkbox" />
        {t("garder")}
      </label>

      {/* `role="alert"` : le refus est annoncé sans déplacer le focus, la
          correction se fait dans le champ où l'on est déjà. */}
      {refuse && (
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
          {t("refus")}
        </p>
      )}

      <button
        type="submit"
        className="bouton bouton--principal formulaire-heros__envoi"
        disabled={enCours}
      >
        {t("bouton")}
        <IconeVitrine nom="connexion" taille={16} />
      </button>

      <p className="formulaire-heros__pied">{t("aide")}</p>

      {/* Les identifiants de démonstration, à l'écran. Ils sont de toute façon
          dans le code envoyé au navigateur : les masquer ne protégerait rien. */}
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 9,
          background: "rgb(255 255 255 / 8%)",
          border: "1px dashed rgb(255 255 255 / 30%)",
          font: "400 12px/1.7 var(--police-texte)",
          color: "rgb(255 255 255 / 82%)",
        }}
      >
        <strong style={{ display: "block", marginBottom: 2 }}>{t("demoTitre")}</strong>
        <code style={{ fontFamily: "var(--police-mono, monospace)" }}>{IDENTIFIANT_DEMO}</code>
        <br />
        <code style={{ fontFamily: "var(--police-mono, monospace)" }}>{MOT_DE_PASSE_DEMO}</code>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          paddingTop: 4,
        }}
      >
        <Link
          href="/estimation"
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
