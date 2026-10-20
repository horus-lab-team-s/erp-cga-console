/**
 * Les fournisseurs de l'exercice tels que les modèles de la DGI les déclarent, et leur fiche
 * au registre du dossier (16 octobre 2026). Module sans dépendance serveur : les composants
 * client l'importent.
 */

export type TiersDeclare = {
  tiers: string;
  denomination: string | null;
  niu: string | null;
  pays: string | null;
  sigle: string | null;
  telephone: string | null;
  ville: string | null;
  au_registre: boolean;
  etranger: boolean;
};

export type DeclarationParTiers = {
  nature: "fournisseurs" | "tiers";
  nom_du_fichier: string;
  avertissements: string[];
  lignes: TiersDeclare[];
};

/** Ce que les modèles de la DGI demandent et que la fiche ne porte pas encore. */
export function manquantsDuTiers(t: TiersDeclare): string[] {
  const manque: string[] = [];
  if (!t.denomination) manque.push("raison sociale");
  if (!t.telephone) manque.push("téléphone");
  if (!t.ville) manque.push("ville");
  if (t.etranger && !t.pays) manque.push("pays");
  return manque;
}
