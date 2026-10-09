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
/**
 * Les dossiers commerciaux **payés**, du plus ancien au plus récent.
 *
 * ⚠️ Ils ne figurent PAS dans la file « en cours » : un dossier payé n'attend
 * plus rien de personne, et l'y laisser le ferait traiter deux fois. Mais il
 * doit rester retrouvable — c'est là qu'on vérifie qu'une création payée a bien
 * ouvert son dossier de formalité. Voir le panneau « Créations payées ».
 */
export const lireDossiersPayes = () =>
  appeler<DossierCommercial[]>("/acquisition/dossiers?etat=PAYEE", authentifie);
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
  /** Le nom du responsable, résolu par le serveur ; `null` hors annuaire du cabinet. */
  responsable_nom: string | null;
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
    /**
     * L'accord d'être contacté sur WhatsApp. ⚠️ Lire `accorde` ET `revoque_le` :
     * un accord révoqué n'autorise plus rien (voir `vautMaintenant`).
     */
    consentement?: { accorde: boolean; revoque_le: string | null };
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

/**
 * Le lien d'une proforma, relu pour le renvoyer au client.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUI MANQUAIT, ET CE QUE LE CLIENT PERDAIT
 *
 * Le lien n'était rendu qu'à **l'émission**. `FicheDossier` le gardait dans
 * l'état de son composant, et le perdait au premier rechargement : le bouton
 * « Envoyer sur WhatsApp » disparaissait alors pour toujours.
 *
 * Vérifié le 29 septembre sur la pile, sur sept dossiers réels en
 * `PROFORMA_EMISE` : **aucun** ne l'affichait. Le responsable qui revenait le
 * lendemain n'avait plus d'autre voie que le courriel, y compris pour une
 * cliente qui avait expressément autorisé la messagerie et donné son seul numéro.
 *
 * ⚠️ **UNE LECTURE, PAS `POST /transmission`.** Celle-ci rend le lien elle aussi,
 * et l'on aurait pu s'en servir. Mais elle DATE l'envoi, et c'est cette date qui
 * arme la relance : la rappeler pour relire un lien remettrait le compteur à zéro
 * à chaque consultation. Elle obligerait de plus à déclarer « j'ai envoyé le
 * lien » avant de l'avoir.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type LienDeLaProforma = {
  numero: string;
  version: number;
  etat: string;
  montant: string;
  lien_client: string;
  expire_le: string;
  telephone: string;
  nom: string;
  /** Accord de messagerie en vigueur : accordé ET non révoqué, tel que le serveur le dit. */
  whatsapp_autorise: boolean;
};

export const lireLeLienDeLaProforma = (numero: string) =>
  appeler<LienDeLaProforma>(
    `/acquisition/proformas/${encodeURIComponent(numero)}/lien`,
    authentifie,
  );

/**
 * Une composition de document proposable à l'émission (pas 148).
 *
 * ⚠️ Le détail des rubriques vient avec, et non le seul code : le responsable
 * choisit un document qu'il doit pouvoir lire avant de l'envoyer à une cliente.
 * Un menu de codes nus l'obligerait à ouvrir le référentiel à côté.
 */
export type CompositionOfferte = {
  code: string;
  service: string;
  forme_juridique: string;
  titre: string;
  libelle: string;
  total: string;
  /**
   * ⚠️ `TRANSCRIT` tant que la direction n'a pas confirmé les montants, `VALIDE`
   * ensuite. L'écran doit le montrer : envoyer une proforma issue d'une
   * transcription non validée se sait avant, pas après.
   */
  statut: string;
  rubriques: {
    numero: string;
    intitule: string;
    lignes: { libelle: string; montant: string }[];
    sous_total: string;
  }[];
};

export const lireLesCompositions = (service: string) =>
  appeler<CompositionOfferte[]>(
    `/acquisition/compositions-proforma?service=${encodeURIComponent(service)}`,
    authentifie,
  );

export type ProformaEmise = {
  numero: string;
  version: number;
  etat: string;
  montant: string;
  /** ⚠️ Le SCEAU seul, malgré son nom. Voir `lien_client`. */
  lien_acceptation: string | null;
  /**
   * L'adresse complète que la cliente ouvre, composée **par le serveur**.
   *
   * ⚠️ La console la recomposait à partir du sceau, de la version et de
   * l'expiration. Deux recettes pour une même adresse : elles ont divergé une
   * première fois — le lien partait sur le domaine de production au lieu de la
   * vitrine — et la cliente recevait un lien vers un site où sa proforma
   * n'existe pas. Le serveur la compose une fois, là où il compose celle du
   * courriel.
   */
  lien_client: string | null;
  /** Le téléphone du prospect, pour ouvrir WhatsApp. */
  telephone?: string | null;
  expire_le: string | null;
  plancher: string | null;
  reference: string | null;
  plafond: string | null;
  chiffre_par: string;
  valide_par: string;
  separation_respectee: boolean;
  /**
   * L'envoi par courriel demandé à l'émission : `ENVOYE` (et la proforma est
   * transmise), `SANS_ADRESSE`, `REFUSE`, ou `null` s'il n'a pas été demandé.
   */
  courriel?: "ENVOYE" | "SANS_ADRESSE" | "REFUSE" | null;
  courriel_masque?: string | null;
  transmise_le?: string | null;
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

/**
 * Ce que l'ouverture de l'espace a **réellement** fait.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ `terminee` N'EST PAS `utilisable`, ET C'EST TOUTE LA QUESTION.
 *
 * La saga d'ouverture franchit sept étapes, dont « le compte administrateur
 * existe, avec son jeton d'activation ». Quand l'infrastructure manque, une
 * étape est **substituée** : traversée sans rien faire. La saga se termine, le
 * tenant existe, son sous-domaine répond — et le client n'a ni compte ni lien.
 *
 * Le serveur le calcule et l'inscrit depuis toujours. Personne ne l'exposait,
 * et l'écran annonçait « l'espace s'ouvre » dans tous les cas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type OuvertureDeLEspace = {
  dossier: string;
  /** Faux tant que le relais n'a pas publié l'événement. Ce n'est pas un échec. */
  demarree: boolean;
  terminee: boolean;
  /** ⚠️ Vrai seulement si AUCUNE étape n'a été substituée. */
  utilisable: boolean;
  etapes_substituees: string[];
  slug: string | null;
  dernier_echec: string | null;
};

export function lireOuvertureDeLEspace(reference: string) {
  return appeler<OuvertureDeLEspace>(
    `/acquisition/dossiers/${encodeURIComponent(reference)}/ouverture`,
    authentifie,
  );
}
