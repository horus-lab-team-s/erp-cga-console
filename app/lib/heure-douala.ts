/**
 * L'heure de Douala saisie à l'écran, rendue en UTC sans fuseau pour le backend.
 *
 * ⚠️ Déplacée de `actions-obligations.ts` au pas 87 : le constat de TVA en a besoin aussi,
 * et un fichier `"use server"` n'exporte que des fonctions asynchrones. Deux copies de la
 * conversion finiraient par diverger d'une heure.
 *
 * Le backend horodate tout en UTC et laisse la conversion à l'affichage (voir
 * `app/partage/horloge.py`). Envoyer « 10:30 » tel quel, saisi à Douala, ferait refuser
 * un dépôt fait il y a vingt minutes comme « postérieur à maintenant » : 10:30 à Douala
 * est 09:30 UTC. Le Cameroun est à UTC+1 toute l'année, sans heure d'été ; le décalage
 * est donc une constante, et il est écrit ici une fois.
 */
const DECALAGE_DOUALA_MINUTES = 60;

/**
 * L'inverse : un horodatage UTC rendu par le backend, lu à l'heure de Douala.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ IL MANQUAIT, ET L'ÉCRAN D'EXPLOITATION MENTAIT D'UNE HEURE.
 *
 * `horodatageCourt` découpait la chaîne ISO sans rien convertir : le tableau des
 * travaux affichait « 10:06 » à un exploitant dont la montre disait 11:07. Un
 * ordonnanceur en parfaite santé, dont le relais venait de passer deux secondes
 * plus tôt, paraissait **arrêté depuis une heure**.
 *
 * Je suis tombé dans le piège moi-même en vérifiant l'ordonnancement, et la
 * première réaction est la mauvaise : on va relancer un service qui tourne.
 *
 * ⚠️ POURQUOI PAS `toLocaleString` DU NAVIGATEUR
 *
 * Parce que la page est rendue **sur le serveur**, dont le fuseau est celui du
 * conteneur — UTC. `toLocaleString` y rendrait l'heure UTC, et la même page
 * rendue côté navigateur rendrait celle du poste, qui peut être n'importe
 * laquelle. Deux vérités pour la même ligne, dont aucune n'est l'heure du
 * cabinet. Le Cameroun est à UTC+1 toute l'année : le décalage est une
 * constante, écrite une fois, et elle donne la même réponse des deux côtés.
 */
export function depuisUtc(utcSansFuseau: string): string {
  // ⚠️ Le `Z` est posé explicitement : sans lui, `new Date("2026-09-25T10:06")`
  // interprète la chaîne dans le fuseau du poste, et le décalage s'ajoute deux
  // fois — ou pas du tout, selon la machine.
  const utc = new Date(`${utcSansFuseau.slice(0, 19)}Z`);
  if (Number.isNaN(utc.getTime())) return utcSansFuseau;
  const douala = new Date(utc.getTime() + DECALAGE_DOUALA_MINUTES * 60_000);
  return douala.toISOString().slice(0, 19);
}



/**
 * Aujourd'hui, **à Douala**, au format que le backend attend.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ `new Date().toISOString().slice(0, 10)` REND LE JOUR UTC, ET C'ÉTAIT LA
 * VERSION EN PLACE.
 *
 * Ces pages sont des composants **serveur** : elles s'exécutent dans le
 * conteneur, dont le fuseau est UTC. Entre minuit et une heure du matin à
 * Douala, `aujourd'hui` valait donc **la veille**, et cette date part au backend
 * comme `a_la_date` — le paramètre qui décide de ce qui est échu, de ce qui est
 * en retard, de quel exercice est courant.
 *
 * Une heure par jour, la console lit le portefeuille à la mauvaise date. C'est
 * peu, et c'est exactement l'heure où l'on travaille la veille d'une échéance.
 *
 * ⚠️ L'INSTANT EST INJECTABLE, et c'est ce qui rend la fonction vérifiable. Sans
 * cela, on ne peut éprouver la bascule de minuit qu'en changeant l'horloge de la
 * machine.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function jourADouala(instant: Date = new Date()): string {
  const douala = new Date(instant.getTime() + DECALAGE_DOUALA_MINUTES * 60_000);
  return douala.toISOString().slice(0, 10);
}

/**
 * Le mois écoulé **à Douala**, au format `AAAA-MM`.
 *
 * ⚠️ MÊME DÉFAUT, EN PIRE : il était recopié dans QUATRE pages, chacune avec sa
 * propre version, et toutes calculaient en UTC. Le premier du mois entre minuit
 * et une heure, « le mois écoulé » désignait donc **l'avant-dernier mois** — le
 * jour précis où le cabinet ouvre la période déclarative.
 *
 * Quatre copies, c'est aussi quatre endroits à corriger et trois qu'on oublie.
 */
export function moisPrecedentADouala(instant: Date = new Date()): string {
  const douala = new Date(instant.getTime() + DECALAGE_DOUALA_MINUTES * 60_000);
  const precedent = new Date(Date.UTC(douala.getUTCFullYear(), douala.getUTCMonth() - 1, 1));
  return precedent.toISOString().slice(0, 7);
}

export function versUtc(localDouala: string): string {
  const [jour, heure] = localDouala.split("T");
  const [annee, mois, j] = jour.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  const utc = new Date(Date.UTC(annee, mois - 1, j, h, m) - DECALAGE_DOUALA_MINUTES * 60_000);
  return utc.toISOString().slice(0, 19);
}
