/**
 * Les étapes d'une création d'entreprise, dans les mots de la cliente.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ **CE FICHIER EXISTE EN DOUBLE, DANS LA CONSOLE ET DANS LA VITRINE.**
 *
 * La vitrine les montre sur le lien de suivi sans compte, la console dans
 * l'espace de la cliente connectée. Elle doit lire la même chose aux deux
 * endroits : **toute correction de texte se porte des deux côtés.**
 *
 * L'autre copie : `erp-cga-vitrine/app/lib/etapes-de-creation.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ, LE 14 OCTOBRE 2026
 *
 * « Une page de suivi plus soft et plus indicative. » La page disait l'étape en
 * une phrase, sans dire où elle se situait dans le parcours, ni ce qui viendrait
 * ensuite, ni si elle avait quelque chose à faire. Chaque étape porte donc trois
 * choses : son nom court, ce que le cabinet fait, et ce qu'on attend d'elle.
 *
 * ⚠️ AUCUN DÉLAI N'EST ANNONCÉ. Les délais de greffe ne sont pas au référentiel,
 * et « sous quinze jours » écrit ici serait une promesse que personne n'a
 * signée. Indicatif veut dire : elle sait où elle en est et ce qui suit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type EtapeDeCreation = {
  /** Le code du domaine, ou `REGLEMENT` pour l'étape qui précède le dossier. */
  code: string;
  /** Le nom court, sous la pastille de la frise. */
  nom: string;
  /** Ce que le cabinet fait pendant cette étape. */
  cabinet: string;
  /** Ce qu'on attend d'elle. `null` : rien. */
  vous: string | null;
};

export const ETAPES_DE_CREATION: readonly EtapeDeCreation[] = [
  {
    code: "REGLEMENT",
    nom: "Règlement",
    cabinet: "Votre règlement est reçu et votre dossier est ouvert.",
    vous: null,
  },
  {
    code: "QUALIFICATION",
    nom: "Vos pièces",
    cabinet: "Nous réunissons les documents nécessaires à vos statuts.",
    vous: "Envoyez les documents de la liste ci-dessous. Une photo nette suffit ; le cabinet vous dira si l’un d’eux doit être repris.",
  },
  {
    code: "CONSTITUTION",
    nom: "Statuts",
    cabinet: "Vos pièces sont réunies. Le cabinet rédige vos statuts et prépare le dossier à déposer.",
    vous: "Rien pour l’instant. Le cabinet vous contacte si une signature est nécessaire.",
  },
  {
    code: "DEPOT_CFCE",
    nom: "Dépôt",
    cabinet: "Votre dossier est déposé au Centre de formalités de création d’entreprises, le guichet unique.",
    vous: null,
  },
  {
    code: "SUIVI_IMMATRICULATION",
    nom: "Immatriculation",
    cabinet: "Le cabinet suit votre dossier au greffe et aux impôts, et récupère vos numéros dès qu’ils sont délivrés.",
    vous: null,
  },
  {
    code: "LIVRAISON",
    nom: "Remise",
    cabinet: "Votre société est immatriculée. Le cabinet réunit vos originaux.",
    vous: "Le cabinet vous contacte pour vous remettre vos documents.",
  },
];

export type PositionDansLaCreation = {
  /** L'indice de l'étape en cours dans `ETAPES_DE_CREATION`. */
  courante: number;
  /** Toutes les étapes sont franchies : la société existe et ses documents sont remis. */
  terminee: boolean;
  /** Le dossier est abandonné : la frise ne se lit plus. */
  abandonnee: boolean;
};

/**
 * Où elle en est.
 *
 * ⚠️ L'ÉTAPE NE DOIT PAS CONTREDIRE LES NUMÉROS. Le RCCM et le NIU arrivent
 * PENDANT le suivi de l'immatriculation ; l'étape ne change qu'au geste suivant
 * du cabinet, parfois des jours plus tard. Numéros délivrés, la frise avance
 * d'elle-même à la remise : afficher « immatriculation en cours » au-dessus de
 * ses numéros serait faux.
 */
export function positionDansLaCreation(etape: string, immatriculee: boolean): PositionDansLaCreation {
  if (etape === "ABANDONNE") return { courante: 0, terminee: false, abandonnee: true };
  if (etape === "CONVERTI") return { courante: ETAPES_DE_CREATION.length - 1, terminee: true, abandonnee: false };
  const code = immatriculee && etape === "SUIVI_IMMATRICULATION" ? "LIVRAISON" : etape;
  const indice = ETAPES_DE_CREATION.findIndex((e) => e.code === code);
  return { courante: indice < 0 ? 1 : indice, terminee: false, abandonnee: false };
}
