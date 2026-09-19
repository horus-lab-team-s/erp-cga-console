/**
 * Le contexte F · Obligations et déclarations, côté écran.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ÉCHÉANCIER SE CALCULE À LA DEMANDE, IL NE SE STOCKE PAS
 *
 * Il découle du profil du dossier — régime, rattachement, assujettissement,
 * exercice —, tous historisés. Le persister figerait un calendrier qui
 * deviendrait faux au premier changement de régime, et personne ne verrait qu'il
 * l'est devenu.
 *
 * D'où `a_la_date` obligatoire sur presque tout : le retard est une comparaison
 * entre une échéance et une date, pas une propriété de l'obligation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";
import { aujourdhui } from "./portefeuille";

export type ObligationInstance = {
  entreprise: string;
  code_obligation: string;
  libelle: string;
  periode_debut: string;
  periode_fin: string;
  echeance: string;
  statut: "A_FAIRE" | "EN_PREPARATION" | "PRETE" | "DECLAREE" | "PAYEE";
  montant_estime: string | null;
  pieces_recues: number;
  pieces_attendues: number;
  declaree_le: string | null;
  reference_depot: string | null;
  deposee: boolean;
  complete: boolean;
  completude: string | null;
  /**
   * L'obligation dépend des salariés et le fichier du personnel n'a pas répondu :
   * elle figure par prudence (pas 56). Faux dans le cas ordinaire.
   */
  effectif_a_confirmer: boolean;
};

export type LigneEcheance = {
  obligation: ObligationInstance;
  jours_restants: number;
  en_retard: boolean;
};

/**
 * Une TVA refusée, au champ près du modèle `LigneRejet` du backend.
 *
 * ⚠️ Pas 79 : `piece`, `code_regle` et `motif` peuvent être `null` au backend, et ce type
 * les déclarait toujours présents. L'écran s'en servait comme clé de ligne : deux rejets
 * sans pièce auraient donné deux fois la clé « nullnull ». Relevé par la mesure de
 * nullité de `outils/contrat_des_ecrans.py`.
 */
export type LigneRejet = {
  piece: string | null;
  /** La clé de l'écriture dont la TVA est refusée : toujours renseignée. */
  ecriture: string;
  compte: string;
  code_regle: string | null;
  motif: string | null;
  montant: string;
};

export type DeclarationTVA = {
  entreprise: string;
  periode_debut: string;
  periode_fin: string;
  tva_collectee: string;
  tva_deductible_theorique: string;
  tva_rejetee: string;
  tva_deductible_admise: string;
  credit_reporte_anterieur: string;
  solde: string;
  detail_rejets: LigneRejet[];
  tva_a_payer: string;
  credit_a_reporter: string;
  neant: boolean;
  /** Ce que le contrôle a évité de réclamer à tort. La ligne qui vend. */
  cout_de_la_non_conformite: string;
  /** Pas 109 : les lignes du formulaire, codes et libellés au référentiel. */
  lignes: LigneDeDeclaration[];
  /** Pas 109 : les pièces de la période. */
  completude: {
    pieces_recues: number;
    pieces_traitees: number;
    pieces_en_souffrance: string[];
    pieces_attendues: string[];
    taux: number | null;
  };
  /** Pas 109 : la revue du mois ; `statut` nul si le mois n'a pas été transmis. */
  revue: { identifiant: string | null; statut: "TRANSMISE" | "RENVOYEE" | "VALIDEE" | null };
};

export type LigneDeDeclaration = {
  code: string;
  grandeur: string;
  libelle: string;
  base: string | null;
  /** Nul pour une base sans taxe (ventes exonérées). Rejet et crédit : positifs, qui se retranchent. */
  montant: string | null;
  ecritures: string[];
  base_partielle: boolean;
};

export type Anomalie = {
  code: string;
  niveau: "BLOQUANT" | "RESERVE" | "INFORMATION";
  libelle: string;
  remediation: string;
  enjeu: string | null;
  reference: string | null;
};

export type Recevabilite = {
  anomalies: Anomalie[];
  deposable: boolean;
  bloquants: Anomalie[];
  reserves: Anomalie[];
  enjeu_total: string;
  exige_une_decision: boolean;
};

export type DossierDeDepot = {
  document: {
    code_document: string;
    entreprise: string;
    periode_debut: string;
    periode_fin: string;
    format: string;
    contenu: string;
    montant_a_payer: string | null;
    empreinte: string;
    reference: string;
  };
  recevabilite: Recevabilite;
  accuse: { numero: string; depose_le: string; verifiable: boolean } | null;
  depot_automatique: boolean;
  deja_depose: boolean;
  a_deposer: boolean;
};

const authentifie = { authentifie: true } as const;

export function lireEcheancier(niu: string, exercice: string, a_la_date = aujourdhui()) {
  const p = new URLSearchParams({ exercice, a_la_date });
  return appeler<LigneEcheance[]>(
    `/obligations/dossiers/${encodeURIComponent(niu)}/echeancier?${p}`,
    authentifie,
  );
}

export function lireDeclarationTva(
  niu: string,
  periode_debut: string,
  periode_fin: string,
) {
  const p = new URLSearchParams({ periode_debut, periode_fin });
  return appeler<DeclarationTVA>(
    `/obligations/dossiers/${encodeURIComponent(niu)}/declaration-tva?${p}`,
    authentifie,
  );
}

export function lireDossierDepot(
  niu: string,
  periode_debut: string,
  periode_fin: string,
  a_la_date = aujourdhui(),
) {
  const p = new URLSearchParams({ periode_debut, periode_fin, a_la_date });
  return appeler<DossierDeDepot>(
    `/obligations/dossiers/${encodeURIComponent(niu)}/depot-tva?${p}`,
    authentifie,
  );
}

/** Une relance d'échéance du jour (jalons J-15, J-7, J-2, J+1). */
export type RelanceEcheance = {
  obligation: ObligationInstance;
  jalon: number;
  jours_restants: number;
  urgente: boolean;
  depassee: boolean;
};

/** Un type d'obligation du catalogue. Les champs de calendrier dépendent de la périodicité. */
export type TypeObligation = {
  code: string;
  libelle: string;
  portail: string;
  periodicite: string;
  jour_limite: number | null;
  delai_jours_apres_cloture: number | null;
  jour_civil: number | null;
  mois_civil: number | null;
  regimes_concernes: string[] | null;
  exige_assujettissement_tva: boolean;
  exige_salaries: boolean;
  declaration_neant_due: boolean;
  payable_d_avance: boolean;
};

/** Un paramètre du référentiel tel que le backend l'a résolu : valeur, texte, statut. */
export type ParametreEmploye = {
  code: string;
  libelle: string;
  valeur: number | string | boolean;
  applicable_du: string;
  statut: string;
  valide_par: string | null;
  fondement: { texte: string; source: string };
};

export type PenaliteSimulee = {
  montant_du: string;
  jours_de_retard: number;
  mois_de_retard: number;
  penalite_fixe: string;
  majoration_mensuelle: string;
  total: string;
  a_regler: string;
  taux_fixe: ParametreEmploye;
  taux_mensuel: ParametreEmploye;
};

export type DepotConstate = {
  obligation: ObligationInstance;
  accuse: { numero: string; depose_le: string };
  reserves_assumees: string[];
};

/** Les relances d'échéance du jour, sur tout le portefeuille de la session. */
export function lireRelancesDEcheance(a_la_date: string) {
  return appeler<RelanceEcheance[]>(`/obligations/relances?a_la_date=${encodeURIComponent(a_la_date)}`, authentifie);
}

export function lireCatalogueDesObligations(a_la_date: string) {
  return appeler<TypeObligation[]>(`/obligations/catalogue?a_la_date=${encodeURIComponent(a_la_date)}`, authentifie);
}

/** Le mois écoulé, période de déclaration la plus courante. */
export function moisPrecedent(): { debut: string; fin: string; libelle: string } {
  const maintenant = new Date();
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth(), 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    debut: iso(debut),
    fin: iso(fin),
    libelle: debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  };
}
