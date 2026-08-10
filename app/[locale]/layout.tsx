import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Inter, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { routing } from "@/i18n/routing";
import "@/app/globals.css";

/* § 10.2 — Inter pour tout le corps de texte, Poppins cantonnée aux titres de page
   et aux grands chiffres : géométrique et large, superbe en grand, coûteuse en
   espace et moins lisible à 13 px. */
const inter = Inter({
  variable: "--police-texte-chargee",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--police-titre-chargee",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CGA Broad Range Consulting Group",
    template: "%s — CGA Broad Range Consulting Group",
  },
  description:
    "Cabinet comptable, d'audit et de conseil agréé par le ministre des Finances. " +
    "Création d'entreprise, suivi comptable et fiscal, formations. Douala, Yaoundé, Bafoussam.",
};

/** Pré-rend les deux langues plutôt que de les générer à la demande. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Applique le thème enregistré **avant le premier rendu**.
 *
 * Sans ce script, une page en mode sombre s'afficherait d'abord en clair le temps
 * que React s'hydrate : un éclair blanc en pleine nuit, sur chaque navigation. Le
 * script est volontairement minuscule et sans dépendance, il s'exécute en amont de
 * tout le reste.
 */
const APPLIQUER_THEME = `
(function () {
  try {
    var choix = localStorage.getItem('cga.theme');
    if (!choix) {
      choix = matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
    }
    document.documentElement.dataset.theme = choix;
  } catch (e) {
    document.documentElement.dataset.theme = 'clair';
  }
})();
`;

export default async function LayoutRacine({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Permet le rendu statique des pages : sans cela, toute page appelant un message
  // bascule en rendu dynamique et perd le bénéfice du pré-rendu.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      data-theme="clair"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      style={{
        // Les polices chargées par next/font priment sur les repères système
        // déclarés dans tokens.css, sans dupliquer la déclaration des jetons.
        ["--police-texte" as string]: "var(--police-texte-chargee), system-ui, sans-serif",
        ["--police-titre" as string]: "var(--police-titre-chargee), system-ui, sans-serif",
      }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLIQUER_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
