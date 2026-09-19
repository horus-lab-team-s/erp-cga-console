/**
 * Accès à la revue d'un mois transmis (pas 102).
 *
 * Le circuit : le comptable transmet ; le réviseur pose des remarques rattachées à une
 * écriture, une pièce ou un compte, puis renvoie ou valide ; le comptable répond et
 * retransmet. Voir `domaine/revue.py` côté backend.
 */

import { appeler } from "@/app/lib/api";

export type StatutRevue = "TRANSMISE" | "RENVOYEE" | "VALIDEE";
export type StatutRemarque = "OUVERTE" | "TRAITEE" | "CLOSE";
export type NatureObjet = "ECRITURE" | "PIECE" | "COMPTE";

export type ResumeDeRevue = {
  identifiant: string;
  dossier: string;
  du: string;
  au: string;
  statut: StatutRevue;
  transmise_par: string;
  transmise_par_compte: string;
  ouvertes: number;
  traitees: number;
  closes: number;
  echantillon: number;
  ecritures_du_mois: number;
};

export type Remarque = {
  rang: number;
  objet: { nature: NatureObjet; reference: string };
  texte: string;
  par: string;
  le: string;
  statut: StatutRemarque;
  reponse: string | null;
  repondue_par: string | null;
  repondue_le: string | null;
  close_par: string | null;
  close_le: string | null;
};

export type EcritureEchantillonnee = {
  ecriture: string;
  date: string;
  libelle: string;
  montant: string;
  criteres: string[];
  raisons: string[];
};

export type PassageDeRelais = { statut: StatutRevue; par: string; compte: string; le: string; message: string | null };

export type RevueDeDossier = {
  identifiant: string;
  dossier: string;
  exercice: string;
  du: string;
  au: string;
  statut: StatutRevue;
  transmise_par_compte: string;
  transmise_par: string;
  echantillon: EcritureEchantillonnee[];
  ecritures_du_mois: number;
  remarques: Remarque[];
  historique: PassageDeRelais[];
  validee_par: string | null;
  validee_le: string | null;
};

export type PointDeControle = { code: string; libelle: string; conforme: boolean; detail: string };

export type EcritureDuMois = { cle: string; date: string; libelle: string; montant: string; piece: string | null; comptes: string[] };

export type VueRevue = {
  revue: RevueDeDossier;
  points: PointDeControle[];
  ecritures: EcritureDuMois[];
  auteur_de_la_transmission: boolean;
};

export async function lireLesRevues(): Promise<ResumeDeRevue[]> {
  return appeler<ResumeDeRevue[]>("/comptabilite/revues", { authentifie: true });
}

export async function lireLaRevue(niu: string, identifiant: string): Promise<VueRevue> {
  return appeler<VueRevue>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/revues/${encodeURIComponent(identifiant)}`,
    { authentifie: true },
  );
}
