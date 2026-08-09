import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Racine du workspace pnpm — le dossier parent, qui porte pnpm-lock.yaml et le
    // node_modules hissé. Sans cette borne, Turbopack remonte l'arborescence à la
    // recherche d'un workspace et sort du dépôt sur les postes qui portent un
    // pnpm-workspace.yaml à la racine du profil utilisateur.
    root: path.resolve(import.meta.dirname, ".."),
  },
};

export default nextConfig;
