import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { BandeauAppel } from "@/app/components/vitrine/BandeauAppel";
import { EnteteVitrine } from "@/app/components/vitrine/EnteteVitrine";
import { PiedVitrine } from "@/app/components/vitrine/PiedVitrine";
import "@/app/styles/vitrine.css";

/**
 * Coquille du site vitrine.
 *
 * Groupe de routes distinct de `(collaborateur)` : la vitrine défile normalement et
 * respire, l'espace de travail tient en 1440 × 900 sans défilement. Deux publics,
 * deux mises en page — mais les mêmes jetons de design.
 */
export default async function LayoutVitrine({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="vitrine">
      <EnteteVitrine />
      <main>{children}</main>
      {/* Bandeau d'appel et pied sont communs aux huit pages : la maquette les
          place hors du commutateur de page. */}
      <BandeauAppel />
      <PiedVitrine />
    </div>
  );
}
