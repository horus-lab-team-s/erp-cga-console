"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { ADRESSE_VITRINE } from "@/app/lib/adresse-vitrine";
import "@/app/styles/vitrine.css";

/**
 * Le filet, sous tout ce que le groupe collaborateur ne couvre pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUI N'ÉTAIT PAS COUVERT, ET QUI EST LE PLUS EXPOSÉ
 *
 * Un seul filet existait, sur le groupe `(collaborateur)`. Restaient sans
 * aucune protection : la connexion, l'activation d'un compte, l'oubli et la
 * réinitialisation de mot de passe, la bibliothèque, les courriels, et tout
 * l'espace `(adherent)`.
 *
 * Ce sont précisément les écrans où l'on n'est PAS encore identifié, donc ceux
 * qu'un inconnu atteint, et ceux où une panne coûte le plus cher : un adhérent
 * qui n'arrive pas à activer son compte n'a personne à qui le dire.
 *
 * Mesuré sur la vitrine, qui avait le même trou : le cadre rend un corps vide en
 * HTTP 500, que le navigateur remplace par sa page interne — « This page
 * couldn't load », en anglais, sans marque, avec un numéro d'erreur brut.
 *
 * ⚠️ LE FILET LE PLUS SPÉCIFIQUE L'EMPORTE. Celui du groupe `(collaborateur)`
 * continue de servir ses écrans : il sait distinguer un refus d'habilitation
 * d'une panne, ce que celui-ci ne peut pas faire puisqu'il couvre aussi des
 * pages où personne n'est connecté.
 *
 * ⚠️ MÊME DESSIN DE CUL-DE-SAC QUE LA PAGE « INTROUVABLE », et pour la même
 * raison : on ne sait pas qui est devant l'écran. Servir la coquille
 * authentifiée révélerait la barre latérale et la liste des écrans à un inconnu.
 *
 * ⚠️ `error.message` n'est jamais affiché : le détail d'une panne peut dire quel
 * dossier existe. `digest` l'est, parce que c'est l'identifiant journalisé côté
 * serveur, et le seul moyen pour quelqu'un de désigner SON incident au
 * téléphone.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function ErreurConsole({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("pages.panne");
  const commun = useTranslations("commun");

  return (
    <div className="vitrine">
      <main
        style={{
          minHeight: "100vh",
          padding: "48px 0",
          background: "var(--brand-indigo-900)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="bloc bloc--etroit">
          <a href={ADRESSE_VITRINE} style={{ display: "inline-block", marginBottom: 28 }}>
            <Image
              src="/marque/cga-logo-blanc.png"
              alt={commun("cabinet.nom")}
              width={132}
              height={74}
              priority
              style={{ width: 132, height: "auto" }}
            />
          </a>
          <span className="heros__kicker">{t("kicker")}</span>
          <h1 className="heros__titre">{t("titre")}</h1>
          <p className="heros__detail">{t("detail")}</p>

          {/* ⚠️ `role="alert"` : la panne survient après le chargement, rien ne
              signalerait autrement à un lecteur d'écran que le contenu a changé. */}
          <p role="alert" className="heros__detail" style={{ marginTop: 18 }}>
            {t("prudence")}
          </p>

          {error.digest && (
            <p className="heros__detail" style={{ marginTop: 14 }}>
              {t("reference")} : <code>{error.digest}</code>
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            <button type="button" className="bouton bouton--principal" onClick={reset}>
              {t("reessayer")}
            </button>
            <a href={ADRESSE_VITRINE} className="bouton bouton--clair">
              {commun("actions.retourVitrine")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
