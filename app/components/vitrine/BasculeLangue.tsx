"use client";

import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { LANGUES } from "@/i18n/routing";

/**
 * Sélecteur de langue.
 *
 * Il pointe vers **la page courante dans l'autre langue**, jamais vers l'accueil :
 * renvoyer un lecteur à la racine parce qu'il a changé de langue lui fait perdre sa
 * place. `usePathname` de `@/i18n/navigation` rend le chemin sans préfixe de langue,
 * et `Link` le repréfixe correctement.
 */
export function BasculeLangue() {
  const langueActive = useLocale();
  const chemin = usePathname();

  return (
    <div className="bascule-langue" role="group" aria-label="Langue">
      {LANGUES.map((langue) => (
        <Link
          key={langue.code}
          href={chemin}
          locale={langue.code}
          className="bascule-langue__choix"
          aria-current={langue.code === langueActive}
          hrefLang={langue.code}
          title={langue.libelle}
        >
          {langue.abrege}
        </Link>
      ))}
    </div>
  );
}
