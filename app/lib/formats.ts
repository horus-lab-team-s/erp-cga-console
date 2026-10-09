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

/**
 * Ce qu'on affiche à la place d'un nombre qu'on n'a pas.
 *
 * ⚠️ **DEMI-CADRATIN, ET NON CADRATIN.** Le cabinet ne veut aucun tiret
 * cadratin dans ce qu'un client lit, et cette constante se rend dans toutes les
 * cellules vides de tous les tableaux.
 *
 * ⚠️ Pas un trait d'union non plus : dans une colonne de montants, « - » se lit
 * comme un signe moins, et une case vide deviendrait un nombre négatif à l'oeil.
 * Le demi-cadratin est la marque usuelle de la valeur absente.
 */
export const TIRET = "–";

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
 * Vrai si la valeur reçue ne porte aucun nombre.
 *
 * ⚠️ `Number("")` VAUT ZÉRO, ET C'EST UN PIÈGE COMPTABLE. Un montant absent
 * rendu par le backend sous forme de chaîne vide s'affichait « 0 » — donc
 * « rien à payer » pour qui lit la colonne, alors que la vérité est « on ne
 * sait pas ». `Number("inconnu")` donnait bien « — » : les deux absences ne se
 * comportaient pas pareil, et seule la plus dangereuse passait.
 */
function absente(valeur: number | string): boolean {
  return typeof valeur === "string" && valeur.trim() === "";
}

/**
 * Séparateur espace, aucune décimale, négatif entre parenthèses et jamais signé.
 * `2350000` → « 2 350 000 » · `-450000` → « (450 000) »
 */
export function montant(valeur: number | string): string {
  if (absente(valeur)) return TIRET;
  const nombre = Math.round(Number(valeur));
  if (!Number.isFinite(nombre)) return TIRET;
  const groupes = Math.abs(nombre)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
  return nombre < 0 ? `(${groupes})` : groupes;
}

/** `2350000` → « 2 350 000 FCFA ». */
export function montantFcfa(valeur: number | string): string {
  const rendu = montant(valeur);
  // ⚠️ « — FCFA » se lit comme une devise sans montant, ce qui n'a pas de sens.
  // Quand il n'y a pas de nombre, il n'y a pas de devise non plus.
  return rendu === TIRET ? TIRET : `${rendu}${ESPACE_FINE}FCFA`;
}

/** Virgule décimale, symbole séparé par une espace fine. `19.25` → « 19,25 % ». */
export function taux(valeur: number | string, decimales = 2): string {
  if (absente(valeur)) return TIRET;
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return TIRET;
  const rendu = nombre.toFixed(decimales).replace(/\.?0+$/, "");
  return `${rendu.replace(".", ",")}${ESPACE_FINE}%`;
}


/** Le Cameroun est à UTC+1 toute l'année, sans heure d'été. Écart constant. */
const DECALAGE_DOUALA_MINUTES = 60;

/**
 * Le JOUR à afficher, pour une valeur qui peut être une date ou un instant.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA DISTINCTION QUI COMMANDE TOUT : UNE DATE N'EST PAS UN INSTANT.
 *
 * `"2026-08-15"` est une **date de calendrier** — une échéance, une date de
 * dépôt légale. Elle ne se convertit pas : le 15 août est le 15 août partout,
 * et lui appliquer un décalage la ferait glisser au 14 ou au 16.
 *
 * `"2026-08-15T23:30:00"` est un **instant**, horodaté en UTC par le serveur —
 * `app/partage/horloge.py` le dit : « tout est horodaté en UTC, et la
 * conversion à l'affichage est l'affaire de l'interface ». Cet instant-là est
 * déjà le **16 août** à Douala.
 *
 * ⚠️ L'INTERFACE NE FAISAIT PAS CETTE CONVERSION, et le contrat du serveur la
 * lui confiait explicitement. Conséquence : tout ce qui se passe entre 23 h et
 * minuit UTC — c'est-à-dire entre minuit et une heure du matin à Douala —
 * s'affichait **daté de la veille**. Sur un accusé de dépôt, un jour faux n'est
 * pas un détail de présentation : c'est la preuve qu'on a déposé à temps.
 *
 * ⚠️ LES COMPOSANTES SE RELISENT EN UTC, PUIS SE REPOSENT EN LOCAL. Lire
 * `getDate()` sur l'instant décalé rendrait le jour du fuseau de la MACHINE :
 * juste sur un poste à Douala, faux sur un serveur en UTC, et la même page
 * donnerait deux réponses selon qu'elle est rendue côté serveur ou côté
 * navigateur.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function jourALire(valeur: Date | string): Date | null {
  if (typeof valeur !== "string") return valeur;
  const porteUneHeure = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valeur);
  if (!porteUneHeure) {
    // ⚠️ Une valeur illisible rendait « NaN/NaN/NaN » — sous un accusé de dépôt,
    // cela fait appeler le cabinet. Même règle que pour les montants absents :
    // on affiche un tiret, qui se lit « on ne sait pas ».
    const jour = new Date(`${valeur.slice(0, 10)}T00:00:00`);
    return Number.isNaN(jour.getTime()) ? null : jour;
  }
  const utc = new Date(`${valeur.slice(0, 19)}Z`);
  if (Number.isNaN(utc.getTime())) return null;
  const douala = new Date(utc.getTime() + DECALAGE_DOUALA_MINUTES * 60_000);
  return new Date(douala.getUTCFullYear(), douala.getUTCMonth(), douala.getUTCDate());
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
  const d = jourALire(valeur);
  if (!d) return TIRET;
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Forme compacte réservée aux tableaux denses. `2026-08-15` → « 15/08/2026 ». */
export function dateCourte(valeur: Date | string): string {
  const d = jourALire(valeur);
  if (!d) return TIRET;
  const jour = String(d.getDate()).padStart(2, "0");
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  return `${jour}/${mois}/${d.getFullYear()}`;
}

/** Mois et année en toutes lettres. `2026-07-01` → « juillet 2026 ». */
export function periode(valeur: Date | string): string {
  const d = jourALire(valeur);
  if (!d) return TIRET;
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
