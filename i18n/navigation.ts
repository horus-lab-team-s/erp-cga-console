import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Navigation consciente de la langue.
 *
 * On importe `Link`, `redirect`, `usePathname` et `useRouter` **d'ici** et jamais de
 * `next/link` ou `next/navigation` : ces enveloppes ajoutent le préfixe de langue
 * courant. Un `next/link` oublié renverrait un anglophone vers la version française.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
