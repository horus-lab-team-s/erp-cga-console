/**
 * Ce qu'une session permet : les types, et les fonctions pures qui les lisent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EST SÉPARÉ DE `session.ts`
 *
 * `session.ts` lit le témoin de session, donc importe `next/headers`, donc **ne
 * peut pas** être atteint depuis un composant client. Or la barre latérale et
 * l'en-tête de travail sont des composants clients, et ils ont besoin de
 * `Acces`, de `initiales` et des libellés de rôle.
 *
 * Sans cette coupure, un simple `import { initiales }` dans un composant client
 * tirait `next/headers` par la chaîne des imports et faisait échouer la
 * compilation. Le compilateur avait raison : un module qui lit des en-têtes de
 * requête n'a rien à faire dans un paquet envoyé au navigateur.
 *
 * **Ce module ne contient donc que des types et des fonctions pures.** Rien qui
 * lise, rien qui appelle, rien qui dépende du contexte de requête. Il est
 * importable de partout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Role =
  | "CHARGE_CLIENTELE"
  | "COMPTABLE"
  | "REVISEUR"
  | "FISCALISTE"
  | "CHARGE_FORMALITES"
  | "DIRECTION"
  | "ADMINISTRATEUR"
  | "ADHERENT"
  | "INSPECTEUR";

export type Permission =
  | "LIRE_DOSSIER"
  | "LIRE_PIECE"
  | "LIRE_COMPTABILITE"
  | "LIRE_AUDIT"
  | "LIRE_PILOTAGE"
  | "DEPOSER_PIECE"
  | "IDENTIFIER_PIECE"
  | "ARBITRER_DOUBLON"
  | "RELANCER_ADHERENT"
  | "CONTROLER_CONFORMITE"
  | "ECARTER_CONSTAT"
  | "EMETTRE_AVIS"
  | "SAISIR_ECRITURE"
  | "VALIDER_ECRITURE"
  | "CONTRE_PASSER"
  | "DEPOSER_DECLARATION"
  | "CLOTURER_EXERCICE"
  // ⚠️ Ajoutées au pas 53, et c'était une dérive : le backend les portait depuis les pas
  // 45 et antérieurs, et l'écran ne pouvait pas les tester. Un bouton gardé par une
  // permission que ce type ignore ne compile pas, ce qui est le bon échec ; une
  // permission absente et jamais testée, elle, ne se voit pas.
  | "INSCRIRE_STATUT"
  | "LIRE_PROSPECT"
  | "QUALIFIER_PROSPECT"
  | "MODIFIER_PARAMETRE"
  | "MODIFIER_REGLE"
  | "ARRETER_POLITIQUE"
  // Pas 100 : décider une mesure sur un dossier à risque, direction seule.
  | "DECIDER_SUR_DOSSIER"
  // Pas 102 : la revue d'un mois transmis, réviseur seul.
  | "REVISER_DOSSIER"
  // Pas 111 : relancer un adhérent des pièces de son mois (comptable, chargé de clientèle, réviseur).
  | "RELANCER_PIECES"
  | "REPONDRE_AU_CABINET"
  | "SIGNALER_UN_CHANGEMENT"
  | "REGLER_SES_RAPPELS"
  | "SUIVRE_FORMALITE"
  | "GERER_COMPTES"
  | "AFFECTER_DOSSIER"
  | "EDITER_VITRINE";

/**
 * Ce que `GET /transverse/moi` rend.
 *
 * `dossiers` à `null` ne se confond pas avec une liste vide : `null` signifie
 * « tout le portefeuille du cabinet » — un réviseur, la direction. Une liste
 * vide signifie « aucun dossier », l'état d'un collaborateur habilité mais non
 * affecté. Les traiter pareil ferait voir tout le cabinet à quelqu'un qui ne
 * devrait rien voir.
 */
export type Acces = {
  compte: string;
  locataire: string;
  session: string;
  nom_complet: string;
  roles: Role[];
  permissions: Permission[];
  dossiers: string[] | null;
  /** La session porte un second facteur encore valide. Se périme en 15 min. */
  facteur_fort: boolean;
  /**
   * Le compte a enrôlé un second facteur.
   *
   * Distinct de `facteur_fort`, et la distinction commande l'écran : sans
   * enrôlement on propose de s'enrôler, avec enrôlement on demande un code.
   * Les confondre ferait réclamer un code à quelqu'un qui n'a rien à ouvrir.
   */
  second_facteur_enrole: boolean;
  a_la_date: string;
  transverse: boolean;
  /** Salarié du cabinet. Commande le routage vers l'espace de travail. */
  interne: boolean;
};

/**
 * Vrai si la permission est détenue.
 *
 * ⚠️ **Masquer n'est pas protéger.** Cette fonction sert à ne pas proposer ce
 * qui sera refusé — un bouton qui échoue est pire qu'un bouton absent. La
 * protection est côté serveur, dans le cas d'usage, à chaque appel.
 */
export function detient(courant: Acces | null, permission: Permission): boolean {
  return courant?.permissions.includes(permission) ?? false;
}

/** Vrai si le dossier est dans le périmètre. `null` couvre tout. */
export function voit(courant: Acces | null, niu: string): boolean {
  if (!courant) return false;
  return courant.dossiers === null || courant.dossiers.includes(niu);
}

/**
 * Le libellé du rôle, tel que le cabinet le nomme.
 *
 * De l'affichage, pas de la règle : la vérité des droits reste la liste
 * `permissions` rendue par le backend.
 */
export const LIBELLES_ROLE: Record<Role, string> = {
  CHARGE_CLIENTELE: "Chargé de clientèle",
  COMPTABLE: "Comptable",
  REVISEUR: "Réviseur",
  FISCALISTE: "Fiscaliste",
  CHARGE_FORMALITES: "Chargé de formalités",
  DIRECTION: "Direction",
  ADMINISTRATEUR: "Administrateur",
  ADHERENT: "Adhérent",
  INSPECTEUR: "Inspecteur assistant",
};

/** Les initiales, pour la pastille d'identité. « Aïcha BOUBA » → « AB ». */
export function initiales(nomComplet: string): string {
  return nomComplet
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
}
