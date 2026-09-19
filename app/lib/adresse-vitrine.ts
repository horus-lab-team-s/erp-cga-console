/**
 * Où vit le site public.
 *
 * ⚠️ Depuis la scission, la vitrine est une autre application et souvent un
 * autre domaine. Les pages publiques de la console — connexion, activation,
 * oubli de mot de passe — doivent pouvoir y renvoyer, et une adresse relative
 * ne le permet plus : elle désignerait une page de la console, qui rend 404.
 *
 * ⚠️ `NEXT_PUBLIC_` est ici LÉGITIME, contrairement à l'adresse du serveur :
 * c'est un lien que le navigateur doit suivre, donc une adresse publique par
 * nature. Rien n'est révélé qui ne figure déjà dans la barre d'adresse.
 */
export const ADRESSE_VITRINE =
  process.env.NEXT_PUBLIC_ADRESSE_VITRINE ?? "http://localhost:3001";
