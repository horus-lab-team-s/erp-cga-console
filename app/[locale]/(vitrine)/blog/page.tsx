import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { RUBRIQUES, type Article, type CleRubrique } from "@/app/lib/blog";
import { lireSommaire } from "@/app/lib/contenu-vitrine";
import { CarteArticle } from "@/app/components/vitrine/CarteArticle";
import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { FiltreRubriques } from "@/app/components/vitrine/FiltreRubriques";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vitrine.blog" });
  return {
    title: t("titre"),
    description: t("detail"),
    openGraph: {
      type: "website",
      title: t("titre"),
      description: t("detail"),
      images: [{ url: "/images/services/conseil.jpg", alt: t("titre") }],
    },
  };
}

/**
 * Le sommaire du blog.
 *
 * La rubrique se lit dans l'adresse (`?rubrique=…`) et non dans un état client :
 * chaque filtre a donc son lien partageable, et la page reste pré-rendue. Une
 * valeur inconnue est ignorée plutôt que refusée — un lien mal recopié montre
 * tout le blog, il ne montre pas une erreur.
 *
 * Le contenu vient du backend, contexte L · Vitrine, avec repli sur le contenu
 * de secours s'il ne répond pas. La page ne sait pas lequel des deux lui a
 * répondu, et n'a pas à le savoir.
 */
export default async function Blog({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ rubrique?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { rubrique } = await searchParams;
  const active = (RUBRIQUES as readonly string[]).includes(rubrique ?? "")
    ? (rubrique as CleRubrique)
    : null;

  const { articles, comptes } = await lireSommaire(active);

  return (
    <>
      <Ouverture />
      <Sommaire active={active} articles={articles} comptes={comptes} />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("vitrine.blog");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      images={["/images/services/conseil.jpg", "/images/heros/reunion-equipe.jpg"]}
    />
  );
}

function Sommaire({
  active,
  articles,
  comptes,
}: {
  active: CleRubrique | null;
  articles: Article[];
  comptes: Record<CleRubrique, number>;
}) {
  const t = useTranslations("vitrine.blog");

  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("sommaireKicker")}</span>
        <h2 className="titre-section">
          {active ? t(`rubriques.${active}`) : t("sommaireTitre")}
        </h2>
        <p className="chapeau chapeau--deux-lignes">
          {active ? t(`rubriquesDetail.${active}`) : t("sommaireDetail")}
        </p>

        <FiltreRubriques active={active} comptes={comptes} />

        {articles.length === 0 ? (
          <p className="blog-vide">{t("aucun")}</p>
        ) : (
          <div className="grille-articles">
            {articles.map((article, index) => (
              <CarteArticle
                key={article.slug}
                article={article}
                /* La première carte du sommaire complet tient toute la largeur :
                   un sommaire dont toutes les vignettes pèsent pareil ne dit pas
                   par où commencer. Dans une rubrique filtrée, les articles se
                   valent — pas de mise en avant. */
                miseEnAvant={index === 0 && active === null && articles.length > 2}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
