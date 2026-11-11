/**
 * Les retards du cabinet (lot 4, 9 novembre 2026). Deux sources, une forme : le pilotage
 * (comptabilité, déclarations, création) et l'acquisition (commerce, rendez-vous, honoraires).
 */

import { appeler } from "./api";

export type CategorieDeRetard =
  | "COMPTABILITE"
  | "DECLARATION"
  | "CREATION"
  | "COMMERCE"
  | "RENDEZ_VOUS"
  | "REGLEMENT";

export type Retard = {
  categorie: CategorieDeRetard;
  dossier: string;
  denomination: string;
  libelle: string;
  echeance: string;
  jours_de_retard: number;
  lien: string;
  responsables: { compte: string; nom: string }[];
};

const authentifie = { authentifie: true } as const;

export function lireLesRetardsDuPilotage() {
  return appeler<{ a_la_date: string; tout_le_cabinet: boolean; retards: Retard[] }>(
    "/pilotage/retards",
    authentifie,
  );
}

export function lireLesRetardsDuCommerce() {
  return appeler<{ a_la_date: string; retards: Retard[] }>("/acquisition/retards", authentifie);
}

export const LIBELLES_CATEGORIE: Record<CategorieDeRetard, string> = {
  COMPTABILITE: "Comptabilité",
  DECLARATION: "Déclaration",
  CREATION: "Création",
  COMMERCE: "Commerce",
  RENDEZ_VOUS: "Rendez-vous",
  REGLEMENT: "Honoraires",
};

/** Les retards regroupés par responsable ; un retard sans porteur va sous « Non attribué ». */
export function parResponsable(retards: Retard[]): { nom: string; retards: Retard[] }[] {
  const groupes = new Map<string, { nom: string; retards: Retard[] }>();
  for (const r of retards) {
    const porteurs = r.responsables.length ? r.responsables : [{ compte: "", nom: "Non attribué" }];
    for (const p of porteurs) {
      const cle = p.compte || "non-attribue";
      const groupe = groupes.get(cle) ?? { nom: p.nom, retards: [] };
      groupe.retards.push(r);
      groupes.set(cle, groupe);
    }
  }
  return [...groupes.values()].sort((a, b) => b.retards.length - a.retards.length || a.nom.localeCompare(b.nom, "fr"));
}
