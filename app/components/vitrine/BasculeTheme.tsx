"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { basculerTheme, lireTheme, souscrireTheme, themeParDefaut } from "@/app/lib/preferences";

/**
 * Bascule clair / sombre.
 *
 * Le thème est lu comme un magasin externe et non dans un effet : le lire après
 * montage provoquerait un rendu en cascade et un clignotement. La valeur réelle est
 * déjà posée sur `<html data-theme>` par le script inline du layout, avant peinture.
 */
export function BasculeTheme() {
  const t = useTranslations("commun.theme");
  const theme = useSyncExternalStore(souscrireTheme, lireTheme, themeParDefaut);
  const versSombre = theme === "clair";

  return (
    <button
      type="button"
      className="bouton-icone"
      onClick={basculerTheme}
      aria-label={versSombre ? t("sombre") : t("clair")}
      title={versSombre ? t("sombre") : t("clair")}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {versSombre ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
