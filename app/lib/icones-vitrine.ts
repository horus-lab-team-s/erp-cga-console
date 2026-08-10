/**
 * Tracés d'icônes de la vitrine, repris **à l'identique** des maquettes
 * `Site vitrine CGA` et `Vitrine mobile CGA`.
 *
 * Ils vivent ici et non dans les catalogues de messages : un tracé SVG ne se
 * traduit pas. Les catalogues ne portent que du texte.
 *
 * Jeu unique, linéaire, trait fin — § 10.7. Toutes se dessinent dans une boîte
 * 24 × 24 avec `stroke-width` entre 1,6 et 1,8 selon la taille de rendu.
 */

export const ICONES_VITRINE = {
  // ── Barre utilitaire ────────────────────────────────────────────────────
  telephone:
    "M21 15.5a2 2 0 01-2 2A16 16 0 013 3a2 2 0 012-2h2.5a2 2 0 012 1.7c.1.9.3 1.7.6 2.5a2 2 0 01-.5 2.1L8.5 8.5a14 14 0 006 6l1.2-1.1a2 2 0 012.1-.5c.8.3 1.6.5 2.5.6a2 2 0 011.7 2z",
  courriel: "M3 6l9 6 9-6M3 5h18v14H3z",
  bouclier: "M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6z",

  // ── En-tête ─────────────────────────────────────────────────────────────
  chevronBas: "M7 10l5 5 5-5",
  connexion: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3",
  whatsapp: "M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.7A8.4 8.4 0 1121 11.5z",
  menu: "M4 7h16M4 12h16M4 17h16",
  fermer: "M6 6l12 12M18 6L6 18",
  fleche: "M5 12h14M13 6l6 6-6 6",
  retour: "M19 12H5M11 18l-6-6 6-6",
  soleil:
    "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  lune: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",

  // ── Chiffres clés ───────────────────────────────────────────────────────
  immeuble: "M4 20V8l8-4 8 4v12M9 20v-6h6v6",
  equipe:
    "M16 20v-1.5A3.5 3.5 0 0012.5 15h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M20 20v-1.5a3.5 3.5 0 00-2.5-3.35",
  agrement: "M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6zM9 12l2 2 4-4",
  boutique: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",

  // ── Services ────────────────────────────────────────────────────────────
  creation: "M4 20V7l7-3 7 3v13M9 20v-5h6v5M8 10h.01M12 10h.01M16 10h.01",
  adhesion: "M5 5h14v15H5zM9 10h6M9 14h4M9 3v4M15 3v4",
  ponctuel: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4",
  domiciliation: "M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11zM12 10h.01",
  formations: "M3 8l9-4 9 4-9 4zM7 11v5c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-5",
  conseil:
    "M16 20v-1.5A3.5 3.5 0 0012.5 15h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7",

  // ── Avantages de l'adhésion ─────────────────────────────────────────────
  abattement: "M12 3v18M8 7h6.5a2.5 2.5 0 010 5h-5a2.5 2.5 0 000 5H17",
  exoneration: "M9 12l2 2 4-4M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6z",
  controle: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4",
  dialogue:
    "M16 20v-1.5A3.5 3.5 0 0012.5 15h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7",

  // ── Divers ──────────────────────────────────────────────────────────────
  guillemet: "M7 15h3l2-4V6H6v5h3zM17 15h3l2-4V6h-6v5h3z",
  lieu: "M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11zM12 10h.01",
} as const;

export type NomIcone = keyof typeof ICONES_VITRINE;
