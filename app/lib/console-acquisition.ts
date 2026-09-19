/**
 * Lire le parcours d'acquisition depuis la console (pas 64).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE
 *
 * Depuis le pas 51, le formulaire du site dépose les demandes des visiteurs dans le
 * parcours d'acquisition. Aucun écran ne les montrait : un prospect qui écrivait au
 * cabinet n'était vu de personne dans le produit. Dix-huit routes, zéro écran.
 *
 * ⚠️ LES ORDRES SONT CEUX DU BACKEND
 *
 * Les dossiers du plus ancien dans son état au plus récent, ce qui dort du plus en
 * retard au moins en retard, les rappels du client qui attend depuis le plus
 * longtemps. Retrier à l'écran ferait passer un prospect oublié derrière un nouveau.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type EtatDossierCommercial =
  | "DEPOSEE"
  | "AFFECTEE"
  | "EN_CONVERSATION"
  | "QUALIFIEE"
  | "CHIFFREE"
  | "PROFORMA_EMISE"
  | "ACCEPTEE"
  | "PAYEE"
  | "SANS_SUITE";

export const LIBELLES_ETAT: Record<EtatDossierCommercial, string> = {
  DEPOSEE: "Déposée",
  AFFECTEE: "Affectée",
  EN_CONVERSATION: "En conversation",
  QUALIFIEE: "Qualifiée",
  CHIFFREE: "Chiffrée",
  PROFORMA_EMISE: "Proforma émise",
  ACCEPTEE: "Acceptée",
  PAYEE: "Payée",
  SANS_SUITE: "Sans suite",
};

export type DossierCommercial = {
  reference: string;
  etat: EtatDossierCommercial;
  nom: string;
  telephone: string;
  service_souhaite: string;
  responsable: string | null;
  responsable_nom: string | null;
  depuis_le: string;
  avancement: number;
  demandes: number;
};

export type DossierEnSouffrance = {
  reference: string;
  etat: EtatDossierCommercial;
  nom: string;
  responsable: string | null;
  depuis_le: string;
  immobile_depuis_heures: number;
  delai_heures: number;
  signale_le: string | null;
};

export type Rappel = {
  identifiant: string;
  dossier: string;
  motif: string;
  cree_le: string;
  fait_le: string | null;
  fait_par: string | null;
};

export type MotifDeClassement = { code: string; libelle: string; precision_requise: boolean };

const authentifie = { authentifie: true } as const;

export const lireDossiersCommerciaux = () =>
  appeler<DossierCommercial[]>("/acquisition/dossiers", authentifie);
export const lireDossiersEnSouffrance = () =>
  appeler<DossierEnSouffrance[]>("/acquisition/dossiers/en-souffrance", authentifie);
export const lireRappels = () => appeler<Rappel[]>("/acquisition/rappels", authentifie);
export const lireMotifsDeClassement = () =>
  appeler<MotifDeClassement[]>("/acquisition/motifs-de-classement", authentifie);

// ══ La fiche d'un dossier (pas 66) ═══════════════════════════════════════════

export type Question = {
  code: string;
  libelle: string;
  type: "ENUM" | "ENTIER" | "DECIMAL" | "BOOLEEN" | "TEXTE" | "LISTE" | "DATE";
  rang: number;
  obligatoire: boolean;
  valeurs: string[] | null;
  unite: string | null;
  aide: string;
};

export type Questionnaire = { service: string; version: string; questions: Question[] };

export type EtatQualification = {
  dossier: string;
  service: string;
  commencee: boolean;
  complete: boolean;
  manquantes: string[];
  avancement: { repondues: number; total: number };
  note?: string;
  /** Les valeurs rendues en texte par le backend : « True », « 1000000 », « ['a', 'b'] ». */
  faits?: Record<string, string>;
};

export type FicheDossier = {
  reference: string;
  etat: EtatDossierCommercial;
  responsable: string | null;
  depuis_le: string;
  motif_affectation: string | null;
  /** L'adresse du futur espace, retenue à la demande de règlement ou à l'encaissement. */
  slug_retenu: string | null;
  payee_le: string | null;
  proformas: {
    numero: string;
    version: number;
    etat: string;
    montant: string;
    emise_le: string;
    transmise_le: string | null;
  }[];
  demande: {
    nom: string;
    telephone: string;
    courriel: string | null;
    service_souhaite: string;
    message: string | null;
    canal_prefere: string;
    deposee_le: string;
  };
};

export type LigneDeProposition = { code: string; libelle: string; montant: string; fondement: string };

export type Proposition = {
  service: string;
  version_bareme: string;
  base: string;
  plancher: string;
  reference: string;
  plafond: string;
  lignes: LigneDeProposition[];
  echecs: string[];
  total_des_debours: string;
  total_de_reference: string;
};

export const lireFicheDossier = (reference: string) =>
  appeler<FicheDossier>(`/acquisition/dossiers/${encodeURIComponent(reference)}`, authentifie);
export const lireQuestionnaire = (service: string) =>
  appeler<Questionnaire>(`/acquisition/questionnaires/${encodeURIComponent(service)}`, authentifie);
export const lireQualification = (reference: string) =>
  appeler<EtatQualification>(
    `/acquisition/dossiers/${encodeURIComponent(reference)}/qualification`,
    authentifie,
  );

// ══ La proforma (pas 67) ═════════════════════════════════════════════════════

export type ProformaEmise = {
  numero: string;
  version: number;
  etat: string;
  montant: string;
  lien_acceptation: string | null;
  expire_le: string | null;
  plancher: string | null;
  reference: string | null;
  plafond: string | null;
  chiffre_par: string;
  valide_par: string;
  separation_respectee: boolean;
};

export type ProformaConsultee = {
  numero: string;
  version: number;
  service: string;
  etat: "EMISE" | "TRANSMISE" | "ACCEPTEE" | "REMPLACEE" | "ANNULEE";
  montant: string;
  lignes: { libelle: string; montant: string }[];
  debours: { libelle: string; montant: string }[];
  expire_le: string;
  acceptee: boolean;
};

/** L'état des canaux de contact (pas 90) : ceux que le centre exploite, et pourquoi les autres ne le sont pas. */
export type EtatDesCanaux = {
  actifs: string[];
  messagerie_prete: boolean;
  detail: { canal: string; actif: boolean; rang: number; motif: string }[];
};

export const lireEtatDesCanaux = () => appeler<EtatDesCanaux>("/acquisition/canaux");
