import type { NomIcone } from "./icones-vitrine";

/**
 * Les six services du cabinet, tels que dessinés dans les maquettes.
 *
 * Une seule déclaration alimente trois surfaces : le méga-menu de l'en-tête, la
 * section Services de l'accueil et le pied de page. Les dupliquer garantirait
 * qu'un prix change à un endroit et pas aux deux autres.
 *
 * `accent` marque la création d'entreprise : c'est le produit d'appel, distingué
 * visuellement dans le dessin.
 */
export type ServiceVitrine = {
  cle: string;
  href: string;
  icone: NomIcone;
  image: string;
  accent: boolean;
};

export const SERVICES_VITRINE: ServiceVitrine[] = [
  {
    cle: "creation",
    href: "/creer-mon-entreprise",
    icone: "creation",
    image: "/images/services/creation-entreprise.jpg",
    accent: true,
  },
  {
    cle: "adhesion",
    href: "/devenir-adherent",
    icone: "adhesion",
    image: "/images/services/suivi-comptable.jpg",
    accent: false,
  },
  {
    cle: "ponctuel",
    href: "/contact",
    icone: "ponctuel",
    image: "/images/services/prestations-ponctuelles.jpg",
    accent: false,
  },
  {
    cle: "domiciliation",
    href: "/contact",
    icone: "domiciliation",
    image: "/images/services/domiciliation.jpg",
    accent: false,
  },
  {
    cle: "formations",
    href: "/formations",
    icone: "formations",
    image: "/images/services/formations.jpg",
    accent: false,
  },
  {
    cle: "conseil",
    href: "/contact",
    icone: "conseil",
    image: "/images/services/conseil.jpg",
    accent: false,
  },
];

/** Les six entrées de la barre, dans l'ordre du dessin. */
export const ENTREES_NAV = [
  { cle: "services", href: "/creer-mon-entreprise", megaMenu: true },
  { cle: "adherent", href: "/devenir-adherent", megaMenu: false },
  { cle: "formations", href: "/formations", megaMenu: false },
  { cle: "cabinet", href: "/le-cabinet", megaMenu: false },
  { cle: "estimation", href: "/estimation", megaMenu: false },
  { cle: "contact", href: "/contact", megaMenu: false },
] as const;
