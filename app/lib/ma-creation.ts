import { appeler } from "./api";

/**
 * Ce que la cliente connectée lit de sa création : `GET /creations/mes-creations`.
 *
 * ⚠️ Le même sous-ensemble que son lien de suivi, et rien de plus : ni jalons,
 * ni commentaires du cabinet. Un compte lui évite de chercher un courriel, il
 * ne lui donne pas d'autres droits sur son dossier.
 */
export type PieceAttendue = {
  code: string;
  libelle: string;
  obligatoire: boolean;
  fournie: boolean;
  fournie_le: string | null;
  /** Un document est joint : elle peut le relire. */
  document?: boolean;
};

export type IdentifiantsDeMaSociete = {
  rccm: string | null;
  rccm_obtenu_le: string | null;
  niu: string | null;
  niu_obtenu_le: string | null;
  patente: string | null;
  patente_obtenue_le: string | null;
  cnps: string | null;
  cnps_obtenu_le: string | null;
  immatriculee: boolean;
};

export type SuiviDeMaCreation = {
  reference: string;
  denomination_souhaitee: string;
  forme_juridique: string;
  etape: string;
  ouvert_le: string;
  clos: boolean;
  pieces: PieceAttendue[];
  manquantes_bloquantes: number;
  identifiants: IdentifiantsDeMaSociete;
};

export async function lireMesCreations(): Promise<SuiviDeMaCreation[]> {
  return appeler<SuiviDeMaCreation[]>("/creations/mes-creations", { authentifie: true });
}

/**
 * Sa proforma et son reçu, sous session (15 octobre 2026) : `GET /mes-documents/creation`.
 *
 * Sans cela, la proforma n'était lisible que par le lien signé du courriel, qui expire,
 * et rien n'attestait ce qu'elle avait réglé. Le dossier est le dossier commercial :
 * celui de la création s'appelle `CRE-<dossier>`.
 */
export type ProformaDeLaCliente = {
  numero: string;
  version: number;
  etat: "TRANSMISE" | "ACCEPTEE";
  total: string;
  emise_le: string;
};

export type MesDocumentsDeCreation = {
  dossier: string;
  denomination: string | null;
  proformas: ProformaDeLaCliente[];
  reglee: boolean;
  reglee_le: string | null;
};

export async function lireMesDocumentsDeCreation(): Promise<MesDocumentsDeCreation[]> {
  return appeler<MesDocumentsDeCreation[]>("/mes-documents/creation", { authentifie: true });
}
