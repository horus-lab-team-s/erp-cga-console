/**
 * Les libellés du rapprochement, sans dépendance serveur : importables par un composant
 * client (voir l'avertissement de `saisie.ts` sur `api.ts` et `next/headers`).
 */

export const NATURES_DE_JUSTIFICATION: { valeur: string; libelle: string; aide: string }[] = [
  {
    valeur: "PIECE_DEMANDEE",
    libelle: "Pièce demandée à l'adhérent",
    aide: "Aucun justificatif : la demande part à qui relance l'adhérent, et aucune écriture d'attente n'est passée.",
  },
  {
    valeur: "ECRITURE_A_VENIR",
    libelle: "Écriture à passer sur la période suivante",
    aide: "Frais ou agios connus en fin de mois, justifiés, saisis ensuite.",
  },
  { valeur: "ERREUR_BANCAIRE", libelle: "Erreur de la banque", aide: "Signalée à l'établissement." },
];

export const LIBELLES_FORCE: Record<string, { libelle: string; couleur: string; fond: string }> = {
  FORTE: { libelle: "Correspondance forte", couleur: "var(--success)", fond: "var(--success-100)" },
  POSSIBLE: { libelle: "Possible", couleur: "var(--brand-indigo-700)", fond: "var(--brand-indigo-100)" },
  A_ECARTER: { libelle: "À écarter", couleur: "var(--warning)", fond: "var(--warning-100)" },
};
