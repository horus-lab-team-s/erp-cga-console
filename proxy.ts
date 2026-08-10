import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Négociation de langue à l'entrée.
 *
 * Depuis Next.js 16, la convention `middleware` s'appelle `proxy` : même
 * fonctionnement, nom plus juste. `next-intl` continue d'exposer sa fabrique sous
 * l'ancien nom, ce qui est sans incidence.
 */
export default createMiddleware(routing);

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
    "/((?!api|_next|_vercel|images|marque|favicon|robots|sitemap).*)",
  ],
};
