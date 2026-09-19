/**
 * Les opérateurs du constructeur de règles, en clair (pas 97).
 *
 * ⚠️ Module à part, **sans import** : il est lu par un composant client, et
 * `regles-du-cabinet.ts` dépend de `api.ts`, qui lit les en-têtes de la requête côté
 * serveur. Une constante importée de là entraînait tout le module dans le navigateur, et
 * la construction de production échouait.
 */

export const LIBELLES_OPERATEUR: Record<string, string> = {
  EST_VIDE: "est vide",
  N_EST_PAS_VIDE: "est renseigné",
  EGAL: "est égal à",
  DIFFERENT: "est différent de",
  SUPERIEUR: "est supérieur à",
  SUPERIEUR_OU_EGAL: "est supérieur ou égal à",
  INFERIEUR: "est inférieur à",
  INFERIEUR_OU_EGAL: "est inférieur ou égal à",
  CORRESPOND_AU_MOTIF: "correspond au motif",
  NE_CORRESPOND_PAS_AU_MOTIF: "ne correspond pas au motif",
};
