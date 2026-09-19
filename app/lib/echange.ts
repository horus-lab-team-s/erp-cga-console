/**
 * L'échange avec le logiciel du client : profils, plan d'imputation, reprise (pas 85).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN CENTRE DE GESTION NE REMPLACE PAS LE LOGICIEL DE SES ADHÉRENTS
 *
 * Il s'y branche. Les formats (« profils ») sont une donnée du référentiel : l'écran
 * les lit et ne les recopie jamais, sans quoi il proposerait un profil retiré le matin.
 *
 * ⚠️ LA REPRISE SE CONTRÔLE AVANT DE S'APPLIQUER
 *
 * Les écritures reprises entrent en brouillon, et un brouillon ne se supprime pas
 * (Q23). Le rapport de contrôle dit exactement ce qui entrerait ; depuis le pas 85, il
 * refuse aussi une écriture déjà présente dans le dossier, pour qu'un fichier appliqué
 * deux fois ne double pas l'exercice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type ProfilDEchange = {
  code: string;
  libelle: string;
  remarque: string;
  colonnes: string[];
  encodage: string;
};

export type RegleImputation = { motif: string; compte: string; libelle: string; priorite: number };

export type PlanImputation = {
  compte_charge_par_defaut: string;
  compte_fournisseur: string;
  compte_tva_deductible: string;
  compte_tva_non_recuperable: string | null;
  regles: RegleImputation[];
};

export function lireProfilsDEchange(): Promise<ProfilDEchange[]> {
  return appeler<ProfilDEchange[]>("/comptabilite/echange/profils", { authentifie: true });
}

export function lirePlanImputation(entreprise: string): Promise<PlanImputation> {
  return appeler<PlanImputation>(`/comptabilite/dossiers/${encodeURIComponent(entreprise)}/plan-imputation`, {
    authentifie: true,
  });
}
