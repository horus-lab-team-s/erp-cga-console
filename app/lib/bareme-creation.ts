/**
 * Barème de création d'entreprise — maquette `Site vitrine CGA`, page Estimation.
 *
 * ⚠️ EMPLACEMENT PROVISOIRE, ET C'EST UN PROBLÈME CONNU.
 *
 * Ces montants sont des **frais officiels datés** : caisse du guichet unique,
 * enregistrement des statuts, RCCM, journal officiel, timbres. Ils changent, et
 * le principe d'architecture n° 1 du projet interdit de coder une valeur légale
 * en dur — voir `Docs/architecture/02-referentiel-normatif.md`.
 *
 * Ils vivent ici parce que l'endpoint `POST /estimation/creation` n'existe pas
 * encore. La cible est le contexte A · Référentiel normatif, avec un paramètre
 * daté par ligne et un calcul côté serveur, que le module I · Création
 * d'entreprise réutilisera pour émettre les proformas. Un devis affiché sur la
 * vitrine et un devis émis dans l'ERP ne peuvent pas diverger.
 *
 * Écart connu à trancher : la proforma réelle du cabinet pour une SARL sous
 * seing privé à capital inférieur à 1 M totalise 255 000 FCFA de frais officiels
 * et 45 000 FCFA d'honoraires, avec un détail en huit lignes. Le barème ci-
 * dessous, repris du dessin, agrège en trois lignes pour le même total. Le
 * détail de la proforma fait foi ; il sera repris lors du passage au référentiel.
 */

export type LigneFrais = {
  /** Clé de traduction du libellé. */
  cle: string;
  montant: number;
  /** La majoration liée au capital s'ajoute à cette ligne. */
  majorable?: boolean;
};

export type FormeJuridique = {
  code: string;
  honoraires: number;
  semaines: number;
  capitalMin: number;
  capitalReference: number;
  associesMin: number;
  associesMax: number;
  lignes: LigneFrais[];
};

export const FORMES: FormeJuridique[] = [
  {
    code: "ETS",
    honoraires: 25_000,
    semaines: 4,
    capitalMin: 0,
    capitalReference: 0,
    associesMin: 1,
    associesMax: 1,
    lignes: [
      { cle: "cfce", montant: 62_000 },
      { cle: "rccmNiu", montant: 41_000 },
      { cle: "timbres", montant: 37_000 },
    ],
  },
  {
    code: "SARLU",
    honoraires: 35_000,
    semaines: 6,
    capitalMin: 100_000,
    capitalReference: 1_000_000,
    associesMin: 1,
    associesMax: 1,
    lignes: [
      { cle: "cfce", montant: 95_000 },
      { cle: "enregistrement", montant: 52_000, majorable: true },
      { cle: "rccmJournal", montant: 63_000 },
    ],
  },
  {
    code: "SARL",
    honoraires: 45_000,
    semaines: 8,
    capitalMin: 100_000,
    capitalReference: 1_000_000,
    associesMin: 2,
    associesMax: 99,
    lignes: [
      { cle: "cfce", montant: 115_000 },
      { cle: "enregistrement", montant: 62_000, majorable: true },
      { cle: "rccmJournal", montant: 78_000 },
    ],
  },
  {
    code: "SAS",
    honoraires: 60_000,
    semaines: 8,
    capitalMin: 100_000,
    capitalReference: 1_000_000,
    associesMin: 2,
    associesMax: 99,
    lignes: [
      { cle: "cfce", montant: 140_000 },
      { cle: "enregistrement", montant: 82_000, majorable: true },
      { cle: "rccmJournal", montant: 98_000 },
    ],
  },
  {
    code: "SCI",
    honoraires: 40_000,
    semaines: 8,
    capitalMin: 100_000,
    capitalReference: 1_000_000,
    associesMin: 2,
    associesMax: 99,
    lignes: [
      { cle: "cfce", montant: 105_000 },
      { cle: "enregistrement", montant: 58_000, majorable: true },
      { cle: "rccmJournal", montant: 72_000 },
    ],
  },
  {
    code: "SA",
    honoraires: 220_000,
    semaines: 12,
    capitalMin: 10_000_000,
    capitalReference: 10_000_000,
    associesMin: 2,
    associesMax: 99,
    lignes: [
      { cle: "cfce", montant: 380_000 },
      { cle: "enregistrement", montant: 240_000, majorable: true },
      { cle: "rccmJournal", montant: 160_000 },
      { cle: "notaire", montant: 200_000 },
    ],
  },
];

/** Villes où le guichet unique est sur place : ailleurs, deux semaines de plus. */
export const VILLES_GUICHET = ["Douala", "Yaoundé"];

export const VILLES = [
  "Douala",
  "Yaoundé",
  "Bafoussam",
  "Bamenda",
  "Garoua",
  "Maroua",
  "Ngaoundéré",
  "Bertoua",
  "Buea",
  "Ebolowa",
  "Kribi",
  "Limbe",
];

/** Droit d'enregistrement proportionnel au capital excédant la référence. */
const TAUX_CAPITAL = 0.004;
/** Honoraires par associé au-delà du minimum légal de la forme. */
const PAR_ASSOCIE_SUPPLEMENTAIRE = 15_000;
/** Domiciliation commerciale, douze mois. */
export const DOMICILIATION = 180_000;
/** Suivi comptable et fiscal, par mois. */
export const SUIVI_MENSUEL = 12_500;

export type Estimation = {
  detailOfficiels: { cle: string; montant: number }[];
  majorationCapital: number;
  majorationAssocies: number;
  domiciliation: number;
  honorairesBase: number;
  totalOfficiels: number;
  totalHonoraires: number;
  total: number;
  partOfficiels: number;
  semaines: number;
};

export function estimer(entree: {
  forme: FormeJuridique;
  capital: number;
  associes: number;
  ville: string;
  domiciliation: boolean;
}): Estimation {
  const { forme, capital, associes, ville, domiciliation } = entree;

  // Arrondi aux 500 FCFA supérieurs, comme au dessin : les droits ne se
  // liquident pas au franc près.
  const excedent = forme.capitalReference > 0 ? Math.max(0, capital - forme.capitalReference) : 0;
  const majorationCapital = Math.round((excedent * TAUX_CAPITAL) / 500) * 500;

  const majorationAssocies =
    Math.max(0, associes - forme.associesMin) * PAR_ASSOCIE_SUPPLEMENTAIRE;

  const detailOfficiels = forme.lignes.map((ligne) => ({
    cle: ligne.cle,
    montant: ligne.montant + (ligne.majorable ? majorationCapital : 0),
  }));

  const totalOfficiels = detailOfficiels.reduce((somme, l) => somme + l.montant, 0);
  const fraisDomiciliation = domiciliation ? DOMICILIATION : 0;
  const totalHonoraires = forme.honoraires + majorationAssocies + fraisDomiciliation;
  const total = totalOfficiels + totalHonoraires;

  return {
    detailOfficiels,
    majorationCapital,
    majorationAssocies,
    domiciliation: fraisDomiciliation,
    honorairesBase: forme.honoraires,
    totalOfficiels,
    totalHonoraires,
    total,
    partOfficiels: total > 0 ? Math.round((totalOfficiels / total) * 100) : 0,
    semaines: forme.semaines + (VILLES_GUICHET.includes(ville) ? 0 : 2),
  };
}
