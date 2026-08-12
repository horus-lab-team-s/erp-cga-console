/**
 * Les institutions dans le cadre desquelles le cabinet exerce.
 *
 * ⚠️ CE NE SONT PAS DES PARTENAIRES COMMERCIAUX, et le libellé de la section le
 * dit. Afficher le logo d'une entreprise privée sous le mot « partenaire »
 * affirmerait une relation contractuelle : c'est une marque déposée employée
 * pour se recommander de quelqu'un. Ces quatre-là sont différentes — ce sont les
 * institutions avec lesquelles un centre de gestion agréé traite par nature, et
 * le dire est un fait vérifiable, pas une caution empruntée :
 *
 * - la DGI reçoit les déclarations que le cabinet dépose ;
 * - la CNPS reçoit les déclarations sociales ;
 * - l'ONECCA est l'ordre dont relèvent les experts-comptables ;
 * - l'OHADA fixe le droit comptable et le droit des sociétés applicables.
 *
 * Le jour où le cabinet fournira des logos de partenaires réels, avec leur
 * autorisation écrite, ils viendront ici et le libellé de la section changera.
 *
 * `rognageBas` retire une bande parasite au bas d'un fichier, en pourcentage de
 * sa hauteur : le logo de la CNPS est distribué avec un bandeau de certifications
 * qui n'a rien à faire ici.
 */

export type Institution = {
  cle: string;
  nom: string;
  logo: string;
  site: string;
  rognageBas?: number;
};

export const INSTITUTIONS: Institution[] = [
  {
    cle: "dgi",
    nom: "Direction Générale des Impôts",
    logo: "/images/partenaires/dgi.png",
    site: "https://www.impots.cm",
  },
  {
    cle: "cnps",
    nom: "Caisse Nationale de Prévoyance Sociale",
    logo: "/images/partenaires/cnps.png",
    site: "https://www.cnps.cm",
    rognageBas: 26,
  },
  {
    cle: "onecca",
    nom: "Ordre National des Experts-Comptables du Cameroun",
    logo: "/images/partenaires/onecca.png",
    site: "https://www.onecca.cm",
  },
  {
    cle: "ohada",
    nom: "OHADA",
    logo: "/images/partenaires/ohada.png",
    site: "https://www.ohada.org",
  },
];
