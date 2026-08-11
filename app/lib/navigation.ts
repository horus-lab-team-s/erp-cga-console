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

export type CompteurNav = "piecesEnAttente" | "anomaliesBloquantes";

export type EntreeNav = {
  libelle: string;
  href: string;
  icone: string;
  /** Compteur affiché en pastille. `alerte` pour ce qui bloque, `neutre` sinon. */
  compteur?: { cle: CompteurNav; ton: "alerte" | "neutre" };
  enfants?: { libelle: string; href: string }[];
  /** Réservé au fiscaliste et à l'administrateur. */
  restreint?: boolean;
};

/**
 * Les icônes sont des tracés linéaires à trait fin, jeu unique — § 10.7. Elles
 * sont déclarées comme chemins SVG bruts pour rester sans dépendance : une
 * bibliothèque d'icônes complète pèserait plus lourd que tout le reste de la page,
 * sur des connexions où chaque kilo-octet compte.
 */
export const ICONES: Record<string, string> = {
  tableauBord: "M3 21h18M6 17v-5M11 17V7M16 17v-9",
  portefeuille: "M4 21V5h9v16M13 21V9h7v12M7 9h2M7 13h2M7 17h2M16 13h1M16 17h1",
  pieces: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  conformite: "M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6zM9.5 12l1.8 1.8L15 10.5",
  comptabilite: "M4 20h4l10-10a2.83 2.83 0 1 0-4-4L4 16zM13.5 6.5l4 4",
  obligations: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  cloture: "M3 6.5h5.5l2 2H21v11H3z",
  creation: "M12 5v14M5 12h14",
  pilotage: "M12 4l9 16H3zM12 10v4M12 17.2h.01",
  referentiel: "M4 5h11a2 2 0 0 1 2 2v13H6a2 2 0 0 1-2-2zM17 7h3v13H6M8 9h6M8 13h6",
  parametres: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z",
  // Ouverture et fermeture du tiroir : la barre latérale sort du flux sous
  // 1000 px, il lui faut une poignée.
  menu: "M4 7h16M4 12h16M4 17h16",
  fermer: "M6 6l12 12M18 6L6 18",
  replier: "M9 6l6 6-6 6M4 4v16",
  deplier: "M15 6l-6 6 6 6M20 4v16",
  recherche: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  notifications: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0",
};

export const NAVIGATION: EntreeNav[] = [
  { libelle: "Tableau de bord", href: "/tableau-de-bord", icone: "tableauBord" },
  { libelle: "Portefeuille", href: "/portefeuille", icone: "portefeuille" },
  {
    libelle: "Pièces justificatives",
    href: "/pieces",
    icone: "pieces",
    compteur: { cle: "piecesEnAttente", ton: "neutre" },
  },
  {
    libelle: "Conformité",
    href: "/conformite",
    icone: "conformite",
    compteur: { cle: "anomaliesBloquantes", ton: "alerte" },
  },
  {
    libelle: "Comptabilité",
    href: "/comptabilite",
    icone: "comptabilite",
    enfants: [
      { libelle: "Saisie", href: "/comptabilite/saisie" },
      { libelle: "Grand livre et balance", href: "/comptabilite/grand-livre" },
      { libelle: "Rapprochement bancaire", href: "/comptabilite/rapprochement" },
    ],
  },
  {
    libelle: "Obligations fiscales",
    href: "/obligations",
    icone: "obligations",
    enfants: [
      { libelle: "Échéancier", href: "/obligations/echeancier" },
      { libelle: "Déclarations", href: "/obligations/declarations" },
    ],
  },
  { libelle: "Clôture annuelle", href: "/cloture", icone: "cloture" },
  { libelle: "Création d'entreprise", href: "/creation-entreprise", icone: "creation" },
  { libelle: "Pilotage", href: "/pilotage", icone: "pilotage" },
];

export const NAVIGATION_ADMINISTRATION: EntreeNav[] = [
  {
    libelle: "Référentiel et règles",
    href: "/referentiel",
    icone: "referentiel",
    restreint: true,
  },
  { libelle: "Paramètres", href: "/parametres", icone: "parametres", restreint: true },
];
