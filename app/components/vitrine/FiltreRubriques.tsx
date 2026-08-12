import { useTranslations } from "next-intl";

import { RUBRIQUES, type CleRubrique } from "@/app/lib/blog";
import { Link } from "@/i18n/navigation";

/**
 * Le filtre du sommaire du blog.
 *
 * Des **liens**, pas des boutons : chaque rubrique a son adresse
 * (`/blog?rubrique=lundiComptable`). On peut donc l'envoyer par message, la
 * mettre en signet, revenir en arrière — et la page reste rendue par le serveur,
 * sans une ligne de JavaScript pour filtrer une liste de dix articles.
 *
 * Le compte est affiché sur chaque rubrique : une rubrique vide se voit avant
 * d'être ouverte, et le visiteur ne clique pas dans le vide.
 *
 * Les comptes sont reçus en propriété plutôt que recalculés ici. Ils arrivent du
 * backend avec le sommaire, dans la même réponse : les recalculer sur le contenu
 * de secours afficherait « 3 » sous une rubrique qui en compte quatre en ligne.
 */
export function FiltreRubriques({
  active,
  comptes,
}: {
  active: CleRubrique | null;
  comptes: Record<CleRubrique, number>;
}) {
  const t = useTranslations("vitrine.blog");

  return (
    <nav className="filtre-rubriques" aria-label={t("filtreLabel")}>
      <Link
        href="/blog"
        className={`filtre-rubriques__lien${active === null ? " est-active" : ""}`}
        aria-current={active === null ? "page" : undefined}
      >
        {t("toutes")}
      </Link>

      {RUBRIQUES.map((cle) => (
        <Link
          key={cle}
          href={`/blog?rubrique=${cle}`}
          className={`filtre-rubriques__lien${active === cle ? " est-active" : ""}`}
          aria-current={active === cle ? "page" : undefined}
        >
          {t(`rubriques.${cle}`)}
          <span className="filtre-rubriques__compte tabulaire">{comptes[cle]}</span>
        </Link>
      ))}
    </nav>
  );
}
