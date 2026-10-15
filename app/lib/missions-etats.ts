/** Les missions de prestation ponctuelle (15 octobre 2026) : types et libellés, sans réseau. */

export type TypeMission = "ANALYSE_CONTRAT" | "REDACTION_CONTRAT" | "DSF_CIBLEE";
export type EtatMission = "OUVERTE" | "A_VALIDER" | "LIVREE";
export type Rubrique = "RESUME" | "PARTIES" | "OBLIGATION" | "CLAUSE_A_RISQUE" | "MANQUE" | "RECOMMANDATION" | "ARTICLE";
export type Decision = "EN_ATTENTE" | "RETENUE" | "MODIFIEE" | "ECARTEE";

export type Proposition = {
  rang: number;
  rubrique: Rubrique;
  titre: string;
  texte: string;
  citation: string | null;
  gravite: "FAIBLE" | "MOYENNE" | "ELEVEE" | null;
  origine: "AGENT" | "COLLABORATEUR";
  decision: Decision;
  texte_retenu: string | null;
  motif_ecart: string | null;
  decide_par: string | null;
  decide_le: string | null;
};

export type Lecture = { moteur: string; faite_le: string; demandee_par: string; propositions: number; incident: string | null };

export type Mission = {
  identifiant: string;
  type: TypeMission;
  client: string;
  client_courriel: string | null;
  reference_commerciale: string | null;
  objet: string;
  responsable: string;
  ouverte_le: string;
  etat: EtatMission;
  document_empreinte: string | null;
  document_nom: string | null;
  /** Rédaction : le cahier du juriste et le type de contrat. */
  cahier: string | null;
  type_de_contrat: string | null;
  /** DSF ciblée : le dossier et l'exercice. */
  dossier_niu: string | null;
  exercice: string | null;
  propositions: Proposition[];
  lectures: Lecture[];
  soumise_par: string | null;
  soumise_le: string | null;
  validee_par: string | null;
  validee_le: string | null;
  renvoi: string | null;
};

export const LIBELLES_TYPE: Record<TypeMission, string> = {
  ANALYSE_CONTRAT: "Analyse de contrat",
  REDACTION_CONTRAT: "Rédaction de contrat",
  DSF_CIBLEE: "DSF ciblée",
};

export const LIBELLES_ETAT: Record<EtatMission, string> = {
  OUVERTE: "En instruction",
  A_VALIDER: "Soumise · au second regard",
  LIVREE: "Livrée",
};

export const LIBELLES_RUBRIQUE: Record<Rubrique, string> = {
  RESUME: "Objet du contrat",
  PARTIES: "Parties",
  OBLIGATION: "Obligation",
  CLAUSE_A_RISQUE: "Clause à surveiller",
  MANQUE: "Ce qui manque",
  RECOMMANDATION: "Recommandation",
  ARTICLE: "Article",
};

/**
 * 15 octobre 2026 : une DSF ciblée affichait « Objet du contrat ». Le libellé d'une
 * rubrique dépend du type de mission ; les autres types gardent ceux du contrat.
 */
const RUBRIQUES_DSF: Partial<Record<Rubrique, string>> = {
  RESUME: "Synthèse",
  CLAUSE_A_RISQUE: "Point à surveiller",
};

export function libelleDeRubrique(rubrique: Rubrique, type: TypeMission): string {
  return (type === "DSF_CIBLEE" ? RUBRIQUES_DSF[rubrique] : undefined) ?? LIBELLES_RUBRIQUE[rubrique];
}

/** Les rubriques proposées à la saisie, selon le type. */
export function rubriquesDuType(type: TypeMission): Rubrique[] {
  if (type === "REDACTION_CONTRAT") return ["ARTICLE"];
  if (type === "DSF_CIBLEE") return ["RESUME", "CLAUSE_A_RISQUE", "MANQUE", "RECOMMANDATION"];
  return ["RESUME", "PARTIES", "OBLIGATION", "CLAUSE_A_RISQUE", "MANQUE", "RECOMMANDATION"];
}

export const LIBELLES_DECISION: Record<Decision, string> = {
  EN_ATTENTE: "À décider",
  RETENUE: "Retenue",
  MODIFIEE: "Retenue, reformulée",
  ECARTEE: "Écartée",
};

export const LIBELLES_GRAVITE = { FAIBLE: "risque faible", MOYENNE: "risque moyen", ELEVEE: "risque élevé" } as const;
