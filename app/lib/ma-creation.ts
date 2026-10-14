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
