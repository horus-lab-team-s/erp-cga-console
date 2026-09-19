/**
 * Formats de restitution — § 4 du dossier de design.
 *
 * Miroir de `Backend_erp_cga/app/shared/formats.py`. Les deux implémentations
 * doivent rester alignées : un montant rendu différemment côté serveur et côté
 * client dans un même écran est un défaut visible.
 *
 * Le séparateur de milliers est une espace insécable étroite (U+202F) : elle
 * empêche un montant de se couper en fin de ligne.
 */

export const ESPACE_FINE = " ";

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/**
 * Séparateur espace, aucune décimale, négatif entre parenthèses et jamais signé.
 * `2350000` → « 2 350 000 » · `-450000` → « (450 000) »
 */
export function montant(valeur: number | string): string {
  const nombre = Math.round(Number(valeur));
  if (!Number.isFinite(nombre)) return "—";
  const groupes = Math.abs(nombre)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
  return nombre < 0 ? `(${groupes})` : groupes;
}

/** `2350000` → « 2 350 000 FCFA ». */
export function montantFcfa(valeur: number | string): string {
  return `${montant(valeur)}${ESPACE_FINE}FCFA`;
}

/** Virgule décimale, symbole séparé par une espace fine. `19.25` → « 19,25 % ». */
export function taux(valeur: number | string, decimales = 2): string {
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return "—";
  const rendu = nombre.toFixed(decimales).replace(/\.?0+$/, "");
  return `${rendu.replace(".", ",")}${ESPACE_FINE}%`;
}

/**
 * ⚠️ Pas 87 : les trois formats ci-dessous acceptent aussi une date-heure
 * (`2026-02-12T09:00:00`), dont ils ne gardent que le jour. Ils ajoutaient
 * `T00:00:00` à la chaîne reçue : une date-heure devenait `…T09:00:00T00:00:00`,
 * invalide, et l'écran affichait « le NaN/NaN/NaN » sous l'accusé d'un dépôt de TVA.
 * Corriger la fonction répare tous les appels, y compris ceux qui n'ont pas encore
 * rencontré de date-heure.
 */

/** Forme lisible. `2026-08-15` → « 15 août 2026 ». */
export function dateLongue(valeur: Date | string): string {
  const d = typeof valeur === "string" ? new Date(`${valeur.slice(0, 10)}T00:00:00`) : valeur;
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Forme compacte réservée aux tableaux denses. `2026-08-15` → « 15/08/2026 ». */
export function dateCourte(valeur: Date | string): string {
  const d = typeof valeur === "string" ? new Date(`${valeur.slice(0, 10)}T00:00:00`) : valeur;
  const jour = String(d.getDate()).padStart(2, "0");
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  return `${jour}/${mois}/${d.getFullYear()}`;
}

/** Mois et année en toutes lettres. `2026-07-01` → « juillet 2026 ». */
export function periode(valeur: Date | string): string {
  const d = typeof valeur === "string" ? new Date(`${valeur.slice(0, 10)}T00:00:00`) : valeur;
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
