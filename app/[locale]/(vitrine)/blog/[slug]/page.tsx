import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type { Article, Bloc } from "@/app/lib/blog";
import { lireArticle, lireSlugs } from "@/app/lib/contenu-vitrine";
import { CarteArticle } from "@/app/components/vitrine/CarteArticle";
import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { PartageArticle } from "@/app/components/vitrine/PartageArticle";
import { dateLongue } from "@/app/lib/formats";
import { Link } from "@/i18n/navigation";

/**
 * Les articles connus sont pré-rendus à la construction.
 *
 * Une page servie en statique s'affiche instantanément sur une connexion mobile
 * lente — et c'est de là que viendront la plupart des lecteurs, par un lien reçu
 * sur WhatsApp.
 *
 * La liste vient du backend. Un article ajouté au contenu **après** la
 * construction n'est donc pas pré-rendu : il sera servi à la demande, un peu plus
 * lentement la première fois, puis mis en cache. C'est le prix d'un contenu
 * éditable sans redéploiement, et il est modeste.
 */
export async function generateStaticParams() {
  return (await lireSlugs()).map((slug) => ({ slug }));
}

/**
 * Les métadonnées de partage.
 *
 * C'est ce bloc, et lui seul, qui décide de l'allure du lien dans un fil
 * Facebook ou une conversation WhatsApp : titre, accroche, vignette. Sans lui,
 * le lien part nu — et un lien nu ne se clique pas.
 *
 * `type: "article"` avec sa date de publication plutôt que `website` : les
 * agrégateurs et les moteurs y lisent qu'il s'agit d'un contenu daté, et
 * l'affichent comme tel.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const trouve = await lireArticle(slug);
  if (!trouve) return {};
  const { article } = trouve;

  const t = await getTranslations({ locale, namespace: "vitrine.blog" });
  const chemin = `/${locale}/blog/${article.slug}`;

  return {
    title: article.titre,
    description: article.accroche,
    keywords: article.motsCles,
    alternates: { canonical: chemin },
    openGraph: {
      type: "article",
      url: chemin,
      title: article.titre,
      description: article.accroche,
      publishedTime: article.date,
      section: t(`rubriques.${article.rubrique}`),
      tags: article.motsCles,
      /* Pas de `width` ni de `height` déclarés : les photographies du dépôt
         n'ont pas toutes le même rapport, et annoncer un format qu'elles n'ont
         pas fait recadrer la vignette de travers. Facebook mesure le fichier
         lui-même — il lui suffit qu'il soit assez large, ce que garantit la
         contrainte posée sur `image` dans `blog.ts`. */
      images: [{ url: article.image, alt: article.titre }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.titre,
      description: article.accroche,
      images: [article.image],
    },
  };
}

export default async function PageArticle({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const trouve = await lireArticle(slug);
  if (!trouve) notFound();

  return (
    <>
      <Ouverture article={trouve.article} />
      <Corps article={trouve.article} />
      <ALire voisins={trouve.voisins} />
    </>
  );
}

function Ouverture({ article }: { article: Article }) {
  const t = useTranslations("vitrine.blog");
  return (
    <EnteteDePage
      kicker={t(`rubriques.${article.rubrique}`)}
      titre={article.titre}
      detail={article.accroche}
      images={[article.image]}
      enfants={
        <p className="article__signature tabulaire">
          <time dateTime={article.date}>{dateLongue(article.date)}</time>
          <span aria-hidden="true"> · </span>
          {t("minutes", { minutes: article.minutes })}
        </p>
      }
    />
  );
}

function Corps({ article }: { article: Article }) {
  const t = useTranslations("vitrine.blog");

  return (
    <section className="section section--filigrane">
      <div className="bloc bloc--etroit">
        <Link href="/blog" className="article__retour">
          <IconeVitrine nom="retour" taille={15} />
          {t("retourSommaire")}
        </Link>

        {/* Le partage est proposé **avant** la lecture autant qu'après : un
            lecteur qui reconnaît le sujet dès le titre le transfère souvent à
            son comptable sans avoir lu la suite. */}
        <PartageArticle titre={article.titre} accroche={article.accroche} />

        <div className="article__corps">
          {article.corps.map((bloc, index) => (
            <BlocArticle key={index} bloc={bloc} />
          ))}
        </div>

        {article.motsCles.length > 0 && (
          <ul className="article__mots-cles" aria-label={t("motsCles")}>
            {article.motsCles.map((mot) => (
              <li key={mot}>{mot}</li>
            ))}
          </ul>
        )}

        {article.appel && (
          <div className="article__appel">
            <p>{t("appelIntro")}</p>
            <Link href={article.appel.href} className="bouton bouton--principal bouton--large">
              {article.appel.texte}
              <IconeVitrine nom="fleche" taille={16} />
            </Link>
          </div>
        )}

        <PartageArticle titre={article.titre} accroche={article.accroche} />

        {/* La provenance, en clair. Les faits cités viennent de publications
            datées et le droit bouge : le lecteur doit pouvoir situer la source
            dans le temps avant de s'appuyer dessus. */}
        <p className="article__provenance">{t("provenance", { date: dateLongue(article.date) })}</p>
      </div>
    </section>
  );
}

/** Un bloc du corps. Rendu en JSX, jamais en HTML injecté. */
function BlocArticle({ bloc }: { bloc: Bloc }) {
  switch (bloc.type) {
    case "intertitre":
      return <h2 className="article__intertitre">{bloc.texte}</h2>;

    case "liste":
      return (
        <ul className="article__liste">
          {bloc.points.map((point) => (
            <li key={point}>
              <span className="article__puce" aria-hidden="true">
                <IconeVitrine nom="coche" taille={14} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      );

    case "encadre":
      return (
        <aside className="article__encadre">
          <h3>{bloc.titre}</h3>
          <p>{bloc.texte}</p>
        </aside>
      );

    default:
      return <p className="article__paragraphe">{bloc.texte}</p>;
  }
}

/** Ce qu'on propose de lire ensuite. Le choix des voisins est fait au backend. */
function ALire({ voisins }: { voisins: Article[] }) {
  const t = useTranslations("vitrine.blog");
  if (voisins.length === 0) return null;

  return (
    <section className="section section--teinte section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("aLireKicker")}</span>
        <h2 className="titre-section">{t("aLireTitre")}</h2>
        <div className="grille-articles">
          {voisins.map((voisin) => (
            <CarteArticle key={voisin.slug} article={voisin} />
          ))}
        </div>
      </div>
    </section>
  );
}
