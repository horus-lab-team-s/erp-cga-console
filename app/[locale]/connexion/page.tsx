import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { FormulaireConnexion } from "@/app/components/vitrine/FormulaireConnexion";
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
        className="bloc connexion__grille"
        style={{ position: "relative", zIndex: 2, alignItems: "center" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Retour à la vitrine, en bouton visible et non en lien discret.
              Cette page est un cul-de-sac : ni en-tête du site, ni pied, ni menu.
              Le visiteur qui renonce à se connecter n'a que le bouton
              « précédent » du navigateur — lequel ne mène nulle part s'il est
              arrivé par un lien direct. Le logo ramenait déjà à l'accueil, mais
              rien ne le disait : un logo cliquable est une convention, pas une
              indication. */}
          <Link href="/" className="retour-vitrine">
            <IconeVitrine nom="retour" taille={15} />
            {commun("actions.retourVitrine")}
          </Link>

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

        <FormulaireConnexion />
      </div>
    </main>
  );
}
