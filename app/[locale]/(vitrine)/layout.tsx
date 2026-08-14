import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { BandeauAnnonce } from "@/app/components/vitrine/BandeauAnnonce";
import { BandeauAppel } from "@/app/components/vitrine/BandeauAppel";
import { EnteteVitrine } from "@/app/components/vitrine/EnteteVitrine";
import { PiedVitrine } from "@/app/components/vitrine/PiedVitrine";
import { RetourEnHaut } from "@/app/components/vitrine/RetourEnHaut";
import { lireAnnonce } from "@/app/lib/contenu-vitrine";
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

  // L'annonce est lue ici, une fois pour toute la vitrine : c'est la coquille qui
  // la porte, pas les pages. Le calendrier de validité est appliqué au backend.
  const annonce = await lireAnnonce();

  return (
    <div className="vitrine">
      <EnteteVitrine />
      <main>{children}</main>
      {/* Bandeau d'appel et pied sont communs aux huit pages : la maquette les
          place hors du commutateur de page. */}
      <BandeauAppel />
      <PiedVitrine />
      {/* L'annonce se superpose au bas de la fenêtre, sur toutes les pages du
          site, et se réaffiche à chaque changement de page. Dernière du
          document : elle n'entre donc dans le parcours clavier qu'après le
          contenu, et n'intercepte pas la première tabulation d'un visiteur qui
          vient lire. */}
      <BandeauAnnonce annonce={annonce} />

      {/* La flèche de remontée, en bas à droite. Posée au-dessus de l'annonce en
          hauteur pour ne pas recouvrir son bouton de fermeture. */}
      <RetourEnHaut />
    </div>
  );
}
