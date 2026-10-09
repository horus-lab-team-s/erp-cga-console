import type { NextRequest } from "next/server";

import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Négociation de langue à l'entrée.
 *
 * Depuis Next.js 16, la convention `middleware` s'appelle `proxy` : même
 * fonctionnement, nom plus juste. `next-intl` continue d'exposer sa fabrique sous
 * l'ancien nom, ce qui est sans incidence.
 */
const negocierLaLangue = createMiddleware(routing);

/**
 * La politique de contenu, avec un nonce par requête.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE S'AJOUTE ICI, ET NON DANS UN `middleware.ts` À CÔTÉ.
 *
 * J'en avais écrit un ; le build l'a refusé net : « Both middleware file
 * "./middleware.ts" and proxy file "./proxy.ts" are detected. » Next n'en
 * accepte qu'un, et c'est ce fichier — celui qui négocie déjà la langue. Le bon
 * échec, au bon moment.
 *
 * ⚠️ IL N'Y AVAIT AUCUNE `Content-Security-Policy`, ET L'ABSENCE ÉTAIT ASSUMÉE.
 *
 * Le commentaire de `next.config.ts` disait vrai : une politique écrite à la
 * légère se contente d'un `'unsafe-inline'` partout et ne protège de rien. Mais
 * l'absence ne protège de rien non plus.
 *
 * ⚠️ POURQUOI UN NONCE ET NON `'unsafe-inline'`
 *
 * Trois scripts en ligne sont servis : celui qui applique le thème avant le
 * premier rendu — pour éviter un clignotement de fond blanc — et deux de Next,
 * qui poussent la charge des composants serveur.
 *
 * Avec `'unsafe-inline'`, un script injecté par une faille s'exécute exactement
 * comme les nôtres : la politique devient décorative. Avec un nonce, seuls les
 * scripts que **nous** marquons s'exécutent ; un script injecté ne peut pas
 * deviner le nonce de la requête.
 *
 * ⚠️ CE QUE LES AUTRES DIRECTIVES EMPÊCHENT, ET QUI COMPTE AUTANT
 *
 *   · `connect-src 'self'` — **le gain le plus concret.** Le navigateur ne parle
 *     jamais au backend directement : tout passe par le serveur Next, une seule
 *     origine. Un script injecté ne peut donc envoyer la session, un montant ou
 *     un NIU nulle part ;
 *   · `object-src 'none'` — pas de greffon, pas de PDF exécuté dans la page. Un
 *     justificatif déposé par un adhérent est du contenu venu du dehors ;
 *   · `base-uri 'self'` — sans elle, une balise `<base>` injectée détourne
 *     **toutes** les adresses relatives, y compris celles des formulaires ;
 *   · `form-action 'self'` — un formulaire ne poste jamais ailleurs. C'est ce
 *     qui empêche un mot de passe de partir chez un tiers ;
 *   · `frame-ancestors 'none'` — ce que `X-Frame-Options: DENY` dit, dans la
 *     version que les navigateurs récents lisent.
 *
 * ⚠️ `style-src` GARDE `'unsafe-inline'`, ET C'EST ASSUMÉ.
 *
 * Le produit emploie près de dix-sept cents styles en attribut : c'est sa façon
 * d'écrire, et `style-src-attr` ne connaît pas les nonces. Les retirer
 * demanderait de réécrire toute l'interface. Un style injecté peut défigurer une
 * page ; il ne peut ni exécuter de code, ni faire sortir une donnée.
 *
 * ⚠️ ET ELLE NE RÉPARE PAS UNE INJECTION : elle en limite les effets. Ce qui
 * empêche l'injection reste l'échappement de React et le refus du serveur.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function politiqueDeContenu(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Voir l'en-tête : les styles en attribut sont la façon d'écrire du produit.
    "style-src 'self' 'unsafe-inline'",
    // `data:` pour les images en ligne, `blob:` pour un justificatif qu'on
    // prévisualise avant de l'envoyer.
    "img-src 'self' data: blob:",
    // `next/font` héberge les polices localement : aucune origine externe.
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // ⚠️ Pas de `upgrade-insecure-requests` : la démonstration est servie en
    // clair, et la directive ferait échouer chaque requête de la page.
  ].join("; ");
}

export default function proxy(requete: NextRequest) {
  // ⚠️ `crypto` de la plateforme, pas une bibliothèque : l'exécution en
  // périphérie n'a pas `node:crypto`, et un nonce prévisible ne vaut rien.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const politique = politiqueDeContenu(nonce);

  // ⚠️ Le nonce est posé sur la REQUÊTE : c'est là que Next le lit pour le
  // reporter sur ses propres scripts en ligne, et la mise en page l'y lit aussi
  // pour le script du thème.
  requete.headers.set("x-nonce", nonce);
  requete.headers.set("Content-Security-Policy", politique);

  // La négociation de langue **d'abord** : elle peut réécrire ou rediriger, et
  // c'est sa réponse qu'il faut coiffer. Poser l'en-tête sur une autre réponse
  // que celle qui part ne protégerait rien.
  const reponse = negocierLaLangue(requete);
  reponse.headers.set("Content-Security-Policy", politique);
  return reponse;
}

export const config = {
  // Le motif exclut par PRÉFIXE, sans point à échapper.
  //
  // La forme courante `(?!api|_next|.*\..*)` piège : dans une chaîne JavaScript,
  // un antislash simple disparaît, le point devient « n'importe quel caractère »,
  // et l'exclusion avale alors toutes les URL d'au moins un caractère. Le symptôme
  // est déroutant : la racine se traduit, toutes les autres pages tombent en 404.
  //
  // Lister les dossiers statiques est plus long mais ne peut pas se retourner ainsi.
  matcher: [
    "/",
    "/((?!api|_next|_vercel|images|marque|documents|favicon|robots|sitemap).*)",
  ],
};
