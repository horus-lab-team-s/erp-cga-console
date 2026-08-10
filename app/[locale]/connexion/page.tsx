import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { Link } from "@/i18n/navigation";
import "@/app/styles/vitrine.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.connexion" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page de connexion — maquette, section `surConnexion`.
 *
 * Elle vit HORS du groupe `(vitrine)` : pas d'en-tête de navigation, pas de pied,
 * pas de bandeau d'appel. Une page de connexion qui propose dix autres chemins
 * détourne de la seule action attendue.
 *
 * Point d'entrée unique pour les quatre populations. Le routage vers le bon
 * espace se fait APRÈS authentification, selon le profil — il n'y a donc rien à
 * choisir ici.
 *
 * ⚠️ Le formulaire n'authentifie pas encore : le contexte K · Transverse, qui
 * porte l'identité et les rôles, n'est pas implémenté. Les champs sont présents
 * et désactivés plutôt qu'absents, pour que la structure soit recettable.
 */
export default async function Connexion({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Ecran />;
}

function Ecran() {
  const t = useTranslations("pages.connexion");
  const commun = useTranslations("commun");
  const profils = t.raw("profils") as { titre: string; detail: string }[];

  const etiquette: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    font: "600 11px/1.7 var(--police-texte)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgb(255 255 255 / 60%)",
  };
  const saisie: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 46,
    padding: "0 12px",
    border: "1px solid rgb(255 255 255 / 24%)",
    borderRadius: 9,
    background: "rgb(255 255 255 / 10%)",
    color: "#fff",
    font: "500 14px/1.3 var(--police-texte)",
  };

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--brand-indigo-900)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Image src="/images/pages/cabinet-b.jpg" alt="" fill sizes="100vw" className="heros__image" />
      <div className="heros__voile" />

      <div
        className="bloc"
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gap: 44,
          gridTemplateColumns: "minmax(0, 1.2fr) 420px",
          alignItems: "center",
          paddingBlock: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Link href="/" style={{ alignSelf: "flex-start" }}>
            <Image
              src="/marque/cga-logo-blanc.png"
              alt={commun("cabinet.nom")}
              width={132}
              height={74}
              priority
              style={{ width: 132, height: "auto" }}
            />
          </Link>
          <span className="heros__kicker">{t("kicker")}</span>
          <h1 className="heros__titre">{t("titre")}</h1>
          <p className="heros__detail">{t("detail")}</p>

          <div style={{ marginTop: 18 }}>
            <span style={etiquette}>{t("profilsTitre")}</span>
            <div className="grille grille--2" style={{ marginTop: 12, gap: 12 }}>
              {profils.map((profil) => (
                <div key={profil.titre} className="avantage" style={{ padding: 16, gap: 6 }}>
                  <h2 className="avantage__titre" style={{ fontSize: 14.5 }}>
                    {profil.titre}
                  </h2>
                  <p className="avantage__detail" style={{ fontSize: 12.5 }}>
                    {profil.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form className="formulaire-heros">
          <div>
            <label style={etiquette} htmlFor="identifiant">
              {t("identifiant")}
            </label>
            <input id="identifiant" type="text" style={saisie} autoComplete="username" disabled />
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
              disabled
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
            <input type="checkbox" disabled />
            {t("garder")}
          </label>

          <button
            type="submit"
            className="bouton bouton--principal formulaire-heros__envoi"
            disabled
            style={{ opacity: 0.6, cursor: "not-allowed" }}
          >
            {t("bouton")}
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
      </div>
    </main>
  );
}
