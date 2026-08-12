import Image from "next/image";
import { useTranslations } from "next-intl";

import { dateLongue } from "@/app/lib/formats";
import type { Article } from "@/app/lib/blog";
import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * La vignette d'un article, au sommaire du blog et au bas d'un article.
 *
 * Toute la carte est cliquable, mais **un seul lien la couvre** : le titre porte
 * le lien, et une surface transparente en `::after` l'étend à la carte entière.
 * Empiler un lien sur l'image, un autre sur le titre et un troisième sur « Lire »
 * donnerait trois arrêts de tabulation pour une seule destination — un parcours
 * clavier trois fois plus long pour rien.
 *
 * `mise-en-avant` allonge la première carte du sommaire sur toute la largeur :
 * un sommaire où toutes les vignettes ont le même poids ne dit pas par où
 * commencer.
 */
export function CarteArticle({
  article,
  miseEnAvant = false,
}: {
  article: Article;
  miseEnAvant?: boolean;
}) {
  const t = useTranslations("vitrine.blog");

  return (
    <article className={`carte-article${miseEnAvant ? " carte-article--large" : ""}`}>
      <div className="carte-article__image">
        <Image
          src={article.image}
          alt=""
          fill
          sizes={miseEnAvant ? "(max-width: 900px) 100vw, 560px" : "(max-width: 900px) 100vw, 380px"}
          className="carte-article__photo"
        />
        <span className="carte-article__rubrique">{t(`rubriques.${article.rubrique}`)}</span>
      </div>

      <div className="carte-article__texte">
        <p className="carte-article__meta tabulaire">
          {dateLongue(article.date)}
          <span aria-hidden="true"> · </span>
          <span className="carte-article__duree">
            <IconeVitrine nom="horloge" taille={13} />
            {t("minutes", { minutes: article.minutes })}
          </span>
        </p>

        <h3 className="carte-article__titre">
          <Link href={`/blog/${article.slug}`}>{article.titre}</Link>
        </h3>

        <p className="carte-article__resume">{article.resume}</p>

        <span className="carte-article__lire" aria-hidden="true">
          {t("lire")}
          <IconeVitrine nom="fleche" taille={15} />
        </span>
      </div>
    </article>
  );
}
