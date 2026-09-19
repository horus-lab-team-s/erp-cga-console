/**
 * Accès au contexte I · Création d'entreprise.
 *
 * Une seule lecture sert l'écran E13 : le pipeline. Le détail d'un dossier n'a
 * pas encore d'écran — il n'aurait rien à montrer qu'une fiche ne montre déjà
 * mieux tant que les gestes se posent au téléphone, devant le fondateur.
 */

import { appeler } from "@/app/lib/api";
import { aujourdhui } from "@/app/lib/portefeuille";

/** Les étapes du tunnel, dans l'ordre où elles se franchissent. */
export const ETAPES = [
  "QUALIFICATION",
  "CONSTITUTION",
  "DEPOT_CFCE",
  "SUIVI_IMMATRICULATION",
  "LIVRAISON",
  "CONVERTI",
  "ABANDONNE",
] as const;

export type Etape = (typeof ETAPES)[number];

/**
 * Le libellé de chaque étape, en langage de guichet.
 *
 * `DEPOT_CFCE` s'affiche « Au guichet » et non « Dépôt CFCE » : ce que le chargé
 * de formalités veut savoir d'un coup d'œil, c'est où se trouve physiquement le
 * dossier, pas le nom de l'acte qui l'y a mis.
 */
export const LIBELLES_ETAPE: Record<Etape, string> = {
  QUALIFICATION: "Qualification",
  CONSTITUTION: "Constitution",
  DEPOT_CFCE: "Au guichet",
  SUIVI_IMMATRICULATION: "Immatriculation",
  LIVRAISON: "À livrer",
  CONVERTI: "Converti",
  ABANDONNE: "Abandonné",
};

export type LigneCreation = {
  reference: string;
  denomination_souhaitee: string;
  forme_juridique: string;
  fondateur: string;
  etape: Etape;
  ouvert_le: string;
  immobile_depuis: string;
  jours_d_immobilite: number;
  pieces_manquantes: number;
  en_retard: boolean;
  immatriculee: boolean;
  converti_en: string | null;
};

/**
 * Le pipeline, du plus ancien mouvement au plus récent.
 *
 * ⚠️ L'ordre vient du backend et **ne doit pas être retrié ici**. Le pipeline se
 * lit par urgence : un dossier qui dort depuis trois semaines se présente avant
 * celui d'hier. Le retrier par référence ou par nom en ferait une liste, pas un
 * outil de relance.
 */
export async function lirePipeline(a_la_date = aujourdhui()): Promise<LigneCreation[]> {
  return appeler<LigneCreation[]>(
    `/creations/pipeline?a_la_date=${encodeURIComponent(a_la_date)}`,
    { authentifie: true },
  );
}

/** Une pièce attendue au dossier de constitution. */
export type PieceConstitution = {
  code: string;
  libelle: string;
  obligatoire: boolean;
  fournie_le: string | null;
  empreinte: string | null;
};

export type Jalon = { etape: Etape; survenu_le: string; par: string | null; commentaire: string | null };

export type DossierCreation = {
  reference: string;
  fondateur: { nom: string; prenom: string; courriel: string; telephone: string; piece_identite: string | null };
  denomination_souhaitee: string;
  forme_juridique: string;
  activite: string;
  siege: string;
  capital: string | null;
  etape: Etape;
  ouvert_le: string;
  pieces: PieceConstitution[];
  immatriculation: {
    rccm: string | null;
    rccm_obtenu_le: string | null;
    niu: string | null;
    niu_obtenu_le: string | null;
    patente: string | null;
    patente_obtenue_le: string | null;
    cnps: string | null;
    cnps_obtenu_le: string | null;
  };
  jalons: Jalon[];
  converti_en: string | null;
  motif_abandon: string | null;
};

/** Ce que rend `GET /creations/{reference}` : le dossier, et ce qui se calcule au jour (pas 82). */
export type FicheCreation = {
  dossier: DossierCreation;
  constats: { code: string; message: string; bloquant: boolean }[];
  deposable: boolean;
  etapes_ouvertes: Etape[];
  en_retard: boolean;
};

export function lireDossierCreation(reference: string) {
  return appeler<FicheCreation>(`/creations/${encodeURIComponent(reference)}`, { authentifie: true });
}

export function lireChecklist(forme: string) {
  return appeler<PieceConstitution[]>(`/creations/checklist/${encodeURIComponent(forme)}`, { authentifie: true });
}

export const FORMES_JURIDIQUES = ["ETS", "SARLU", "SARL", "SAS", "SA", "SCI"] as const;
