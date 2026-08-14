import { useTranslations } from "next-intl";

import { EnteteDePage } from "./EnteteDePage";

/**
 * Gabarit des pages légales — mentions, confidentialité, conditions générales.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CES PAGES EXISTENT MAINTENANT
 *
 * Le pied de page les liait depuis le premier jour ; elles n'avaient jamais été
 * écrites. Les trois liens tombaient donc en 404 — sur les seules pages qu'un
 * visiteur méfiant va vérifier avant de confier ses coordonnées, et que la loi
 * impose par ailleurs.
 *
 * ⚠️ CE QUI EST ÉCRIT ICI, ET CE QUI NE L'EST PAS
 *
 * Tout ce que le dépôt sait du cabinet de façon vérifiable est renseigné :
 * dénomination, agrément ministériel, adresses, moyens de contact. Le reste —
 * numéro RCCM, capital social, hébergeur, responsable de publication nommé — est
 * marqué **à compléter** en toutes lettres plutôt qu'inventé.
 *
 * Ce n'est pas de la prudence excessive : une mention légale fausse est pire
 * qu'une mention légale absente. Elle engage le cabinet sur des informations
 * qu'il n'a pas données, et elle passe inaperçue précisément parce qu'elle a
 * l'air complète.
 *
 * Le cabinet doit relire et compléter ces trois pages avant toute mise en ligne.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function PageLegale({ document }: { document: "mentions" | "confidentialite" | "cgv" }) {
  const t = useTranslations(`pages.legal.${document}`);
  const commun = useTranslations("commun");
  const sections = t.raw("sections") as { titre: string; corps: string[] }[];

  return (
    <>
      <EnteteDePage
        kicker={t("kicker")}
        titre={t("titre")}
        detail={t("detail")}
        detailSurDeuxLignes
        images={["/images/pages/cabinet-a.jpg"]}
      />

      <section className="section section--filigrane">
        <div className="bloc bloc--etroit">
          {/* L'éditeur, identique sur les trois documents : c'est la première
              chose qu'on y cherche. */}
          <h2 className="article__intertitre">{t("editeurTitre")}</h2>
          <ul className="article__liste">
            <li>
              <span className="article__puce" aria-hidden="true" />
              {commun("cabinet.nom")}
            </li>
            <li>
              <span className="article__puce" aria-hidden="true" />
              {commun("cabinet.agrement")}
            </li>
            <li>
              <span className="article__puce" aria-hidden="true" />
              {commun("cabinet.boitePostale")}
            </li>
            <li>
              <span className="article__puce" aria-hidden="true" />
              {commun("cabinet.telephone")} · {commun("cabinet.courriel")}
            </li>
          </ul>

          {sections.map((section) => (
            <div key={section.titre}>
              <h2 className="article__intertitre">{section.titre}</h2>
              {section.corps.map((paragraphe) => (
                <p key={paragraphe} className="article__paragraphe">
                  {paragraphe}
                </p>
              ))}
            </div>
          ))}

          <p className="devis__avertissement">{t("aCompleter")}</p>
        </div>
      </section>
    </>
  );
}
