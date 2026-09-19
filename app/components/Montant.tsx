/**
 * Montants et pastilles de statut — § 4 et § 6 du dossier de design.
 */

import { montant, montantFcfa } from "@/app/lib/formats";

/**
 * Montant aligné à droite, chiffres tabulaires, négatif entre parenthèses et en
 * rouge. Jamais de signe moins isolé : dans une colonne dense il se confond avec
 * un tiret.
 */
export function Montant({
  valeur,
  avecDevise = false,
}: {
  valeur: number | string;
  avecDevise?: boolean;
}) {
  const nombre = Number(valeur);
  const negatif = Number.isFinite(nombre) && nombre < 0;
  return (
    <span
      style={{
        fontVariantNumeric: "tabular-nums",
        textAlign: "right",
        whiteSpace: "nowrap",
        color: negatif ? "var(--danger)" : "var(--ink-900)",
      }}
    >
      {avecDevise ? montantFcfa(valeur) : montant(valeur)}
    </span>
  );
}

/**
 * Statuts du cycle de vie d'une pièce et d'une obligation.
 * Le vert n'est employé que pour un état ACHEVÉ : déclarée, payée, conforme.
 */
export type Statut =
  | "Reçue"
  | "Lue"
  | "Rapprochée"
  | "Comptabilisée"
  | "Archivée"
  | "Rectif. demandée"
  | "En retard"
  | "À faire"
  | "En préparation"
  | "Prête"
  | "Déclarée"
  | "Payée"
  // La veille des seuils : quatre conclusions rendues par le backend, jamais
  // recalculées à l'écran.
  | "Reclassement dû"
  | "Reclassement inscrit"
  | "Hors champ"
  | "À surveiller";

const ACHEVE: Statut[] = ["Comptabilisée", "Archivée", "Prête", "Déclarée", "Payée", "Reclassement inscrit"];
const ALERTE: Statut[] = ["Rectif. demandée", "À surveiller"];
// ⚠️ « Reclassement dû » et « Hors champ » prennent le ton du retard : ce sont des
// faits acquis sur un exercice clos, pas des prévisions, et ils font déjà courir un
// risque au dossier.
const RETARD: Statut[] = ["En retard", "Reclassement dû", "Hors champ"];

export function PastilleStatut({ statut }: { statut: Statut }) {
  let fond = "var(--brand-indigo-100)";
  let texte = "var(--brand-indigo-700)";
  if (ACHEVE.includes(statut)) {
    fond = "var(--success-100)";
    texte = "var(--success)";
  } else if (ALERTE.includes(statut)) {
    fond = "var(--warning-100)";
    texte = "var(--warning)";
  } else if (RETARD.includes(statut)) {
    fond = "var(--danger-100)";
    texte = "var(--danger)";
  }
  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        padding: "4px 10px",
        borderRadius: "var(--rayon-pilule)",
        background: fond,
        color: texte,
        font: "600 11.5px/1.3 var(--police-texte)",
      }}
    >
      {statut}
    </span>
  );
}
