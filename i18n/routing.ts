import { defineRouting } from "next-intl/routing";

/**
 * Routage internationalisé.
 *
 * `localePrefix: "as-needed"` : le français, langue du cabinet et de ses adhérents,
 * vit à la racine — `/`, `/devenir-adherent`. L'anglais est préfixé — `/en`,
 * `/en/become-a-member`. Un visiteur camerounais n'a donc jamais à voir `/fr/` dans
 * sa barre d'adresse, et les liens partagés par WhatsApp restent courts.
 *
 * Le § 5 du dossier de design prévoyait le bilinguisme « ultérieur » pour l'ERP. Il
 * est ici posé dès le départ, pour la vitrine comme pour l'espace de travail :
 * ajouter une langue après coup suppose de rouvrir chaque écran.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});

export type Langue = (typeof routing.locales)[number];

export const LANGUES: { code: Langue; libelle: string; abrege: string }[] = [
  { code: "fr", libelle: "Français", abrege: "FR" },
  { code: "en", libelle: "English", abrege: "EN" },
];
