import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

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
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plateforme CGA — Broad Range Consulting Group",
  description:
    "Suivi fiscal et comptable des adhérents du Centre de Gestion Agréé Broad Range Consulting Group.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      style={{
        // Les polices chargées par next/font priment sur les repères système
        // déclarés dans tokens.css, sans dupliquer la déclaration des jetons.
        ["--police-texte" as string]: "var(--police-texte-chargee), system-ui, sans-serif",
        ["--police-titre" as string]: "var(--police-titre-chargee), system-ui, sans-serif",
      }}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
