/**
 * Jeu de données de démonstration — § 13 du dossier de design.
 *
 * ⚠️ TEMPORAIRE. Ces données alimentent les écrans dont le contexte backend
 * n'existe pas encore : B Portefeuille, C Collecte, F Obligations. Elles
 * disparaîtront écran par écran à mesure que ces contextes seront implémentés.
 * L'écran E02, lui, est déjà branché sur le vrai moteur de conformité — voir
 * `app/lib/api.ts`.
 *
 * Même période de référence partout : **juillet 2026**, la date du jour étant le
 * **9 août 2026**. Les chiffres doivent s'additionner d'un écran à l'autre :
 * jamais de valeur inventée au fil de l'eau.
 */

import type { Severite } from "../components/Gravite";
import type { Statut } from "../components/Montant";

export const AUJOURD_HUI = new Date("2026-08-09T00:00:00");
export const PERIODE_COURANTE = "juillet 2026";

export const CABINET = {
  nom: "Broad Range Consulting Group",
  agrement: "MINFI/DGI n° 00000048",
  agences: ["Douala Akwa", "Yaoundé Elig-Essono", "Bafoussam"],
};

/** § 13.2 — l'utilisateur connecté par défaut : chargée de clientèle. */
export const UTILISATEUR = {
  nom: "Aïcha MBALLA",
  initiales: "AM",
  role: "Chargée de clientèle",
  agence: "Douala Akwa",
};

export type Entreprise = {
  denomination: string;
  niu: string;
  rccm: string;
  regime: "REEL" | "IGS";
  ville: string;
  activite: string;
};

/** § 13.3 — les six adhérents de démonstration. */
export const ENTREPRISES: Entreprise[] = [
  {
    denomination: "SARL BATIMENT PLUS",
    niu: "M081234567890P",
    rccm: "RC/DLA/2021/B/0977",
    regime: "REEL",
    ville: "Douala Bonabéri",
    activite: "BTP",
  },
  {
    denomination: "ETS TCHOUMBA & FILS",
    niu: "P019876543210K",
    rccm: "RC/DLA/2019/A/1842",
    regime: "IGS",
    ville: "Douala Akwa",
    activite: "Commerce général",
  },
  {
    denomination: "BOULANGERIE LA COLOMBE SARL",
    niu: "M071122334455J",
    rccm: "RC/YAO/2020/B/0311",
    regime: "REEL",
    ville: "Yaoundé Elig-Essono",
    activite: "Agroalimentaire",
  },
  {
    denomination: "AGRO-NKOLO SA",
    niu: "M065544332211L",
    rccm: "RC/BAF/2018/B/0145",
    regime: "REEL",
    ville: "Bafoussam",
    activite: "Agro-industrie",
  },
  {
    denomination: "CABINET NGUEMA CONSEIL",
    niu: "P027788990011M",
    rccm: "RC/DLA/2022/A/2510",
    regime: "IGS",
    ville: "Douala Bonanjo",
    activite: "Profession libérale",
  },
  {
    denomination: "CLINIQUE LE BON SAMARITAIN",
    niu: "M093344556677N",
    rccm: "RC/YAO/2017/B/0892",
    regime: "REEL",
    ville: "Yaoundé Mvog-Ada",
    activite: "Santé",
  },
];

/** Dossiers ouverts récemment : le sélecteur les propose en tête. */
export const ENTREPRISES_RECENTES = [
  "SARL BATIMENT PLUS",
  "AGRO-NKOLO SA",
  "BOULANGERIE LA COLOMBE SARL",
];

/** Compteurs des pastilles de la barre latérale. */
export const COMPTEURS = {
  piecesEnAttente: 37,
  anomaliesBloquantes: 3,
};

/** § 8.1 — les quatre indicateurs du tableau de bord collaborateur. */
export type Indicateur = {
  libelle: string;
  valeur: string;
  detail: string;
  ton: "neutre" | "attention" | "alerte";
};

export const INDICATEURS: Indicateur[] = [
  { libelle: "Dossiers suivis", valeur: "18", detail: "sur 128 au cabinet", ton: "neutre" },
  {
    libelle: "Échéances sous 7 jours",
    valeur: "6",
    detail: "dont 5 au 15 août",
    ton: "attention",
  },
  {
    libelle: "Pièces en attente",
    valeur: "37",
    detail: "12 arrivées aujourd'hui",
    ton: "neutre",
  },
  {
    libelle: "Anomalies bloquantes",
    valeur: "3",
    detail: "non résolues · 1 depuis 22 jours",
    ton: "alerte",
  },
];

/** § 13.7 — échéances à venir. Le montant est estimé tant que rien n'est déposé. */
export type Echeance = {
  date: string;
  entreprise: string;
  obligation: string;
  montant: number;
  statut: Statut;
  piecesRecues: number;
  piecesAttendues: number;
  joursRestants: number;
};

export const ECHEANCES: Echeance[] = [
  {
    date: "2026-08-15",
    entreprise: "ETS TCHOUMBA & FILS",
    obligation: "Impôt Général Synthétique, 3e trimestre",
    montant: 275000,
    statut: "En retard",
    piecesRecues: 14,
    piecesAttendues: 19,
    joursRestants: -24,
  },
  {
    date: "2026-08-15",
    entreprise: "AGRO-NKOLO SA",
    obligation: "Déclaration de TVA, juillet 2026",
    montant: 12340000,
    statut: "À faire",
    piecesRecues: 31,
    piecesAttendues: 38,
    joursRestants: 6,
  },
  {
    date: "2026-08-15",
    entreprise: "SARL BATIMENT PLUS",
    obligation: "Déclaration de TVA, juillet 2026",
    montant: 4820000,
    statut: "En préparation",
    piecesRecues: 22,
    piecesAttendues: 24,
    joursRestants: 6,
  },
  {
    date: "2026-08-15",
    entreprise: "BOULANGERIE LA COLOMBE SARL",
    obligation: "Acompte d'impôt sur les sociétés, juillet",
    montant: 528000,
    statut: "Prête",
    piecesRecues: 17,
    piecesAttendues: 17,
    joursRestants: 6,
  },
  {
    date: "2026-08-15",
    entreprise: "CLINIQUE LE BON SAMARITAIN",
    obligation: "Cotisations CNPS, juillet 2026",
    montant: 1745000,
    statut: "Déclarée",
    piecesRecues: 12,
    piecesAttendues: 12,
    joursRestants: 6,
  },
  {
    date: "2026-09-30",
    entreprise: "AGRO-NKOLO SA",
    obligation: "Taxe sur la propriété foncière",
    montant: 890000,
    statut: "À faire",
    piecesRecues: 0,
    piecesAttendues: 2,
    joursRestants: 52,
  },
];

/** Anomalies récentes du portefeuille, ordonnées par gravité puis par enjeu. */
export type Anomalie = {
  entreprise: string;
  regle: string;
  code: string;
  severite: Severite;
  enjeu: number | null;
  /** Référence de la pièce : ouvre l'écran E02. */
  piece: string | null;
  anciennete: string;
};

export const ANOMALIES: Anomalie[] = [
  {
    entreprise: "BOULANGERIE LA COLOMBE SARL",
    regle: "NIU du fournisseur absent ou non reconnu",
    code: "FAC-ID-003",
    severite: "BLOQUANT",
    enjeu: 536625,
    piece: "F-2026-0414",
    anciennete: "22 j",
  },
  {
    entreprise: "AGRO-NKOLO SA",
    regle: "NIU du fournisseur absent ou non reconnu",
    code: "FAC-ID-003",
    severite: "BLOQUANT",
    enjeu: 812400,
    piece: null,
    anciennete: "18 j",
  },
  {
    entreprise: "AGRO-NKOLO SA",
    regle: "Facture au nom du dirigeant, non de l'entreprise",
    code: "FAC-ID-008",
    severite: "BLOQUANT",
    enjeu: 125775,
    piece: null,
    anciennete: "11 j",
  },
  {
    entreprise: "SARL BATIMENT PLUS",
    regle: "Règlement en espèces au-delà du seuil légal",
    code: "FAC-ACH-007",
    severite: "MAJEUR",
    enjeu: 379350,
    piece: "F-2026-0412",
    anciennete: "14 j",
  },
  {
    entreprise: "ETS TCHOUMBA & FILS",
    regle: "Règlement en espèces au-delà du seuil légal",
    code: "FAC-ACH-007",
    severite: "MAJEUR",
    enjeu: 117810,
    piece: null,
    anciennete: "10 j",
  },
  {
    entreprise: "AGRO-NKOLO SA",
    regle: "Écart de calcul entre lignes et total hors taxes",
    code: "FAC-CAL-002",
    severite: "MAJEUR",
    enjeu: 212400,
    piece: null,
    anciennete: "8 j",
  },
  {
    entreprise: "AGRO-NKOLO SA",
    regle: "Désignation de la prestation imprécise",
    code: "FAC-DOC-011",
    severite: "AVERTISSEMENT",
    enjeu: null,
    piece: "F-2026-0415",
    anciennete: "12 j",
  },
];

/** Dossiers incomplets dont l'échéance approche. */
export type DossierIncomplet = {
  entreprise: string;
  periode: string;
  manquantes: number;
  attendues: number;
  joursRestants: number;
  natureManquante: string;
};

export const DOSSIERS_INCOMPLETS: DossierIncomplet[] = [
  {
    entreprise: "AGRO-NKOLO SA",
    periode: "juillet 2026",
    manquantes: 7,
    attendues: 38,
    joursRestants: 6,
    natureManquante: "Relevés bancaires, 3 factures d'achat, bordereau CNPS",
  },
  {
    entreprise: "ETS TCHOUMBA & FILS",
    periode: "juillet 2026",
    manquantes: 5,
    attendues: 19,
    joursRestants: -24,
    natureManquante: "Relevé bancaire, factures de carburant",
  },
  {
    entreprise: "CABINET NGUEMA CONSEIL",
    periode: "juillet 2026",
    manquantes: 5,
    attendues: 14,
    joursRestants: 11,
    natureManquante: "Notes d'honoraires, justificatifs de déplacement",
  },
  {
    entreprise: "SARL BATIMENT PLUS",
    periode: "juillet 2026",
    manquantes: 2,
    attendues: 24,
    joursRestants: 6,
    natureManquante: "Facture rectificative NÉGOCE MOUNGO, justificatif de virement",
  },
];
