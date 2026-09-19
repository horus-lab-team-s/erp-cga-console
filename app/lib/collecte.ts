/**
 * Les pièces justificatives, telles que le backend les rend.
 *
 * Les états, les anciennetés et les retards sont **calculés par le backend** et
 * arrivent déjà résolus. Le front ne recalcule rien : « en retard » est une
 * comparaison entre une date de demande et une date du jour, et deux
 * implémentations de cette comparaison finiraient par diverger d'un jour.
 */

import { appeler } from "./api";
import { aujourdhui } from "./portefeuille";

export type EtatPiece =
  | "RECUE"
  | "LUE"
  | "RAPPROCHEE"
  | "COMPTABILISEE"
  | "ARCHIVEE";

export type CanalDepot =
  | "PORTAIL"
  | "MOBILE"
  | "WHATSAPP"
  | "COURRIEL"
  | "IMPORT_BANCAIRE"
  | "DEPOT_CABINET";

/**
 * Une ligne de `GET /collecte/pieces`, **au champ près** du modèle `LignePiece` du backend.
 *
 * ⚠️ Pas 76 : ce type déclarait `en_attente_de_traitement`, que la route ne rend pas
 * (c'est une propriété de l'entité, jamais sérialisée). TypeScript ne voit pas l'écart
 * entre un type et une réponse réseau : le champ valait `undefined`, donc faux, et le
 * compte des pièces « en souffrance » de l'espace adhérent valait toujours zéro. Le
 * backend rend `traitee` : une pièce est en attente de traitement quand `!traitee`.
 */
export type LignePiece = {
  identifiant: string;
  entreprise: string;
  canal: CanalDepot;
  etat: EtatPiece;
  type: string;
  depose_le: string;
  recue_le: string;
  jours_de_transmission: number;
  anciennete: number;
  retard_de_remise: number | null;
  reference_document: string | null;
  date_document: string | null;
  montant_ttc: number | null;
  emetteur: string | null;
  nom_fichier: string | null;
  reference_rapport: string | null;
  reference_ecriture: string | null;
  /** Comptabilisée, ou au-delà. Son contraire est « en attente de traitement ». */
  traitee: boolean;
  /** Type, référence, date et montant connus : la pièce peut être contrôlée. */
  identifiee: boolean;
  commentaire: string | null;
};

export async function lirePieces(options: {
  entreprise?: string;
  enSouffrance?: boolean;
  a_la_date?: string;
}): Promise<LignePiece[]> {
  const parametres = new URLSearchParams({
    a_la_date: options.a_la_date ?? aujourdhui(),
  });
  if (options.entreprise) parametres.set("entreprise", options.entreprise);
  if (options.enSouffrance) parametres.set("en_souffrance", "true");
  return appeler<LignePiece[]>(`/collecte/pieces?${parametres}`, {
    authentifie: true,
  });
}

/** Une demande de pièce, telle que `GET /collecte/demandes` la rend. */
export type DemandePiece = {
  identifiant: string;
  entreprise: string;
  type_attendu: string;
  motif: string;
  demandee_le: string;
  attendue_pour: string | null;
  bloquante: boolean;
  statut: "OUVERTE" | "SATISFAITE" | "CLASSEE_SANS_SUITE";
  pieces_recues: string[];
  satisfaite_le: string | null;
  motif_classement: string | null;
  classee_le: string | null;
  /** La pièce dont on attend la rectification (pas 74). */
  piece_a_rectifier: string | null;
  demandee_par: string | null;
  /** `[date, canal]` : la trace opposable des relances émises. */
  relances: [string, CanalDepot][];
  /** Pas 112 : les réponses de l'adhérent, dans l'ordre. Une réponse ne ferme pas la demande. */
  reponses: ReponseDeLAdherent[];
  derniere_reponse: ReponseDeLAdherent | null;
  ouverte: boolean;
};

export type ReponseDeLAdherent = {
  nature: "PLUS_TARD" | "INTROUVABLE" | "MESSAGE";
  message: string | null;
  le: string;
  par: string;
  annoncee_pour: string | null;
};

/** Ce que la réponse dit, pour le cabinet (les mots de l'adhérent sont au référentiel). */
export const SENS_DES_REPONSES: Record<ReponseDeLAdherent["nature"], string> = {
  PLUS_TARD: "l'aura plus tard",
  INTROUVABLE: "n'a pas ce document",
  MESSAGE: "a écrit",
};

export async function lireDemandes(options: { entreprise?: string; ouvertesSeulement?: boolean } = {}) {
  const parametres = new URLSearchParams({ ouvertes_seulement: String(options.ouvertesSeulement ?? true) });
  if (options.entreprise) parametres.set("entreprise", options.entreprise);
  return appeler<DemandePiece[]>(`/collecte/demandes?${parametres}`, { authentifie: true });
}

/** Une relance de pièce à émettre aujourd'hui (jalons J+7, J+15, J+30 après la demande). */
export type RelancePiece = {
  demande: DemandePiece;
  jalon: number;
  canal: CanalDepot;
  /** Au-delà de trente jours : l'affaire d'un responsable de portefeuille, plus d'un automate. */
  escalade: boolean;
};

/** Réservé à `RELANCER_ADHERENT`, restreint au portefeuille par le backend. */
export async function lireRelancesDePieces(a_la_date = aujourdhui()) {
  return appeler<RelancePiece[]>(`/collecte/relances?a_la_date=${encodeURIComponent(a_la_date)}`, { authentifie: true });
}

export const LIBELLES_CANAL: Record<CanalDepot, string> = {
  PORTAIL: "Portail",
  MOBILE: "Application mobile",
  WHATSAPP: "WhatsApp",
  COURRIEL: "Courriel",
  IMPORT_BANCAIRE: "Import bancaire",
  DEPOT_CABINET: "Déposée au cabinet",
};

export const LIBELLES_ETAT: Record<EtatPiece, string> = {
  RECUE: "Reçue",
  LUE: "Lue",
  RAPPROCHEE: "Rapprochée",
  COMPTABILISEE: "Comptabilisée",
  ARCHIVEE: "Archivée",
};
