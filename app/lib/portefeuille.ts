/**
 * Les dossiers du portefeuille, tels que le backend les résout.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AUCUNE LECTURE SANS DATE
 *
 * `a_la_date` est obligatoire côté backend, et le front ne cherche pas à
 * contourner : une entreprise n'**est** pas au réel, elle y est **depuis** une
 * date. Afficher « le régime » sans dire lequel ferait apparaître le régime de
 * 2026 sur un écran qui traite une facture de 2022.
 *
 * LE FILTRAGE PAR PORTEFEUILLE EST FAIT PAR LE BACKEND
 *
 * Cette fonction ne filtre rien. Elle reçoit déjà la liste restreinte au
 * périmètre de la session — c'est `restreindre()` du contexte K qui s'en charge,
 * dans la route. Filtrer une seconde fois ici donnerait l'illusion que le front
 * protège quelque chose, alors qu'un appel direct à l'API rendrait la même chose.
 *
 * Ce que le front fait, lui, c'est **ne pas proposer** ce qui serait refusé. Ce
 * n'est pas de la sécurité, c'est de l'ergonomie.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler } from "./api";

export type RegimeFiscal = "REEL" | "IGS";
export type CentreRattachement = "CIME" | "DGE" | "CDI";

/** Une ligne de `GET /portefeuille/entreprises`, statuts déjà résolus. */
export type Dossier = {
  niu: string;
  denomination: string;
  forme_juridique: string;
  activite: string | null;
  siege: string | null;
  regime: RegimeFiscal;
  centre: CentreRattachement;
  assujettie_tva: boolean;
  adherente: boolean;
  numero_adhesion: string | null;
  /** Fin déjà inscrite de l'adhésion en cours, borne exclue. `null` si rien n'est résilié. */
  adhesion_jusqu_au: string | null;
  /** Prise d'effet d'une adhésion à venir déjà inscrite. `null` sinon. */
  adhesion_a_venir: string | null;
  exercice_courant: string | null;
};

/** Le jour, au format ISO, tel que le backend l'attend. */
export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Un exercice tel que la fiche du dossier le rend. Bornes incluses. */
export type ExerciceDuDossier = { libelle: string; ouverture: string; cloture: string; clos: boolean };

/**
 * Les exercices d'un dossier, lus sur sa fiche complète (pas 71).
 *
 * ⚠️ `null` quand la fiche ne répond pas : l'écran affiche alors les gestes, et le
 * backend reste juge. Masquer un geste sur une lecture échouée ferait croire à un
 * exercice clos qui ne l'est pas.
 */
export async function lireExercicesDuDossier(niu: string): Promise<ExerciceDuDossier[] | null> {
  try {
    const fiche = await appeler<{ exercices: ExerciceDuDossier[] }>(
      `/portefeuille/entreprises/${encodeURIComponent(niu)}`,
      { authentifie: true },
    );
    return fiche.exercices;
  } catch {
    return null;
  }
}

export async function lireDossiers(a_la_date = aujourdhui()): Promise<Dossier[]> {
  return appeler<Dossier[]>(
    `/portefeuille/entreprises?a_la_date=${encodeURIComponent(a_la_date)}`,
    { authentifie: true },
  );
}

/** Compteurs de la barre latérale, calculés par le backend. */
export type Compteurs = {
  piecesEnAttente: number;
  anomaliesBloquantes: number;
};

// Seule la longueur compte : la route filtre elle-même (`en_souffrance=true`).
type LignePiece = { identifiant: string };
type Arbitrage = { suspicion?: { bloquant?: boolean } };

/**
 * Les deux pastilles de la barre latérale.
 *
 * Deux appels plutôt qu'un point d'entrée dédié : tant que le contexte
 * J · Pilotage n'existe pas, aucune route ne rend d'indicateurs consolidés, et en
 * fabriquer une ici reviendrait à placer du calcul métier dans l'écran. Le jour
 * où J existera, cette fonction deviendra un appel.
 *
 * Les erreurs sont absorbées : une pastille indisponible ne doit pas empêcher la
 * barre latérale de s'afficher. Un menu qui disparaît parce qu'un compteur a
 * échoué serait une panne plus grave que le compteur manquant.
 */
export async function lireCompteurs(a_la_date = aujourdhui()): Promise<Compteurs> {
  const [pieces, doublons] = await Promise.all([
    appeler<LignePiece[]>(
      `/collecte/pieces?a_la_date=${encodeURIComponent(a_la_date)}&en_souffrance=true`,
      { authentifie: true },
    ).catch(() => [] as LignePiece[]),
    appeler<Arbitrage[]>("/collecte/doublons", { authentifie: true }).catch(
      () => [] as Arbitrage[],
    ),
  ]);
  return {
    piecesEnAttente: pieces.length,
    anomaliesBloquantes: doublons.filter((a) => a.suspicion?.bloquant).length,
  };
}

/** Un compte adhérent du dossier, vu par son chargé de clientèle (pas 116). */
export type AccesDUnAdherent = {
  compte: string;
  nom: string;
  courriel: string;
  telephone: string | null;
  etat: "EN_ATTENTE_ACTIVATION" | "ACTIF" | "SUSPENDU";
  liens_renvoyes: { type: string; le: string; par: string; verification: string }[];
};

export function lireLesAccesAdherents(niu: string) {
  return appeler<AccesDUnAdherent[]>(`/portefeuille/entreprises/${encodeURIComponent(niu)}/acces-adherents`, {
    authentifie: true,
  });
}
