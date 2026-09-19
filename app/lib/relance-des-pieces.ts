/**
 * Relancer un adhérent des pièces qui manquent à son mois (pas 111).
 * Maquette « Parcours comptable », vue F.
 *
 * ⚠️ Chemins **littéraux** : l'outil du contrat des écrans et la mesure d'avancement ne lisent
 * que les littéraux (leçon du pas 101).
 */

import { appeler } from "@/app/lib/api";

export type AttenteDePiece = {
  code: string;
  libelle: string;
  origine: "DEMANDE_OUVERTE" | "RELEVE_BANCAIRE" | "MOUVEMENT_SANS_PIECE" | "SERIE_HABITUELLE" | "OBLIGATION_DU_MOIS" | "ANOMALIE_BLOQUANTE";
  type_attendu: string;
  montant_estime: string | null;
  demande: string | null;
  demandee_le: string | null;
  /** Pas 112 : la règle d'une anomalie, pour le cabinet seul (le libellé part chez l'adhérent). */
  regle: string | null;
  /** Pas 112 : la dernière réponse de l'adhérent, rédigée par le backend. */
  reponse: string | null;
  reponse_le: string | null;
};

export type CanalDeRelance = "APPLICATION" | "COURRIEL" | "WHATSAPP";

export type VueDeRelance = {
  dossier: string;
  denomination: string;
  mois: string;
  du: string;
  au: string;
  attentes: AttenteDePiece[];
  selection: string[];
  date_limite: string;
  date_limite_estimee: boolean;
  echeance_depassee: boolean;
  modeles: { code: string; libelle: string; introduction: string; conclusion: string }[];
  modele: string;
  apercu: { introduction: string; liste: string[]; conclusion: string; signature: string };
  canaux: { canal: CanalDeRelance; actif: boolean; par_defaut: boolean; motif: string | null }[];
  destinataires: string[];
  historique: { quand: string; canal: string; contenu: string; etat: string }[];
  derniere_relance: string | null;
};

export function lireLaRelance(niu: string, mois: string, attentes: string[] | null, modele: string | null) {
  const p = new URLSearchParams({ mois });
  if (attentes !== null) p.set("attentes", attentes.join(","));
  if (modele) p.set("modele", modele);
  return appeler<VueDeRelance>(`/pilotage/dossiers/${encodeURIComponent(niu)}/relance?${p}`, { authentifie: true });
}
