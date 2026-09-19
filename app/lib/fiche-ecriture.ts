/**
 * La fiche d'une écriture, sa correction, et la palette des comptes (pas 110).
 * Maquette « Parcours comptable », vue E.
 *
 * ⚠️ Chemins **littéraux** : l'outil du contrat des écrans et la mesure d'avancement ne lisent
 * que les littéraux (leçon du pas 101).
 */

import { appeler } from "@/app/lib/api";
import type { Ecriture } from "@/app/lib/comptabilite";

export type EvenementDEcriture = { quand: string | null; quoi: string; qui: string | null };

/** La ligne, avec son attribut fiscal typé (le type commun le laisse `unknown`). */
export type LigneDeFiche = Omit<Ecriture["lignes"][number], "attribut_fiscal"> & { attribut_fiscal: AttributFiscal | null };

export type FicheDEcriture = {
  ecriture: Omit<Ecriture, "lignes"> & { lignes: LigneDeFiche[] };
  modifiable: boolean;
  historique: EvenementDEcriture[];
  contrepassee_par: string[];
  verrou: { du: string; au: string; revue: string; statut: string; depuis: string; par: string } | null;
  exercice_clos: boolean;
  peut_contrepasser: boolean;
  raison_de_ne_pas_contrepasser: string | null;
};

export type AttributFiscal = {
  tva_deductible: boolean | null;
  charge_deductible: boolean | null;
  motif_non_deductibilite: string | null;
  montant_a_reintegrer: string | null;
  code_regle_origine: string | null;
};

export type ApercuDeContrepassation = {
  origine: string;
  date_operation: string;
  inverse: Ecriture | null;
  refus: string | null;
};

export type ImpactDeLaContrepassation = {
  periode_debut: string;
  periode_fin: string;
  refus: string | null;
  assujettie: boolean;
  touche_la_tva: boolean;
  avant: { tva_a_payer: string; credit_a_reporter: string } | null;
  apres: { tva_a_payer: string; credit_a_reporter: string } | null;
  deja_deposee: boolean;
  message: string;
};

export type CompteUtilise = { compte: string; lignes: number };

const authentifie = { authentifie: true } as const;

export function lireLaFicheDEcriture(niu: string, exercice: string, journal: string, numero: number) {
  return appeler<FicheDEcriture>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/ecritures/${encodeURIComponent(exercice)}/${encodeURIComponent(journal)}/${numero}/fiche`,
    authentifie,
  );
}

export function lireLApercuDeContrepassation(niu: string, exercice: string, journal: string, numero: number, dateOperation: string) {
  return appeler<ApercuDeContrepassation>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/ecritures/${encodeURIComponent(exercice)}/${encodeURIComponent(journal)}/${numero}/contre-passation/apercu?date_operation=${encodeURIComponent(dateOperation)}`,
    authentifie,
  );
}

export function lireLImpactDeLaContrepassation(niu: string, exercice: string, journal: string, numero: number, dateOperation: string) {
  const p = new URLSearchParams({ exercice, journal, numero: String(numero), date_operation: dateOperation });
  return appeler<ImpactDeLaContrepassation>(`/obligations/dossiers/${encodeURIComponent(niu)}/impact-contrepassation?${p}`, authentifie);
}

export function lireLesComptesUtilises(niu: string, exercice: string) {
  return appeler<CompteUtilise[]>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/comptes-utilises?exercice=${encodeURIComponent(exercice)}`,
    authentifie,
  );
}

export function lireUneEcriture(niu: string, exercice: string, journal: string, numero: number) {
  return appeler<Ecriture>(
    `/comptabilite/dossiers/${encodeURIComponent(niu)}/ecritures/${encodeURIComponent(exercice)}/${encodeURIComponent(journal)}/${numero}`,
    authentifie,
  );
}
