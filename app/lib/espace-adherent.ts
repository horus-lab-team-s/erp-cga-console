/**
 * L'accueil et les justificatifs de l'adhérent (pas 112, maquette « Espace adhérent CGA », vues B et C).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE BACKEND DÉCIDE, ET QUE L'ÉCRAN NE REFAIT PAS
 *
 * - **Le bandeau** : son état, son titre et son texte arrivent rédigés
 *   (`Docs/referentiel/pilotage/espace_adherent.yaml`). L'écran ne compte pas les pièces
 *   pour écrire « Il manque 3 justificatifs » : un compte refait ici divergerait du backend
 *   le jour où une demande se classe.
 * - **Le statut d'un justificatif** lu par l'adhérent (reçu, enregistré, classé, à corriger),
 *   et non l'état interne du traitement.
 * - **Les comptes par statut** du mois : « le front n'additionne pas ».
 * - **Les achats du mois** : rendus seulement pour un mois revu, avec la date où ils ont été
 *   arrêtés. Vides sinon, et l'écran dit pourquoi.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type EtatDuMois = "A_ENVOYER" | "EN_VERIFICATION" | "AUCUNE_PIECE" | "COMPLET";

export type AttendueDeLAdherent = {
  demande: string;
  libelle: string;
  type_attendu: string;
  demandee_le: string;
  attendue_pour: string | null;
  en_retard: boolean;
  bloquante: boolean;
  /** Une facture reçue dont le cabinet demande la version corrigée. */
  a_corriger: boolean;
  piece_a_rectifier: string | null;
  /** Sa dernière réponse, telle que le cabinet la lit. */
  reponse: string | null;
  reponse_le: string | null;
};

export type VueDuMois = {
  dossier: string;
  denomination: string;
  mois: string;
  nom_du_mois: string;
  bandeau: { etat: EtatDuMois; titre: string; detail: string };
  date_limite: string | null;
  attendues: AttendueDeLAdherent[];
  justificatifs_du_mois: number;
  achats: string | null;
  achats_arretes_le: string | null;
  mois_suivant: string | null;
  mois_precedent: string;
};

export function lireMonMois(niu: string, mois?: string) {
  const p = new URLSearchParams();
  if (mois) p.set("mois", mois);
  return appeler<VueDuMois>(`/pilotage/dossiers/${encodeURIComponent(niu)}/mon-mois?${p}`, { authentifie: true });
}

export type StatutPourLAdherent = "A_CORRIGER" | "RECU" | "ENREGISTRE" | "CLASSE";

/** Les mots de la maquette. « Reçu par le cabinet » : l'adhérent voit l'effet de son envoi. */
export const LIBELLES_STATUT_ADHERENT: Record<StatutPourLAdherent, string> = {
  A_CORRIGER: "À corriger",
  RECU: "Reçu par le cabinet",
  ENREGISTRE: "Enregistré par le cabinet",
  CLASSE: "Gardé au dossier",
};

/** Pour le compte du mois : « 2 reçus par le cabinet » (pas 112 : l'essai réel lisait « 2 reçu »). */
export function compteDuStatut(statut: StatutPourLAdherent, nombre: number): string {
  const pluriel = {
    A_CORRIGER: "à corriger",
    RECU: "reçus par le cabinet",
    ENREGISTRE: "enregistrés par le cabinet",
    CLASSE: "gardés au dossier",
  }[statut];
  return `${nombre} ${nombre > 1 ? pluriel : LIBELLES_STATUT_ADHERENT[statut].toLowerCase()}`;
}

export type LigneDeJustificatif = {
  identifiant: string;
  fournisseur: string | null;
  nom_fichier: string | null;
  reference: string | null;
  date_document: string | null;
  montant_ttc: string | null;
  statut: StatutPourLAdherent;
  a_corriger: string | null;
  demande: string | null;
  envoye_le: string;
  canal: string;
  type: string;
};

export type VueDesJustificatifs = {
  mois: string;
  mois_disponibles: string[];
  mois_precedent_avec_pieces: string | null;
  par_statut: Record<StatutPourLAdherent, number>;
  total_du_mois: number;
  lignes: LigneDeJustificatif[];
};

export function lireMesJustificatifs(
  niu: string,
  filtres: { mois?: string; statut?: StatutPourLAdherent; recherche?: string } = {},
) {
  const p = new URLSearchParams();
  if (filtres.mois) p.set("mois", filtres.mois);
  if (filtres.statut) p.set("statut", filtres.statut);
  if (filtres.recherche) p.set("recherche", filtres.recherche);
  return appeler<VueDesJustificatifs>(`/collecte/dossiers/${encodeURIComponent(niu)}/justificatifs?${p}`, {
    authentifie: true,
  });
}

export type NatureDeReponse = "PLUS_TARD" | "INTROUVABLE" | "MESSAGE";

export type ReglagesDesReponses = {
  jours_si_plus_tard: number;
  reponses: { nature: Exclude<NatureDeReponse, "MESSAGE">; libelle: string }[];
};

export function lireLesReponsesPossibles() {
  return appeler<ReglagesDesReponses>(`/collecte/reponses-possibles`, { authentifie: true });
}

const NOMS_DES_MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 2026-07 » → « juillet 2026 ». Un libellé de sélecteur, pas un calcul. */
export function nomDuMois(mois: string): string {
  return `${NOMS_DES_MOIS[Number(mois.slice(5, 7)) - 1]} ${mois.slice(0, 4)}`;
}

/** « de juillet 2026 », « d'août 2026 » : l'élision (pas 112, trouvée à l'essai réel). */
export function deMois(nom: string): string {
  return /^[aeiouéèêâ]/.test(nom) ? `d\u2019${nom}` : `de ${nom}`;
}

// ── Mes échéances (pas 113, vue D) ────────────────────────────────────────────

export type EtatDEcheance = "EN_RETARD" | "PREUVE_ENVOYEE" | "A_VENIR" | "DEPOSEE";

export type EcheanceDeLAdherent = {
  code_obligation: string;
  titre: string;
  libelle: string;
  periode_debut: string;
  periode_fin: string;
  periode: string;
  echeance: string;
  etat: EtatDEcheance;
  /** Jours de retard ou restants, toujours positif ; 0 pour une preuve envoyée ou un dépôt. */
  jours: number;
  montant_estime: string | null;
  montant_constate: string | null;
  declaree_le: string | null;
  de_quoi_s_agit_il: string | null;
  en_cas_de_retard: string | null;
  precedente: { periode: string; declaree_le: string | null; montant_constate: string | null } | null;
  prochaine_echeance: string | null;
  preuve: { code_obligation: string; periode_debut: string; piece: string; envoyee_le: string; par: string } | null;
  autres_periodes_en_retard: number;
  effectif_a_confirmer: boolean;
};

export type VueDesEcheances = {
  dossier: string;
  denomination: string;
  echeances: EcheanceDeLAdherent[];
  explications_validees: boolean;
};

export function lireMesEcheances(niu: string) {
  return appeler<VueDesEcheances>(`/obligations/dossiers/${encodeURIComponent(niu)}/mes-echeances`, {
    authentifie: true,
  });
}

/** La clé d'une carte dans l'adresse (`?echeance=`) et dans le formulaire de preuve. */
export function cleDEcheance(e: Pick<EcheanceDeLAdherent, "code_obligation" | "periode_debut" | "periode_fin">) {
  return `${e.code_obligation}|${e.periode_debut}|${e.periode_fin}`;
}

// ── Mon entreprise et mes documents (pas 114, vue E) ──────────────────────────

export type NatureDeChangement = "ADRESSE" | "DIRIGEANT" | "ACTIVITE" | "TELEPHONE" | "AUTRE";

export type MonEntreprise = {
  niu: string;
  denomination: string;
  forme: string;
  activite: string | null;
  rccm: string | null;
  siege: string | null;
  centre: string;
  regime: { code: string; titre: string; explication: string | null; depuis: string };
  assujettie_tva: boolean;
  adhesion_numero: string | null;
  adherente_depuis: string | null;
  dirigeants: { nom: string; qualite: string }[];
  /** Le chargé de clientèle du dossier, sinon son comptable ; `null` : « le cabinet ». */
  interlocuteur: { nom: string; role: string; courriel: string; telephone: string | null } | null;
  natures: { nature: NatureDeChangement; libelle: string; aide: string }[];
  signalements: { nature: NatureDeChangement; libelle: string; message: string; le: string }[];
  explications_validees: boolean;
};

export function lireMonEntreprise(niu: string) {
  return appeler<MonEntreprise>(`/portefeuille/entreprises/${encodeURIComponent(niu)}/mon-entreprise`, {
    authentifie: true,
  });
}

export type DocumentDeDepot = {
  numero: string;
  code_obligation: string;
  titre: string;
  periode: string;
  periode_debut: string;
  periode_fin: string;
  depose_le: string;
  guichet: string;
  montant_constate: string | null;
  verifiable: boolean;
};

export function lireMesDocuments(niu: string) {
  return appeler<{ dossier: string; denomination: string; documents: DocumentDeDepot[] }>(
    `/obligations/dossiers/${encodeURIComponent(niu)}/mes-documents`,
    { authentifie: true },
  );
}

// ── Mes rappels d'échéance (pas 115, vue F) ───────────────────────────────────

export type VueDesRappels = {
  /** `defini` faux : l'adhérent n'a rien réglé, c'est le défaut du référentiel. */
  preference: { actifs: boolean; jalons: number[]; defini: boolean };
  jalons_possibles: number[];
  whatsapp_disponible: boolean;
  motif_whatsapp: string;
};

export function lireMesRappels(niu: string) {
  return appeler<VueDesRappels>(`/obligations/dossiers/${encodeURIComponent(niu)}/mes-rappels`, {
    authentifie: true,
  });
}
