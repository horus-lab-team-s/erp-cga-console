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

export function versUtc(localDouala: string): string {
  const [jour, heure] = localDouala.split("T");
  const [annee, mois, j] = jour.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  const utc = new Date(Date.UTC(annee, mois - 1, j, h, m) - DECALAGE_DOUALA_MINUTES * 60_000);
  return utc.toISOString().slice(0, 19);
}
