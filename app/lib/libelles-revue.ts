/** Les libellés de la revue, sans dépendance serveur : importables par un composant client. */

export const LIBELLES_STATUT_REVUE: Record<string, { libelle: string; couleur: string }> = {
  TRANSMISE: { libelle: "Chez le réviseur", couleur: "var(--warning)" },
  RENVOYEE: { libelle: "Renvoyée au comptable", couleur: "var(--danger)" },
  VALIDEE: { libelle: "Validée", couleur: "var(--success)" },
};

export const LIBELLES_STATUT_REMARQUE: Record<string, { libelle: string; couleur: string }> = {
  OUVERTE: { libelle: "Ouverte", couleur: "var(--danger)" },
  TRAITEE: { libelle: "Répondue, à juger", couleur: "var(--warning)" },
  CLOSE: { libelle: "Close", couleur: "var(--success)" },
};

export const LIBELLES_NATURE_OBJET: Record<string, string> = {
  ECRITURE: "Écriture",
  PIECE: "Pièce",
  COMPTE: "Compte",
};
