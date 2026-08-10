/**
 * Préférences persistées, exposées comme des **magasins externes**.
 *
 * `localStorage` et `navigator` sont des systèmes extérieurs à React. Les lire
 * dans un `useEffect` puis appeler `setState` provoque un rendu en cascade et un
 * clignotement visible au chargement. `useSyncExternalStore` est fait pour cela :
 * il rend une valeur serveur, puis la valeur réelle du client, en une seule passe.
 */

const CLE_REPLI = "cga.barre-repliee";

const abonnes = new Set<() => void>();
let cacheRepli: boolean | null = null;

function notifier() {
  for (const rappel of abonnes) rappel();
}

export function souscrireRepli(rappel: () => void) {
  abonnes.add(rappel);
  // Un même utilisateur peut avoir deux onglets ouverts sur deux dossiers : la
  // préférence de repli doit les suivre tous les deux.
  const surStockage = (evenement: StorageEvent) => {
    if (evenement.key === CLE_REPLI) {
      cacheRepli = evenement.newValue === "1";
      notifier();
    }
  };
  window.addEventListener("storage", surStockage);
  return () => {
    abonnes.delete(rappel);
    window.removeEventListener("storage", surStockage);
  };
}

export function lireRepli(): boolean {
  if (cacheRepli === null) {
    cacheRepli = window.localStorage.getItem(CLE_REPLI) === "1";
  }
  return cacheRepli;
}

/** Valeur rendue côté serveur : la barre est dépliée par défaut. */
export function repliParDefaut(): boolean {
  return false;
}

export function basculerRepli() {
  cacheRepli = !lireRepli();
  window.localStorage.setItem(CLE_REPLI, cacheRepli ? "1" : "0");
  notifier();
}

/**
 * Modificateur clavier de la plateforme. Afficher « Ctrl K » à quelqu'un sur
 * macOS le laisserait chercher.
 */
export function souscrirePlateforme() {
  // La plateforme ne change pas en cours de session : rien à observer.
  return () => {};
}

export function lireModificateur(): string {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

export function modificateurParDefaut(): string {
  return "Ctrl";
}

// ── Thème clair / sombre ──────────────────────────────────────────────────────

const CLE_THEME = "cga.theme";

export type Theme = "clair" | "sombre";

const abonnesTheme = new Set<() => void>();
let cacheTheme: Theme | null = null;

/**
 * Le thème est appliqué sur `<html data-theme>` par un script inline exécuté avant
 * le premier rendu — voir `app/[locale]/layout.tsx`. On lit donc l'attribut, et non
 * `localStorage` : c'est lui qui fait foi à l'écran, et cela évite toute divergence
 * entre ce que React croit et ce que l'utilisateur voit.
 */
export function souscrireTheme(rappel: () => void) {
  abonnesTheme.add(rappel);
  const surStockage = (evenement: StorageEvent) => {
    if (evenement.key === CLE_THEME) {
      cacheTheme = evenement.newValue === "sombre" ? "sombre" : "clair";
      document.documentElement.dataset.theme = cacheTheme;
      abonnesTheme.forEach((f) => f());
    }
  };
  window.addEventListener("storage", surStockage);
  return () => {
    abonnesTheme.delete(rappel);
    window.removeEventListener("storage", surStockage);
  };
}

export function lireTheme(): Theme {
  if (cacheTheme === null) {
    cacheTheme = document.documentElement.dataset.theme === "sombre" ? "sombre" : "clair";
  }
  return cacheTheme;
}

/** Valeur rendue côté serveur : le clair, faute de savoir. */
export function themeParDefaut(): Theme {
  return "clair";
}

export function basculerTheme() {
  cacheTheme = lireTheme() === "sombre" ? "clair" : "sombre";
  document.documentElement.dataset.theme = cacheTheme;
  window.localStorage.setItem(CLE_THEME, cacheTheme);
  abonnesTheme.forEach((f) => f());
}
