import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Bandeau d'appel à contact.
 *
 * Dans la maquette il vit **hors des pages**, entre le contenu et le pied : il
 * apparaît donc au bas de chacune des huit pages. Le placer dans l'accueil, comme
 * je l'avais fait, le faisait disparaître partout ailleurs.
 */
export function BandeauAppel() {
  const t = useTranslations("vitrine.cta");
  const commun = useTranslations("commun");
  const numero = commun("cabinet.whatsapp").replace(/[^\d]/g, "");

  return (
    <section className="appel">
      <div className="bloc appel__contenu">
        <div style={{ flex: "1 1 460px" }}>
          <h2 className="appel__titre">{t("titre")}</h2>
          <p className="appel__detail">{t("detail")}</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href={`https://wa.me/${numero}`}
            className="bouton bouton--principal bouton--large"
            target="_blank"
            rel="noreferrer noopener"
          >
            <IconeVitrine nom="whatsapp" taille={16} />
            {t("whatsapp")}
          </a>
          <Link href="/contact" className="bouton bouton--clair bouton--large">
            {t("rendezVous")}
          </Link>
        </div>
      </div>
    </section>
  );
}
