/**
 * Accès au rapprochement bancaire (pas 101).
 *
 * ⚠️ Tout est exprimé du point de vue de l'entreprise : `DEBIT` est un encaissement (le
 * compte 521 augmente), `CREDIT` une sortie. Le backend a traduit le relevé de la banque à
 * l'import ; l'écran n'a jamais à inverser un signe.
 */

import { appeler } from "@/app/lib/api";

export type Sens = "DEBIT" | "CREDIT";
export type Force = "FORTE" | "POSSIBLE" | "A_ECARTER";
export type NatureJustification = "PIECE_DEMANDEE" | "ECRITURE_A_VENIR" | "ERREUR_BANCAIRE";
export type StatutRapprochement = "EN_COURS" | "VALIDE" | "ABANDONNE";

export type LigneDeReleve = { rang: number; date: string; libelle: string; montant: string; sens: Sens };

export type MouvementComptable = {
  ecriture: string;
  ligne: number;
  date: string;
  libelle: string;
  montant: string;
  sens: Sens;
  piece: string | null;
  reference: string | null;
  validee: boolean;
};

export type Proposition = { mouvement: MouvementComptable; force: Force; motifs: string[]; ecart_jours: number };

export type Appariement = {
  rang: number;
  ecriture: string;
  ligne: number;
  mode: "AUTOMATIQUE" | "MANUEL";
  motifs: string[];
  par: string;
  le: string;
};

export type Justification = { rang: number; nature: NatureJustification; motif: string; par: string; le: string };

export type EtatDeRapprochement = {
  au: string;
  solde_releve: string;
  solde_comptable: string;
  releve_non_rapproche: string;
  comptable_non_rapproche: string;
  ecart_inexplique: string;
  lignes: number;
  rapprochees: number;
  automatiques: number;
  justifiees: number;
  a_traiter: number;
};

export type RapprochementBancaire = {
  identifiant: string;
  dossier: string;
  journal: string;
  compte: string;
  exercice: string;
  du: string;
  au: string;
  solde_initial: string;
  solde_final: string;
  lignes: LigneDeReleve[];
  source: string;
  importe_par: string;
  importe_le: string;
  appariements: Appariement[];
  justifications: Justification[];
  statut: StatutRapprochement;
  valide_par: string | null;
  valide_le: string | null;
  etat_valide: EtatDeRapprochement | null;
  motif_abandon: string | null;
};

export type LigneLue = {
  ligne: LigneDeReleve;
  appariement: Appariement | null;
  mouvement: MouvementComptable | null;
  justification: Justification | null;
  propositions: Proposition[];
};

export type VueRapprochement = {
  rapprochement: RapprochementBancaire;
  etat: EtatDeRapprochement;
  lignes: LigneLue[];
  mouvements_non_rapproches: MouvementComptable[];
  reglages: { fenetre_jours: number; fenetre_proche_jours: number; source: string };
};

export type ResumeDeRapprochement = {
  identifiant: string;
  journal: string;
  compte: string;
  du: string;
  au: string;
  statut: StatutRapprochement;
  source: string;
  lignes: number;
  a_traiter: number;
  ecart_inexplique: string;
};

export type ProfilDeReleve = { code: string; libelle: string };

export async function lireRapprochements(niu: string): Promise<ResumeDeRapprochement[]> {
  return appeler<ResumeDeRapprochement[]>(`/comptabilite/dossiers/${encodeURIComponent(niu)}/rapprochements`, {
    authentifie: true,
  });
}

export async function lireRapprochement(niu: string, identifiant: string): Promise<VueRapprochement> {
  return appeler<VueRapprochement>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/rapprochements/${encodeURIComponent(identifiant)}`,
    { authentifie: true },
  );
}

export async function lireProfilsDeReleve(): Promise<ProfilDeReleve[]> {
  return appeler<ProfilDeReleve[]>("/comptabilite/releves/profils", { authentifie: true });
}

/** Le montant signé du point de vue de l'entreprise : positif = entré sur le compte. */
export function signe(montant: string, sens: Sens): number {
  return sens === "DEBIT" ? Number(montant) : -Number(montant);
}
