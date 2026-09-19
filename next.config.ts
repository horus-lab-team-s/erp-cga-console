import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const avecInternationalisation = createNextIntlPlugin("./i18n/request.ts");

/** La racine de ce dépôt.
 *
 *  ⚠️ C'était le dossier PARENT, du temps du monodépôt : le workspace pnpm y
 *  portait le verrou et le `node_modules` hissé. Depuis la scission, ce dépôt
 *  est seul et installe ses dépendances chez lui. Laisser la racine au-dessus
 *  avait deux effets, tous deux discrets :
 *
 *    · le traçage sortait du dépôt et recopiait le chemin du dossier parent
 *      dans `.next/standalone/`, si bien que `server.js` n'était plus là où on
 *      l'attendait — et, dans une image, à un endroit qui dépend du répertoire
 *      de construction ;
 *    · Turbopack remontait chez le voisin, c'est-à-dire dans un autre dépôt du
 *      produit.
 */
const racineDuDepot = path.resolve(import.meta.dirname);

const nextConfig: NextConfig = {
  turbopack: {
    // Sans cette borne, Turbopack remonte l'arborescence à la recherche d'un
    // workspace et sort du dépôt : sur les postes qui portent un
    // pnpm-workspace.yaml à la racine du profil utilisateur, et depuis la
    // scission, jusque chez les dépôts voisins du produit.
    root: racineDuDepot,
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

  // Le traçage prend le dossier du projet pour racine et ignore tout ce qui est
  // au-dessus. C'est désormais ce qu'il faut : les dépendances de ce dépôt sont
  // dans son propre `node_modules`. ⚠️ Du temps du monodépôt, cette ligne
  // désignait le parent, faute de quoi l'image se construisait sans erreur et le
  // serveur mourait au premier import manquant, à l'exécution.
  outputFileTracingRoot: racineDuDepot,

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
