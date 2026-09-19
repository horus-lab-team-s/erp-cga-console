/**
 * La souscription en ligne : catalogue, devis, souscription, échéancier (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX PUBLICS, UN MÊME CONTEXTE
 *
 * Le visiteur, sans compte : il lit le catalogue, établit un devis, s'engage, puis suit
 * sa souscription. Ces lectures sont **publiques** au backend : la référence d'un devis
 * ou d'une souscription est longue et non devinable, et c'est elle qui les protège.
 *
 * Le cabinet, connecté : il lit les souscriptions payées qui attendent l'ouverture de
 * l'accès, les relances d'impayés et les services à suspendre.
 *
 * ⚠️ PAYER N'OUVRE PLUS L'ACCÈS À UN DOSSIER
 *
 * Jusqu'au pas 83, un paiement ouvrait aussitôt un compte adhérent au NIU déclaré, et
 * un inconnu pouvait lire la comptabilité d'une autre entreprise pour le prix d'une
 * adhésion. Le cabinet vérifie désormais l'identité avant d'ouvrir. Les écrans le disent
 * au visiteur, plutôt que de lui promettre un accès immédiat.
 *
 * ⚠️ LES MONTANTS SONT DES CHAÎNES
 *
 * Le backend rend ses décimaux en texte (« 12500 ») : les convertir en nombre pour
 * calculer ferait perdre des centimes sur d'autres devises un jour. On ne fait
 * qu'afficher, avec `montantFcfa`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler, ErreurApi } from "./api";

export type NatureService = "ABONNEMENT" | "ANNUEL" | "PONCTUEL" | "SUR_ETUDE";
export type Periodicite = "MENSUELLE" | "ANNUELLE" | "UNIQUE";

export type Tarif = { montant: string | null; du: string; au: string | null; motif: string | null };

export type Formule = {
  code: string;
  libelle: string;
  plancher: string;
  plafond: string | null;
  tarifs: Tarif[];
  inclus: string[];
  souscriptible_en_ligne: boolean;
};

export type Service = {
  code: string;
  libelle: string;
  nature: NatureService;
  periodicite: Periodicite;
  tarifs: Tarif[];
  formules: Formule[];
  unite: string | null;
  resume: string | null;
  inclus: string[];
  ouvre_un_dossier: boolean;
  souscriptible_en_ligne: boolean;
};

export type Prospect = {
  nom: string;
  prenom: string;
  courriel: string;
  telephone: string;
  denomination: string | null;
  niu: string | null;
  chiffre_affaires_declare: string | null;
};

export type LigneDevis = {
  service: string;
  libelle: string;
  montant: string | null;
  periodicite: Periodicite;
  nature: NatureService;
  formule: string | null;
  precision: string | null;
  chiffree: boolean;
};

/** ⚠️ Recopié de `EtatDevis` (domaine/devis.py) : l'outil de contrat ne compare pas les énumérations. */
export type EtatDevis = "EMIS" | "ENGAGE" | "CADUC" | "ABANDONNE";

export type Devis = {
  reference: string;
  prospect: Prospect;
  lignes: LigneDevis[];
  etabli_le: string;
  valide_jusqu_au: string;
  etat: EtatDevis;
  souscription: string | null;
  montant_total: string;
  complet: boolean;
  abonnement_mensuel: string;
  montant_a_regler: string;
};

export type EtatSouscription = "EN_ATTENTE_PAIEMENT" | "PAYEE" | "ACTIVEE" | "ABANDONNEE" | "RESILIEE";

export type Souscription = {
  reference: string;
  devis: string;
  prospect: Prospect;
  service: string;
  libelle: string;
  nature: NatureService;
  periodicite: Periodicite;
  formule: string | null;
  montant: string;
  abonnement_mensuel: string;
  etat: EtatSouscription;
  engagee_le: string;
  payee_le: string | null;
  activee_le: string | null;
  close_le: string | null;
  motif: string | null;
  niu: string | null;
  compte: string | null;
  prend_effet_le: string | null;
  encaissee: boolean;
  a_activer: boolean;
  ouvre_un_acces: boolean;
};

export type StatutPaiement = "EN_ATTENTE" | "VALIDE" | "REJETE" | "EXPIRE";

/** Le paiement tel que l'engagement le rend : seuls les champs lus à l'écran. */
export type Paiement = {
  identifiant: string;
  montant: string;
  telephone: string;
  statut: StatutPaiement;
  motif: string | null;
  encaisse: boolean;
  clos: boolean;
};

export type Engagement = { souscription: Souscription; paiement: Paiement; message: string };

export type EtatEcheance = "REGLEE" | "EN_COURS" | "A_APPELER" | "A_VENIR" | "IMPAYEE" | "EN_DEFAUT";

export type EcheanceAbonnement = {
  souscription: string;
  numero: number;
  periode_debut: string;
  periode_fin: string;
  montant: string;
  appelee_le: string;
  exigible_le: string;
  etat: EtatEcheance;
  paiement: string | null;
  cle: string;
  a_relancer: boolean;
};

export type RappelEcheance = {
  souscription: string;
  echeance: string;
  niu: string | null;
  courriel: string;
  telephone: string;
  montant: string;
  jours_de_retard: number;
  jalon: number;
  derniere: boolean;
};

export type ServiceASuspendre = {
  souscription: string;
  niu: string | null;
  compte: string | null;
  courriel: string;
  montant_du: string;
  echeances_en_defaut: string[];
  depuis_le: string;
  consigne: string;
};

export const LIBELLES_ETAT_SOUSCRIPTION: Record<EtatSouscription, string> = {
  EN_ATTENTE_PAIEMENT: "En attente du paiement",
  PAYEE: "Payée",
  ACTIVEE: "Active",
  ABANDONNEE: "Abandonnée",
  RESILIEE: "Résiliée",
};

export const LIBELLES_ETAT_ECHEANCE: Record<EtatEcheance, string> = {
  REGLEE: "Réglée",
  EN_COURS: "Prélèvement en cours",
  A_APPELER: "À appeler",
  A_VENIR: "À venir",
  IMPAYEE: "Impayée",
  EN_DEFAUT: "En défaut",
};

/** Une lecture publique qui peut ne pas aboutir : la page dit pourquoi, sans lever. */
export type Lecture<T> = { valeur: T } | { echec: string; statut: number | null };

/**
 * Transforme un appel en lecture qui ne lève pas.
 *
 * ⚠️ Il reçoit la **promesse**, pas le chemin : l'appel typé `appeler<T>("/…")` reste au
 * point d'usage, où l'outil de contrat des écrans le lit. Une aide qui prendrait le
 * chemin en paramètre rendrait tous ces appels invérifiables (c'est arrivé au pas 78,
 * et de nouveau ici à la première écriture).
 */
async function enLecture<T>(appel: Promise<T>): Promise<Lecture<T>> {
  try {
    return { valeur: await appel };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, statut: erreur.statut };
    throw erreur;
  }
}

// ── Le visiteur ─────────────────────────────────────────────────────────────

/**
 * Le catalogue au barème d'un jour.
 *
 * ⚠️ Le jour est obligatoire au backend : un barème se lit à une date. La page passe
 * celui du serveur, le même que le backend prendra pour figer le devis.
 */
export function lireCatalogue(jour: string): Promise<Lecture<Service[]>> {
  return enLecture(appeler<Service[]>(`/souscription/services?a_la_date=${encodeURIComponent(jour)}`));
}

export function lireDevis(reference: string): Promise<Lecture<Devis>> {
  return enLecture(appeler<Devis>(`/souscription/devis/${encodeURIComponent(reference)}`));
}

export function lireSouscription(reference: string): Promise<Lecture<Souscription>> {
  return enLecture(appeler<Souscription>(`/souscription/souscriptions/${encodeURIComponent(reference)}`));
}

/** Calculé à la date, jamais stocké : il suit la date d'effet et la résiliation. */
export function lireEcheancier(reference: string, jour: string): Promise<Lecture<EcheanceAbonnement[]>> {
  return enLecture(
    appeler<EcheanceAbonnement[]>(
      `/souscription/souscriptions/${encodeURIComponent(reference)}/echeancier?jusqu_au=${encodeURIComponent(jour)}`,
    ),
  );
}

// ── Le cabinet ──────────────────────────────────────────────────────────────

/** Les souscriptions payées dont l'accès n'est pas ouvert : direction et administration. */
export function lireAActiver(): Promise<Souscription[]> {
  return appeler<Souscription[]>("/souscription/a-activer", { authentifie: true });
}

/** Les relances d'impayé du jour : chargé de clientèle. */
export function lireRelancesDAbonnement(jour: string): Promise<RappelEcheance[]> {
  return appeler<RappelEcheance[]>(`/souscription/relances?a_la_date=${encodeURIComponent(jour)}`, {
    authentifie: true,
  });
}

/** Les services dont l'arrêt est décidé : direction. Une décision, pas une exécution. */
export function lireServicesASuspendre(jour: string): Promise<ServiceASuspendre[]> {
  return appeler<ServiceASuspendre[]>(`/souscription/services-a-suspendre?a_la_date=${encodeURIComponent(jour)}`, {
    authentifie: true,
  });
}
