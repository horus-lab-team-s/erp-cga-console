/**
 * Architecture de l'information de l'espace collaborateur — § 6.1 du dossier de
 * design.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ORGANISATION RETENUE — « par nature de travail »
 *
 * L'ordre suit le trajet réel d'une pièce dans le cabinet : elle arrive, on la
 * contrôle, on la comptabilise, on déclare, on clôture. Un collaborateur qui
 * descend la barre latérale suit la vie d'un dossier.
 *
 *   + Le débutant apprend le métier en lisant le menu.
 *   + Les pastilles de compte tombent en haut, là où le regard commence.
 *   − Un comptable qui ne fait que de la saisie traverse trois entrées avant la
 *     sienne.
 *
 * ORGANISATION ALTERNATIVE — « par rôle »
 *
 * Regrouper sous Flux entrant / Production / Contrôle / Pilotage, chaque groupe
 * correspondant à un profil.
 *
 *   + Chacun ne voit que son rayon ; la barre paraît deux fois plus courte.
 *   − Les profils se chevauchent en réalité : un réviseur saisit parfois, un
 *     chargé de clientèle relance des pièces. Le rangement par rôle oblige alors
 *     à dupliquer des entrées, ou à cacher à quelqu'un ce dont il a besoin.
 *
 * Le § 8.0 demande de soumettre les deux au cabinet. La première est appliquée
 * par défaut ; basculer revient à réécrire ce seul tableau.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Permission } from "./acces";

export type CompteurNav = "piecesEnAttente" | "anomaliesBloquantes";

export type EntreeNav = {
  libelle: string;
  href: string;
  icone: string;
  /** Compteur affiché en pastille. `alerte` pour ce qui bloque, `neutre` sinon. */
  compteur?: { cle: CompteurNav; ton: "alerte" | "neutre" };
  enfants?: { libelle: string; href: string; construit?: boolean }[];
  /**
   * La permission sans laquelle l'entrée n'est pas proposée.
   *
   * ⚠️ **Masquer n'est pas protéger.** Ce champ sert à ne pas montrer un écran
   * dont l'API refuserait les données — un bouton qui échoue est pire qu'un
   * bouton absent. La protection, elle, est côté serveur, dans le cas d'usage,
   * à chaque appel. Voir `app/lib/session.ts`.
   */
  permission: Permission;
  /**
   * D'autres permissions qui ouvrent aussi l'entrée (pas 83).
   *
   * Les souscriptions en ligne servent trois rôles qui n'ont aucune permission en
   * commun : la direction surveille, l'administration ouvre les accès, le chargé de
   * clientèle relance. Choisir l'une masquerait l'écran aux deux autres.
   */
  ouAussi?: Permission[];
  /**
   * L'écran existe-t-il ?
   *
   * ─────────────────────────────────────────────────────────────────────────
   * POURQUOI AFFICHER CE QUI N'EXISTE PAS ENCORE
   *
   * Treize entrées sur seize ne mènent nulle part. Trois façons de traiter le
   * problème :
   *
   * 1. **Les laisser cliquables** — on tombe sur une 404. C'était l'état
   *    précédent, et c'est le pire : le collaborateur ne sait pas s'il a mal
   *    cliqué, si le serveur est tombé, ou si l'écran n'existe pas.
   * 2. **Les retirer** — le menu est honnête mais muet. Personne ne sait ce que
   *    le produit fera, et le cabinet ne peut pas suivre l'avancement sur
   *    l'écran qu'il utilise tous les jours.
   * 3. **Les montrer inertes, et le dire.** C'est ce qui est fait : l'entrée
   *    apparaît, grisée, non cliquable, marquée « à venir ». Le menu dit à la
   *    fois où l'on en est et où l'on va.
   * ─────────────────────────────────────────────────────────────────────────
   */
  construit: boolean;
};

/**
 * Les icônes sont des tracés linéaires à trait fin, jeu unique — § 10.7. Elles
 * sont déclarées comme chemins SVG bruts pour rester sans dépendance : une
 * bibliothèque d'icônes complète pèserait plus lourd que tout le reste de la page,
 * sur des connexions où chaque kilo-octet compte.
 */
export const ICONES: Record<string, string> = {
  tableauBord: "M3 21h18M6 17v-5M11 17V7M16 17v-9",
  // Une liste cochée : le plan de travail (pas 104).
  planDeTravail: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  portefeuille: "M4 21V5h9v16M13 21V9h7v12M7 9h2M7 13h2M7 17h2M16 13h1M16 17h1",
  pieces: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  conformite: "M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6zM9.5 12l1.8 1.8L15 10.5",
  comptabilite: "M4 20h4l10-10a2.83 2.83 0 1 0-4-4L4 16zM13.5 6.5l4 4",
  obligations: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  social: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20v-1.5A4.5 4.5 0 0 1 6.5 14h5a4.5 4.5 0 0 1 4.5 4.5V20M17 4.5a3.5 3.5 0 0 1 0 6.8M22 20v-1.5a4.5 4.5 0 0 0-3.2-4.3",
  cloture: "M3 6.5h5.5l2 2H21v11H3z",
  creation: "M12 5v14M5 12h14",
  pilotage: "M12 4l9 16H3zM12 10v4M12 17.2h.01",
  referentiel: "M4 5h11a2 2 0 0 1 2 2v13H6a2 2 0 0 1-2-2zM17 7h3v13H6M8 9h6M8 13h6",
  parametres: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z",
  // Ouverture et fermeture du tiroir : la barre latérale sort du flux sous
  // 1000 px, il lui faut une poignée.
  menu: "M4 7h16M4 12h16M4 17h16",
  fermer: "M6 6l12 12M18 6L6 18",
  // Flèche vers la gauche : la sortie de l'espace de travail vers le site public.
  retour: "M19 12H5M11 18l-6-6 6-6",
  acquisition: "M4 4h16v12H7l-3 3zM8 8h8M8 12h5",
  // Une carte de paiement : les souscriptions réglées en ligne (pas 83).
  souscriptions: "M3 6h18v12H3zM3 10h18M7 15h4",
  // Un pouls : l'état de la plateforme (pas 84).
  exploitation: "M3 12h4l2-5 4 10 2-5h6",
  replier: "M9 6l6 6-6 6M4 4v16",
  deplier: "M15 6l-6 6 6 6M20 4v16",
  recherche: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  notifications: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0",
};

export const NAVIGATION: EntreeNav[] = [
  {
    libelle: "Tableau de bord",
    href: "/tableau-de-bord",
    icone: "tableauBord",
    permission: "LIRE_DOSSIER",
    construit: true,
  },
  {
    // Pas 104 : « par quoi je commence ? », pour qui tient des dossiers (comptable, réviseur).
    libelle: "Mon plan de travail",
    href: "/plan-de-travail",
    icone: "planDeTravail",
    permission: "SAISIR_ECRITURE",
    construit: true,
  },
  {
    // ⚠️ Pas 64 : les demandes du site arrivaient dans le parcours depuis le pas 51,
    // et aucune entrée de menu ne menait à elles.
    libelle: "Demandes entrantes",
    href: "/acquisition",
    icone: "acquisition",
    permission: "LIRE_PROSPECT",
    construit: true,
  },
  {
    libelle: "Portefeuille",
    href: "/portefeuille",
    icone: "portefeuille",
    permission: "LIRE_DOSSIER",
    construit: true,
  },
  {
    libelle: "Pièces justificatives",
    href: "/pieces",
    icone: "pieces",
    compteur: { cle: "piecesEnAttente", ton: "neutre" },
    permission: "LIRE_PIECE",
    construit: true,
    enfants: [
      { libelle: "Boîte de réception", href: "/pieces" },
      { libelle: "Pièces attendues", href: "/pieces/attendues" },
      // Pas 111 : demander en un message ce qui manque au mois d'un dossier.
      { libelle: "Relancer un adhérent", href: "/pieces/relancer" },
    ],
  },
  {
    // ⚠️ Pas 99 : « à venir » depuis la première coquille. Elle porte les deux écrans du
    // parcours réviseur. `LIRE_AUDIT` ouvre aussi l'entrée : la direction lit le journal des
    // dérogations sans contrôler de pièce.
    libelle: "Conformité",
    href: "/conformite",
    icone: "conformite",
    compteur: { cle: "anomaliesBloquantes", ton: "alerte" },
    permission: "CONTROLER_CONFORMITE",
    ouAussi: ["LIRE_AUDIT"],
    construit: true,
    enfants: [
      // Pas 117 : la file du réviseur passe en tête, c'est son écran de travail quotidien.
      { libelle: "File d'anomalies", href: "/conformite/file" },
      { libelle: "Journal des dérogations", href: "/conformite" },
      { libelle: "Qualité des règles", href: "/conformite/qualite" },
    ],
  },
  {
    libelle: "Comptabilité",
    href: "/comptabilite",
    icone: "comptabilite",
    permission: "LIRE_COMPTABILITE",
    construit: true,
    enfants: [
      // ⚠️ Seuls les enfants construits figurent : une entrée de sous-menu qui
      // tombe en 404 est plus déroutante qu'une entrée absente, parce qu'on la
      // découvre après avoir cliqué.
      { libelle: "Balance et grand livre", href: "/comptabilite" },
      // La saisie exige `SAISIR_ECRITURE`, que le parent n'exige pas : un chargé
      // de clientèle voit la balance et n'écrit pas. L'entrée reste affichée —
      // l'écran refuse proprement, en nommant la permission — parce qu'un
      // sous-menu qui change de longueur selon le rôle empêche d'expliquer le
      // produit à deux personnes à la fois.
      { libelle: "Saisie d\u2019écriture", href: "/comptabilite/saisie" },
      // Pas 85 : export, reprise d'un fichier, plan d'imputation du dossier.
      { libelle: "Échange avec le logiciel du client", href: "/comptabilite/echange" },
      // Pas 101 : confronter le relevé de la banque au journal de banque.
      { libelle: "Rapprochement bancaire", href: "/comptabilite/rapprochement" },
      // Pas 102 : les passages de relais entre comptable et réviseur.
      { libelle: "Revue des dossiers", href: "/comptabilite/revues" },
      // Pas 107 : vérifier le mois, puis le transmettre, ce qui le verrouille.
      { libelle: "Clôture mensuelle", href: "/comptabilite/cloture" },
    ],
  },
  {
    libelle: "Obligations fiscales",
    href: "/obligations",
    icone: "obligations",
    permission: "LIRE_DOSSIER",
    construit: true,
    enfants: [
      { libelle: "Échéancier", href: "/obligations" },
      { libelle: "Déclarations de TVA", href: "/obligations/declarations" },
      // ⚠️ Visible de tous ceux qui voient les obligations, même sans
      // `LIRE_COMPTABILITE` : l'écran refuse alors en nommant la permission, comme
      // la saisie d'écriture plus haut, pour que le menu garde la même longueur.
      { libelle: "Veille des seuils", href: "/obligations/veille-des-seuils" },
    ],
  },
  {
    // Placé entre les obligations et la clôture : c'est l'ordre du calendrier
    // du cabinet — les échéances du mois, puis la paie du mois, puis l'année.
    libelle: "Social et paie",
    href: "/social",
    icone: "social",
    // ⚠️ `LIRE_COMPTABILITE` et non une permission propre : la paie porte des
    // rémunérations nominatives, et le rôle qui lit les comptes d'un dossier
    // est celui qui les lit. Inventer une permission `LIRE_PAIE` obligerait à
    // la distribuer à tous ceux qui ont déjà `LIRE_COMPTABILITE`, sans rien
    // protéger de plus.
    permission: "LIRE_COMPTABILITE",
    construit: true,
  },
  {
    libelle: "Clôture annuelle",
    href: "/cloture",
    icone: "cloture",
    // ⚠️ `LIRE_COMPTABILITE` et non `CLOTURER_EXERCICE`. L'écran **lit** la
    // liasse ; il ne clôture pas. Le réserver aux deux rôles qui peuvent clore
    // empêcherait un comptable de préparer le dossier qu'il prépare
    // effectivement, et le réviseur découvrirait la liasse le jour du dépôt.
    permission: "LIRE_COMPTABILITE",
    construit: true,
  },
  {
    libelle: "Création d\u2019entreprise",
    href: "/creation-entreprise",
    icone: "creation",
    permission: "SUIVRE_FORMALITE",
    construit: true,
  },
  {
    libelle: "Pilotage",
    href: "/pilotage",
    icone: "pilotage",
    // ⚠️ `LIRE_PILOTAGE` n'est détenue que par la direction. L'entrée
    // n'apparaît donc pour personne d'autre — y compris le réviseur, qui voit
    // pourtant tous les dossiers : voir le portefeuille n'est pas piloter le
    // cabinet, et le score de risque porte un jugement d'affectation que seule
    // la direction a mandat de lire.
    permission: "LIRE_PILOTAGE",
    construit: true,
    enfants: [
      { libelle: "Dossiers à risque", href: "/pilotage" },
      // Pas 105 : qui est saturé, et les réaffectations proposées.
      { libelle: "Charge et production", href: "/pilotage/charge" },
      // Pas 106 : la qualité et le rapport mensuel archivé.
      { libelle: "Rapport mensuel", href: "/pilotage/rapports" },
    ],
  },
];

export const NAVIGATION_ADMINISTRATION: EntreeNav[] = [
  {
    libelle: "Référentiel et règles",
    href: "/referentiel",
    icone: "referentiel",
    // ⚠️ `LIRE_DOSSIER` et non `MODIFIER_PARAMETRE` : l'écran **lit** le
    // référentiel et son état de validation. Le réserver au fiscaliste
    // empêcherait un comptable de répondre à « sur quoi repose ce chiffre ? »,
    // qui est précisément la question qu'on lui posera.
    permission: "LIRE_DOSSIER",
    construit: true,
  },
  {
    libelle: "Comptes et habilitations",
    href: "/comptes",
    icone: "parametres",
    permission: "GERER_COMPTES",
    construit: true,
  },
  {
    // Pas 83. Rangé en administration : son geste principal ouvre un accès à un dossier.
    libelle: "Souscriptions en ligne",
    href: "/souscriptions",
    icone: "souscriptions",
    permission: "GERER_COMPTES",
    ouAussi: ["LIRE_PILOTAGE", "RELANCER_ADHERENT"],
    construit: true,
  },
  {
    // Pas 84. Services, travaux périodiques, boîte d'envoi ; les gestes restent à
    // l'administration. La direction y lit la file et la quarantaine.
    //
    // ⚠️ `LIRE_PILOTAGE` et non `LIRE_AUDIT` pour l'entrée de menu, bien que ce soit
    // `LIRE_AUDIT` qui ouvre ces lectures au backend : l'inspecteur la détient aussi, et
    // un inspecteur des impôts n'a pas à trouver l'exploitation de la plateforme dans son
    // menu. Masquer n'est pas protéger : la page reste servie à qui détient `LIRE_AUDIT`.
    libelle: "Exploitation",
    href: "/exploitation",
    icone: "exploitation",
    permission: "GERER_COMPTES",
    ouAussi: ["LIRE_PILOTAGE"],
    construit: true,
  },
];

/**
 * Les entrées qu'un accès donné peut voir.
 *
 * Une entrée non construite est **conservée** si la permission est détenue : elle
 * s'affichera inerte. C'est la différence entre « vous n'y avez pas droit » et
 * « ce n'est pas encore fait », et les confondre priverait le cabinet de toute
 * visibilité sur ce qui vient.
 */
export function entreesVisibles(
  entrees: EntreeNav[],
  permissions: readonly Permission[],
): EntreeNav[] {
  return entrees.filter((entree) =>
    [entree.permission, ...(entree.ouAussi ?? [])].some((p) => permissions.includes(p)),
  );
}
