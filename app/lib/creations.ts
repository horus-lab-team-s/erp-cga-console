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
  /**
   * ⚠️ **ELLE A BOUGÉ LA DERNIÈRE, ET PERSONNE NE LUI A RÉPONDU.**
   *
   * Sans ce signal, un dossier où la cliente vient de déposer cinq documents
   * affiche « sans mouvement depuis 1 j » et se lit comme un dossier actif,
   * alors que c'est le cabinet qui doit le geste suivant.
   */
  attend_le_cabinet: boolean;
  /** Depuis combien de jours elle attend. `0` quand ce n'est pas son tour. */
  jours_d_attente: number;
  immatriculee: boolean;
  converti_en: string | null;
};

/**
 * Le pipeline par urgence : d'abord celles qui attendent une réponse.
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

/**
 * Le lien de suivi d'un dossier, tel que la cliente l'a reçu à l'ouverture.
 *
 * ⚠️ **PARCE QUE LE COURRIEL SE PERD.** Le lien ne partait qu'une fois. Perdu,
 * classé en indésirable, adresse saisie de travers : la cliente n'avait plus
 * aucun moyen d'entrer, et le cabinet aucun moyen de le lui rendre.
 *
 * ⚠️ Le sceau est **recalculé** de la référence et de la clé du cabinet : le
 * même dossier rend toujours le même lien. Celui envoyé il y a trois semaines
 * reste exactement celui-ci.
 */
export type LienDeSuivi = {
  reference: string;
  denomination_souhaitee: string;
  /**
   * ⚠️ Pas de `sceau` à côté : le serveur ne le rend plus séparément. Un secret
   * rendu deux fois se protège deux fois moins bien, et rien n'en avait besoin.
   */
  lien: string;
  /** Le dossier est clos : le lien ouvre encore, mais il n'y a plus rien à déposer. */
  clos: boolean;
};

export function lireLeLienDeSuivi(reference: string) {
  return appeler<LienDeSuivi>(
    `/creations/${encodeURIComponent(reference)}/lien-de-suivi`,
    { authentifie: true },
  );
}

export function lireChecklist(forme: string) {
  return appeler<PieceConstitution[]>(`/creations/checklist/${encodeURIComponent(forme)}`, { authentifie: true });
}

export const FORMES_JURIDIQUES = ["ETS", "SARLU", "SARL", "SAS", "SA", "SCI"] as const;
