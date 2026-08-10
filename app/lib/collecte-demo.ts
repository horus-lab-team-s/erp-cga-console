/**
 * Métadonnées de collecte — canal de réception et statut du cycle de vie.
 *
 * ⚠️ TEMPORAIRE. Ces données appartiennent au contexte **C · Collecte**, qui n'est
 * pas implémenté : c'est lui qui possédera le canal d'arrivée d'une pièce, son
 * statut dans le cycle `Reçue → Lue → Rapprochée → Comptabilisée → Archivée`, la
 * miniature du document et le score de confiance de l'extraction.
 *
 * Le backend ne les renvoie donc pas, et il aurait été malhonnête de les y ajouter
 * : cela aurait laissé croire le contexte C existant. Elles sont simulées ici, par
 * référence de facture, et disparaîtront quand C sera écrit.
 *
 * La conformité, elle, est bien réelle : elle vient du moteur.
 */

import type { Statut } from "../components/Montant";

export type Canal = "Portail" | "Mobile" | "WhatsApp" | "Courriel";

export const CANAUX: Canal[] = ["Portail", "Mobile", "WhatsApp", "Courriel"];

/** Statuts du cycle de vie d'une pièce, dans l'ordre de progression. */
export const STATUTS_PIECE: Statut[] = [
  "Reçue",
  "Lue",
  "Rapprochée",
  "Comptabilisée",
  "Rectif. demandée",
];

export type MetaCollecte = { canal: Canal; statut: Statut };

/**
 * Une pièce comptabilisée est un dossier clos ; une pièce en rectification
 * attend l'adhérent. Les deux sortent du flux à traiter, ce que reflètent les
 * compteurs de l'écran.
 */
const META: Record<string, MetaCollecte> = {
  "F-2026-0412": { canal: "Mobile", statut: "Reçue" },
  "F-2026-0413": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0414": { canal: "Mobile", statut: "Rectif. demandée" },
  "F-2026-0415": { canal: "Courriel", statut: "Lue" },
  "F-2026-0416": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0417": { canal: "WhatsApp", statut: "Reçue" },
  "F-2026-0418": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0419": { canal: "Courriel", statut: "Rapprochée" },
  "F-2026-0420": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0421": { canal: "WhatsApp", statut: "Lue" },
  "F-2026-0422": { canal: "Mobile", statut: "Reçue" },
  "F-2026-0423": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0424": { canal: "WhatsApp", statut: "Reçue" },
  "F-2026-0425": { canal: "Mobile", statut: "Reçue" },
  "F-2026-0426": { canal: "Portail", statut: "Rapprochée" },
  "F-2026-0427": { canal: "Courriel", statut: "Lue" },
  "F-2026-0428": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0429": { canal: "Courriel", statut: "Comptabilisée" },
  "F-2026-0430": { canal: "Mobile", statut: "Lue" },
  "F-2026-0431": { canal: "WhatsApp", statut: "Reçue" },
  "F-2026-0432": { canal: "Portail", statut: "Rapprochée" },
  "F-2026-0433": { canal: "Mobile", statut: "Reçue" },
  "F-2026-0434": { canal: "WhatsApp", statut: "Reçue" },
  "F-2026-0435": { canal: "Courriel", statut: "Lue" },
  "F-2026-0436": { canal: "Portail", statut: "Comptabilisée" },
  "F-2026-0437": { canal: "Courriel", statut: "Comptabilisée" },
  "F-2026-0438": { canal: "Portail", statut: "Rapprochée" },
  "F-2026-0439": { canal: "Courriel", statut: "Lue" },
  "F-2026-0440": { canal: "Mobile", statut: "Reçue" },
};

const PAR_DEFAUT: MetaCollecte = { canal: "Portail", statut: "Reçue" };

export function metaCollecte(reference: string): MetaCollecte {
  return META[reference] ?? PAR_DEFAUT;
}
