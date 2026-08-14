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
    href: "/services/prestations-ponctuelles",
    icone: "ponctuel",
    image: "/images/services/prestations-ponctuelles.jpg",
    accent: false,
  },
  {
    cle: "domiciliation",
    href: "/services/domiciliation",
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
    href: "/services/assistance-juridique",
    icone: "juridique",
    image: "/images/services/juridique.jpg",
    accent: false,
  },
  {
    cle: "conseil",
    href: "/services/conseil-et-audit",
    icone: "conseil",
    image: "/images/services/conseil.jpg",
    accent: false,
  },
];

/**
 * Les services qui ont leur **fiche détaillée**, à `/services/<slug>`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CES FICHES EXISTENT
 *
 * Quatre entrées du méga-menu renvoyaient à la page Contact. C'était une
 * impasse : un visiteur qui clique sur « Domiciliation » veut savoir ce que
 * couvre la domiciliation, pas remplir un formulaire. On lui demandait de
 * s'engager avant de lui avoir dit ce qu'on vendait.
 *
 * Trois services gardent leur page propre, plus riche qu'une fiche : la création
 * d'entreprise (`/creer-mon-entreprise`), l'adhésion (`/devenir-adherent`) et
 * les formations (`/formations`). Elles ne passent donc pas par ici.
 *
 * `slug` entre dans l'adresse publique : le changer casse les liens déjà
 * partagés. `cle` renvoie au bloc de messages `pages.fiches.<cle>`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const FICHES_SERVICE = [
  {
    slug: "prestations-ponctuelles",
    cle: "ponctuel",
    icone: "ponctuel",
    images: ["/images/services/prestations-ponctuelles.jpg", "/images/pages/contact-a.jpg"],
  },
  {
    slug: "domiciliation",
    cle: "domiciliation",
    icone: "domiciliation",
    images: ["/images/services/domiciliation.jpg", "/images/agences/douala.jpg"],
  },
  {
    slug: "assistance-juridique",
    cle: "juridique",
    icone: "juridique",
    images: ["/images/services/juridique.jpg", "/images/pages/cabinet-a.jpg"],
  },
  {
    slug: "conseil-et-audit",
    cle: "conseil",
    icone: "conseil",
    images: ["/images/services/conseil.jpg", "/images/heros/reunion-equipe.jpg"],
  },
] as const;

export type FicheService = (typeof FICHES_SERVICE)[number];

/** La fiche portant ce slug, ou `undefined`. */
export function ficheParSlug(slug: string): FicheService | undefined {
  return FICHES_SERVICE.find((fiche) => fiche.slug === slug);
}

/**
 * Les formes juridiques proposées à la création, dans l'ordre du pied de page.
 *
 * `codeBareme` renvoie à `FORMES` dans `bareme-creation.ts` et sert à
 * pré-sélectionner l'estimateur. Les six formes y figurent, la SA comprise —
 * j'avais d'abord cru le contraire et fait pointer son lien ailleurs.
 */
export const FORMES_JURIDIQUES = [
  { cle: "SARL", codeBareme: "SARL" },
  { cle: "SARLU", codeBareme: "SARLU" },
  { cle: "SA", codeBareme: "SA" },
  { cle: "SAS", codeBareme: "SAS" },
  { cle: "SCI", codeBareme: "SCI" },
  { cle: "ETS", codeBareme: "ETS" },
] as const;

/**
 * Où mène une forme : la page « Créer mon entreprise », **au formulaire**, avec
 * le service et la forme déjà remplis.
 *
 * Elle menait à l'estimateur, et c'était répondre à côté. Qui clique « Créer une
 * SARL » a décidé ; il veut lancer la démarche, pas se voir présenter une
 * addition. L'estimateur reste accessible depuis la page et depuis la barre,
 * pour qui hésite encore entre deux formes.
 *
 * L'ancre `#demande` est la moitié utile du lien : la page raconte les pièces du
 * dossier, les proformas et la foire aux questions avant d'arriver au
 * formulaire. Déposer le visiteur en haut lui ferait chercher ce qu'il vient
 * de demander.
 */
export function lienForme(forme: (typeof FORMES_JURIDIQUES)[number]) {
  return `/creer-mon-entreprise?forme=${forme.codeBareme}#demande`;
}

/**
 * Les entrées de la barre, dans l'ordre du dessin.
 *
 * « Blog » vient après « Le CGA » et avant « Estimation » : il appartient à ce
 * que le cabinet dit de lui-même, pas aux outils. Le placer en fin de barre,
 * après « Contactez-nous », l'aurait rendu invisible — or c'est par lui que le
 * trafic de Facebook et de WhatsApp entrera sur le site.
 */
export const ENTREES_NAV = [
  { cle: "services", href: "/creer-mon-entreprise", megaMenu: true },
  { cle: "adherent", href: "/devenir-adherent", megaMenu: false },
  { cle: "formations", href: "/formations", megaMenu: false },
  { cle: "cabinet", href: "/le-cabinet", megaMenu: false },
  { cle: "blog", href: "/blog", megaMenu: false },
  { cle: "estimation", href: "/estimation", megaMenu: false },
  { cle: "contact", href: "/contact", megaMenu: false },
] as const;
