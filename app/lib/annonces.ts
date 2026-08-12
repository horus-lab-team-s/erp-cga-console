/**
 * Les annonces du site — le bandeau accrocheur qui court sur toutes les pages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'EST UNE ANNONCE
 *
 * Une phrase, une seule, écrite pour arrêter le regard, et un lien vers la page
 * qui la développe. Ce n'est pas un canal d'information : c'est un appel. Tout ce
 * qui demande deux phrases appartient au blog, pas ici.
 *
 * POURQUOI UNE FENÊTRE DE VALIDITÉ
 *
 * `du` et `au` bornent l'affichage. Une promotion de fin d'année encore visible
 * en mars fait plus de tort que pas d'annonce du tout : elle apprend au visiteur
 * que le site n'est pas tenu. Passée la date, l'annonce disparaît d'elle-même,
 * sans que personne ait à y penser.
 *
 * Une seule annonce s'affiche à la fois — la première encore valide dans l'ordre
 * de ce tableau. Deux bandeaux superposés, c'est une page qu'on ne lit plus.
 *
 * ⚠️ `cle` sert à mémoriser la fermeture dans le navigateur du visiteur. Changer
 * le texte d'une annonce **sans changer sa clé** laisse fermée, chez ceux qui
 * l'avaient fermée, une annonce qui n'est plus la même. Nouveau message, nouvelle
 * clé.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Annonce = {
  /** Identifiant de mémorisation de la fermeture. Change avec le message. */
  cle: string;
  /** Le mot de tête, en pastille. Court : deux mots au plus. */
  etiquette: string;
  /** L'accroche. Une phrase, lue d'un coup d'œil. */
  texte: string;
  lien: string;
  libelleLien: string;
  /** Premier et dernier jour d'affichage, inclus, au format ISO. */
  du: string;
  au: string;
};

export const ANNONCES: Annonce[] = [
  {
    cle: "pack-sarl-275-2026",
    etiquette: "Offre",
    texte:
      "Votre SARL immatriculée, statuts et attestations compris, pour 275 000 FCFA — sans notaire et sans file d'attente.",
    lien: "/blog/pack-formalisation-sarl",
    libelleLien: "Voir l'offre",
    du: "2026-01-01",
    au: "2026-12-31",
  },
];

/**
 * L'annonce à afficher aujourd'hui, ou `null`.
 *
 * La date est passée en argument plutôt que lue ici : le composant appelant la
 * calcule **après montage**, côté navigateur. Un rendu serveur qui déciderait de
 * l'affichage produirait un balisage différent de celui du client au passage de
 * minuit, et l'hydratation s'en plaindrait.
 */
export function annonceDuJour(aujourdhui: string): Annonce | null {
  return ANNONCES.find((a) => a.du <= aujourdhui && aujourdhui <= a.au) ?? null;
}

/** Combien de temps l'annonce reste à l'écran avant de s'effacer seule. */
export const DUREE_ANNONCE_MS = 30_000;
