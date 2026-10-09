import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Le banc d'essai de l'interface.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ IL N'Y EN AVAIT AUCUN, ET C'ÉTAIT LE PLUS GROS TROU DU PROJET.
 *
 * Le serveur a 3 814 cas, le téléphone 224. Les deux interfaces en avaient
 * ZÉRO : leur `package.json` ne connaissait que `dev`, `build`, `start`,
 * `lint`. Une compilation réussie dit « le code tient debout » — elle ne lit
 * pas un montant, ne pose pas un témoin, ne refuse rien.
 *
 * ⚠️ NI GREFFON REACT, NI RÉSOLVEUR DE CHEMINS, ET C'EST DÉLIBÉRÉ.
 *
 * Les deux existent et font le travail en une ligne. Ils tirent chacun une
 * version de Vite DIFFÉRENTE de celle qu'emploie vitest, et les deux jeux de
 * types deviennent incompatibles : `npx tsc --noEmit` échoue sur ce fichier
 * même si tous les cas passent. On peut arbitrer à coups de versions épinglées ;
 * ça se défait à la première mise à jour.
 *
 * Les deux lignes qu'ils apportaient sont écrites ici :
 *
 *   · l'alias `@/` — trois lignes, lues du même endroit que `tsconfig.json` ;
 *   · la transformation du JSX — un réglage, `jsx: "automatic"`, qui suffit
 *     hors du navigateur : le rechargement à chaud que le greffon apporte en
 *     plus ne sert à rien dans un cas d'essai.
 *
 * Deux dépendances de moins à surveiller sur un produit qui manipule la
 * comptabilité d'un tiers, c'est le bon compromis.
 *
 * ⚠️ `environment: "jsdom"` PARTOUT, et c'est un choix. Une partie des fichiers
 * testés ne touche pas au DOM et tournerait plus vite sous Node. Les séparer
 * demanderait de classer chaque fichier, et le jour où l'on se trompe le cas
 * échoue pour une raison étrangère à ce qu'il mesure.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default defineConfig({
  resolve: {
    // Le même alias que `tsconfig.json` : `@/app/lib/api` → `./app/lib/api`.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  esbuild: {
    // React 19, transformation automatique : aucun `import React` à écrire.
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // ⚠️ `app/` seulement : sans cette borne, vitest parcourt `node_modules` et
    // `.next`, y trouve des fichiers nommés `*.test.js` appartenant à des
    // dépendances, et les exécute.
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
  },
});
