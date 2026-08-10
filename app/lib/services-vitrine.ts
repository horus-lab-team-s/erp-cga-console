import type { NomIcone } from "./icones-vitrine";

/**
 * Les sept services du cabinet.

 * Six viennent des maquettes ; **l'assistance juridique** a été ajoutée à la
 * demande du cabinet. Elle n'est pas un ajout cosmétique : créer une société,
 * c'est rédiger des statuts et traiter avec le greffe, donc du droit — les
 * juristes du cabinet interviennent déjà. Elle relève aussi des prestations
 * ponctuelles, d'où le renvoi croisé entre les deux fiches.
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
    cle: "juridique",
    href: "/contact",
    icone: "juridique",
    image: "/images/services/juridique.jpg",
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

/**
 * Les formes juridiques proposées à la création, dans l'ordre du pied de page.
 *
 * `codeBareme` renvoie à `FORMES` dans `bareme-creation.ts` et sert à
 * pré-sélectionner l'estimateur. **La SA n'y figure pas** : le barème du cabinet
 * n'a pas de ligne pour elle. Plutôt que d'inventer des montants, son lien mène
 * à la page Création, où le visiteur est invité à nous joindre.
 */
export const FORMES_JURIDIQUES = [
  { cle: "SARL", codeBareme: "SARL" },
  { cle: "SARLU", codeBareme: "SARLU" },
  { cle: "SA", codeBareme: null },
  { cle: "SAS", codeBareme: "SAS" },
  { cle: "SCI", codeBareme: "SCI" },
  { cle: "ETS", codeBareme: "ETS" },
] as const;

/** Où mène une forme : l'estimateur pré-rempli, ou la page Création à défaut. */
export function lienForme(forme: (typeof FORMES_JURIDIQUES)[number]) {
  return forme.codeBareme
    ? `/estimation?forme=${forme.codeBareme}`
    : "/creer-mon-entreprise";
}

/** Les six entrées de la barre, dans l'ordre du dessin. */
export const ENTREES_NAV = [
  { cle: "services", href: "/creer-mon-entreprise", megaMenu: true },
  { cle: "adherent", href: "/devenir-adherent", megaMenu: false },
  { cle: "formations", href: "/formations", megaMenu: false },
  { cle: "cabinet", href: "/le-cabinet", megaMenu: false },
  { cle: "estimation", href: "/estimation", megaMenu: false },
  { cle: "contact", href: "/contact", megaMenu: false },
] as const;
