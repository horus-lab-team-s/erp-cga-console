/**
 * Accès au contexte G · Social et paie.
 *
 * ⚠️ Aucune de ces lectures ne rend un bulletin stocké : le backend les calcule
 * à la date de la période demandée. Un mois passé rouvert affiche donc les taux
 * de ce mois-là, pas ceux d'aujourd'hui.
 */

import { appeler } from "@/app/lib/api";

export type LigneSalarie = {
  matricule: string;
  nom: string;
  prenom: string;
  matricule_cnps: string | null;
  poste: string | null;
  type_contrat: string | null;
  depuis: string | null;
  salaire_base: string | null;
  /** Aucun contrat ne couvre la date : sorti, ou pas encore entré. */
  sans_contrat: boolean;
};

export type LigneRetenue = {
  code: string;
  libelle: string;
  assiette: string;
  taux: string | null;
  montant: string;
  a_charge_du_salarie: boolean;
  fondement_code: string | null;
  non_valide: boolean;
};

export type Bulletin = {
  salarie: string;
  entreprise: string;
  periode: { annee: number; mois: number };
  salaire_base: string;
  primes: string;
  avantages_evalues: string;
  lignes: LigneRetenue[];
  /**
   * ⚠️ Pas 89 : calculés par le backend et désormais rendus. L'écran ne recalcule pas le
   * net : les avantages en nature sortent du net, et une règle recopiée ici paierait un
   * jour deux fois le logement.
   */
  brut_taxable: string;
  retenues_salariales: string;
  charges_patronales: string;
  net_a_payer: string;
  cout_employeur: string;
  repose_sur_des_valeurs_non_validees: boolean;
};

export type GroupeRisque = "A" | "B" | "C";

/**
 * Le bulletin d'un salarié pour un mois, calculé.
 *
 * ⚠️ Le groupe de risque professionnel est notifié par la CNPS au dossier ; il n'est pas
 * encore porté par le dossier (Q25). L'écran le demande et dit qu'il est supposé.
 */
export async function lireBulletin(
  entreprise: string,
  annee: number,
  mois: number,
  matricule: string,
  groupe: GroupeRisque,
): Promise<Bulletin> {
  return appeler<Bulletin>(
    `/social/dossiers/${encodeURIComponent(entreprise)}/bulletins/${annee}/${mois}/${encodeURIComponent(matricule)}` +
      `?groupe_risque=${groupe}`,
    { authentifie: true },
  );
}

export type Declaration = {
  entreprise: string;
  periode: string;
  effectif: number;
  masse_salariale_brute: string;
  retenues_salariales: string;
  charges_patronales: string;
  total_a_verser: string;
  cotisations_cnps: string;
  a_deposer_avant: string;
  en_retard: boolean;
  repose_sur_des_valeurs_non_validees: boolean;
  mouvements: { salarie: string; sens: string; survenu_le: string }[];
  bulletins: Bulletin[];
};

export async function lirePersonnel(
  entreprise: string,
  aLaDate: string,
): Promise<LigneSalarie[]> {
  return appeler<LigneSalarie[]>(
    `/social/dossiers/${encodeURIComponent(entreprise)}/salaries` +
      `?a_la_date=${encodeURIComponent(aLaDate)}`,
    { authentifie: true },
  );
}

export async function lireDeclaration(
  entreprise: string,
  annee: number,
  mois: number,
  aLaDate: string,
): Promise<Declaration> {
  return appeler<Declaration>(
    `/social/dossiers/${encodeURIComponent(entreprise)}/declaration/${annee}/${mois}` +
      `?a_la_date=${encodeURIComponent(aLaDate)}`,
    { authentifie: true },
  );
}

/**
 * Le mois de paie à afficher par défaut : **le mois précédent**.
 *
 * Et non le mois courant, qui n'est pas terminé : une déclaration du mois en
 * cours serait incomplète, et l'afficher par défaut ferait croire à un effectif
 * qui a fondu. Le cabinet travaille sur le mois clos ; c'est celui-là qu'il
 * ouvre.
 */
export function moisDePaieParDefaut(aujourdHui: Date = new Date()): {
  annee: number;
  mois: number;
} {
  const mois = aujourdHui.getMonth(); // 0-11 : déjà le mois précédent en 1-12
  return mois === 0
    ? { annee: aujourdHui.getFullYear() - 1, mois: 12 }
    : { annee: aujourdHui.getFullYear(), mois };
}

export const LIBELLES_MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
