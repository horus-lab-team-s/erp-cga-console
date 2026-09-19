/**
 * La demande de contact déposée depuis la vitrine : types et bornes partagés.
 *
 * ⚠️ Ces déclarations vivent hors de `actions-acquisition.ts` parce que Next exige
 * que **tout** export d'un module « use server » soit une fonction asynchrone. Un
 * type ou une constante exportés de là-bas feraient échouer la construction avec un
 * message qui ne dit pas lequel est fautif.
 */

/** Les démarches proposées par le formulaire, dans l'ordre d'affichage. */
export const DEMARCHES = [
  "creation",
  "adhesion",
  "ponctuel",
  "domiciliation",
  "formation",
  "autre",
] as const;

export type Demarche = (typeof DEMARCHES)[number];

/** Ce que le formulaire transmet à l'action serveur. */
export type DemandeSoumise = {
  demarche: Demarche;
  nom: string;
  telephone: string;
  courriel: string;
  message: string;
  /**
   * La case « J'accepte que le cabinet utilise ces informations pour me
   * recontacter ». Ce n'est **pas** un consentement WhatsApp : voir l'action.
   */
  consentementContact: boolean;
  /** D'où vient la demande, pour mesurer ce qui amène les prospects. */
  origine: string;
};

/**
 * Ce que le visiteur apprend de l'enregistrement.
 *
 * ⚠️ `enregistree: false` n'est pas une panne à cacher : le prospect doit savoir
 * que sa demande n'est pas dans le système du cabinet, pour ne pas attendre un
 * rappel qui ne viendra pas.
 */
export type ResultatDemande =
  | { enregistree: true; canalDeRappel: "APPEL" | "WHATSAPP" | "COURRIEL" }
  | { enregistree: false; motif: string };
