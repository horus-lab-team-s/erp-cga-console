import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const avecInternationalisation = createNextIntlPlugin("./i18n/request.ts");

/** La racine du workspace pnpm — le dossier parent, qui porte `pnpm-lock.yaml`
 *  et le `node_modules` hissé. */
const racineWorkspace = path.resolve(import.meta.dirname, "..");

const nextConfig: NextConfig = {
  turbopack: {
    // Sans cette borne, Turbopack remonte l'arborescence à la recherche d'un
    // workspace et sort du dépôt sur les postes qui portent un
    // pnpm-workspace.yaml à la racine du profil utilisateur.
    root: racineWorkspace,
  },

  // ── Déploiement ───────────────────────────────────────────────────────────
  //
  // `standalone` fait écrire à `next build` un `.next/standalone/` autonome :
  // un `server.js` minimal et les seuls fichiers de `node_modules` que le
  // traçage a jugés nécessaires. L'image de production n'embarque donc aucun
  // gestionnaire de paquets et aucune dépendance de développement.
  //
  // ⚠️ Sans cela, une image Next exige tout `node_modules` — plusieurs
  // centaines de mégaoctets dont l'essentiel ne sert qu'à construire, et qui
  // élargit d'autant la surface exposée.
  output: "standalone",

  // ⚠️ Indispensable ici : par défaut, le traçage prend le dossier du projet
  // pour racine et **ignore tout ce qui est au-dessus**. Avec pnpm, les
  // dépendances réelles sont dans le `node_modules` hissé du parent : sans
  // cette ligne, l'image se construit sans erreur et le serveur meurt au
  // premier import manquant, à l'exécution.
  outputFileTracingRoot: racineWorkspace,

  // ── Dépôt de pièces (pas 81) ─────────────────────────────────────────────
  //
  // Une action serveur refuse par défaut tout corps de plus d'un mégaoctet. Une
  // facture photographiée au téléphone le dépasse souvent, et le refus arrivait
  // avant même d'atteindre le backend, sans message lisible. La limite suit celle
  // du backend (`TAILLE_MAXIMALE`, 20 Mo), plus la marge de l'enveloppe multipart.
  // ⚠️ Si l'une change, l'autre doit suivre : un écart ferait refuser par Next ce
  // que le backend accepte, ou l'inverse.
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
};

export default avecInternationalisation(nextConfig);
