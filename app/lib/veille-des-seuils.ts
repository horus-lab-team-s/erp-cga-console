/**
 * La veille des seuils du portefeuille, côté écran.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX REVUES, UNE MÊME MÉCANIQUE, DEUX VOCABULAIRES
 *
 * `GET /obligations/seuils-de-regime` dit quels dossiers franchissent le seuil
 * d'assujettissement à la TVA, donc changent de régime. `GET
 * /obligations/eligibilite-des-adherents` dit quels adhérents sortent du champ de
 * l'article 118, donc du Centre. Le backend calcule les deux avec les mêmes
 * mesures, mais ne les nomme pas de la même façon, et l'écran non plus : un
 * « reclassement » n'a aucun sens pour une adhésion.
 *
 * ⚠️ L'ÉCRAN NE REFAIT AUCUN RAISONNEMENT
 *
 * `reclassement_du`, `a_surveiller`, `hors_champ` viennent du backend, calculés.
 * Les recalculer ici à partir des chiffres ferait une seconde règle, qui
 * divergerait de la première à la prochaine correction, comme celle de la borne
 * d'un seuil au pas 49. L'écran affiche des conclusions, il n'en tire pas.
 *
 * ⚠️ RIEN N'EST EXTRAPOLÉ
 *
 * Un chiffre d'affaires d'exercice en cours s'affiche avec la part de l'exercice
 * écoulée, et jamais projeté sur l'année : une entreprise saisonnière rendrait la
 * projection fausse.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type Borne = "INCLUSE" | "EXCLUSE";

export type DiagnosticSeuil = {
  regime_actuel: "IGS" | "REEL";
  chiffre_affaires: string;
  seuil: string;
  borne: Borne;
  taux_d_approche: string;
  franchi: boolean;
  reclassement_requis: boolean;
  alerte_anticipee: boolean;
};

export type MesureDeSeuil = {
  exercice: string;
  clos: boolean;
  part_ecoulee: string;
  diagnostic: DiagnosticSeuil;
};

export type SurveillanceDuDossier = {
  niu: string;
  denomination: string;
  a_la_date: string;
  seuil: string;
  borne: Borne;
  acquis: MesureDeSeuil | null;
  en_cours: MesureDeSeuil | null;
  reclassement_inscrit_au: string | null;
  reclassement_du: boolean;
  a_surveiller: boolean;
};

export type MesureDEligibilite = {
  exercice: string;
  clos: boolean;
  part_ecoulee: string;
  chiffre_affaires: string;
  taux_d_approche: string;
  au_dela_du_seuil: boolean;
  alerte_anticipee: boolean;
};

export type EligibiliteDeLAdherent = {
  niu: string;
  denomination: string;
  numero_adhesion: string | null;
  a_la_date: string;
  seuil: string;
  borne: Borne;
  acquis: MesureDEligibilite | null;
  en_cours: MesureDEligibilite | null;
  hors_champ: boolean;
  a_surveiller: boolean;
};

/**
 * ⚠️ `tout` est faux par défaut, comme côté backend : une revue de cent dossiers
 * dont trois méritent un regard se lit une fois, puis plus jamais.
 */
export function lireSeuilsDeRegime(aLaDate: string, tout = false) {
  return appeler<SurveillanceDuDossier[]>(
    `/obligations/seuils-de-regime?a_la_date=${aLaDate}&a_surveiller_seulement=${!tout}`,
    { authentifie: true },
  );
}

export function lireEligibiliteDesAdherents(aLaDate: string, tout = false) {
  return appeler<EligibiliteDeLAdherent[]>(
    `/obligations/eligibilite-des-adherents?a_la_date=${aLaDate}&a_surveiller_seulement=${!tout}`,
    { authentifie: true },
  );
}

/** « 84 % » à partir de « 0.8400 ». Arrondi à l'entier : c'est une lecture, pas un calcul. */
export function pourcentage(taux: string): string {
  return `${Math.round(Number(taux) * 100)} %`;
}

/** La veille d'un seul dossier (pas 90), lue dans ses livres à la date demandée. */
export function lireVeilleDUnDossier(niu: string, aLaDate: string) {
  return appeler<SurveillanceDuDossier>(
    `/obligations/dossiers/${encodeURIComponent(niu)}/seuil-de-regime?a_la_date=${encodeURIComponent(aLaDate)}`,
    { authentifie: true },
  );
}
