/**
 * L'arrêté des charges sociales d'un mois (18 octobre 2026, point 8).
 * ⚠️ Aucun import : les composants navigateur en tirent leurs types.
 *
 * La paie PROPOSE ; un collaborateur ARRÊTE, en corrigeant s'il le faut. Seul le
 * montant arrêté sert aux appels de fonds et au dépôt.
 */

export type RubriqueSociale = "CNPS" | "IRPP" | "CFC" | "FNE" | "TDL" | "RAV";

export const RUBRIQUES: { code: RubriqueSociale; libelle: string; organisme: string }[] = [
  { code: "CNPS", libelle: "CNPS (pension, prestations familiales, accidents du travail)", organisme: "CNPS" },
  { code: "IRPP", libelle: "IRPP sur salaires, CAC comprise", organisme: "Impôts" },
  { code: "CFC", libelle: "Crédit foncier (salarié et employeur)", organisme: "Impôts" },
  { code: "FNE", libelle: "Fonds national de l'emploi", organisme: "Impôts" },
  { code: "TDL", libelle: "Taxe de développement local", organisme: "Impôts" },
  { code: "RAV", libelle: "Redevance audiovisuelle", organisme: "Impôts" },
];

export type ArreteDesCharges = {
  entreprise: string;
  periode: string;
  montants: Record<RubriqueSociale, string>;
  proposition: Record<RubriqueSociale, string>;
  arrete_par: string;
  arrete_le: string;
  motif: string | null;
};

export type ChargesDuMois = {
  proposition: Record<RubriqueSociale, string>;
  arrete: ArreteDesCharges | null;
};
