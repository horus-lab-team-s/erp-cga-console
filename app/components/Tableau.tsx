/**
 * Primitives de tableau dense — § 10.4.
 *
 * Ligne 36 px, en-tête 30 px sur `brand-indigo-100`, séparation par filet
 * `line-100` et **jamais par ombre portée**. Les colonnes sont déclarées une
 * seule fois et partagées par l'en-tête et les lignes : c'est la seule façon
 * d'éviter qu'elles se désalignent au premier ajout de colonne.
 */

import type { CSSProperties, ReactNode } from "react";

export type Colonne = {
  cle: string;
  libelle: string;
  /** Fraction ou largeur fixe pour `grid-template-columns`. */
  largeur: string;
  /** Montants, dates, délais : alignés à droite — § 5. */
  aDroite?: boolean;
};

export function Panneau({
  titre,
  aide,
  action,
  children,
  style,
}: {
  titre: string;
  aide?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: "var(--surface)",
        ...style,
      }}
    >
      <div
        style={{
          flex: "none",
          // ⚠️ `minHeight` et non `height`, et le retour à la ligne permis (pas 100) : à
          // largeur de téléphone, un titre long (« Ce qui compose le risque ») suivi de son
          // aide ne tient pas sur une ligne. Avec une hauteur fixe et un interligne de 1, le
          // texte débordait sur la bordure, sur tous les écrans. Sur ordinateur, l'en-tête
          // garde ses 40 px.
          minHeight: 40,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "4px 10px",
          padding: "8px 14px",
          borderBottom: "1px solid var(--line-200)",
        }}
      >
        <h2 style={{ margin: 0, font: "600 16px/1.25 var(--police-texte)", color: "var(--ink-900)" }}>
          {titre}
        </h2>
        {aide && (
          <span style={{ font: "400 12px/1.35 var(--police-texte)", color: "var(--ink-500)" }}>
            {aide}
          </span>
        )}
        {action && <span style={{ marginLeft: "auto", flex: "none" }}>{action}</span>}
      </div>
      {/* ⚠️ `overflowX: auto` EN PLUS DU DÉFILEMENT VERTICAL.
          Mesuré dans un cadre de 390 px : le tableau de bord comptait 210
          coupures, dont les EN-TÊTES eux-mêmes — « Entreprise », « Obligation ».
          Six colonnes de données comptables ne tiennent pas dans la largeur d'un
          téléphone, et aucun repli n'y changera rien : il faut laisser le
          tableau garder sa largeur utile et le faire défiler.
          Les deux ombres apparaissent du côté où le contenu continue. Sans
          elles, la colonne de droite se coupe sans aucun signe et le lecteur
          croit le tableau tronqué. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "auto",
          background:
            "linear-gradient(to right, var(--surface) 30%, rgb(0 0 0 / 0%)) left center / 24px 100% no-repeat local," +
            "linear-gradient(to left, var(--surface) 30%, rgb(0 0 0 / 0%)) right center / 24px 100% no-repeat local," +
            "radial-gradient(farthest-side at 0 50%, rgb(26 21 35 / 16%), rgb(0 0 0 / 0%)) left center / 12px 100% no-repeat scroll," +
            "radial-gradient(farthest-side at 100% 50%, rgb(26 21 35 / 16%), rgb(0 0 0 / 0%)) right center / 12px 100% no-repeat scroll",
        }}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * La largeur en dessous de laquelle un tableau cesse d'être lisible.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI UN TABLEAU DENSE NE SE REPLIE PAS SUR UN TÉLÉPHONE
 *
 * Mesuré dans un cadre de 390 px : le tableau de bord comptait **210 coupures**,
 * le référentiel 120, la boîte de réception 42. Les EN-TÊTES eux-mêmes étaient
 * tronqués — « Entreprise », « Obligation » — ce qui rend le tableau
 * indéchiffrable : on ne sait plus ce que chaque colonne contient.
 *
 * Six colonnes de données comptables ne tiennent pas dans 390 px, et aucun
 * repli n'y changera rien. Ce qu'il faut, c'est laisser le tableau garder sa
 * largeur utile et le faire DÉFILER, avec une ombre qui prévient qu'il continue
 * — le dossier de design décrit ce motif à sa section sur les tableaux.
 *
 * Le calcul : les colonnes fixes gardent leur valeur, les colonnes en
 * fractions reçoivent un plancher de 150 px, et l'on ajoute les écarts.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function largeurMinimale(colonnes: Colonne[]): number {
  const PLANCHER_FRACTION = 150;
  const ECART = 8;
  const MARGE = 28;
  const total = colonnes.reduce((somme, c) => {
    const px = /^(\d+(?:\.\d+)?)px$/.exec(c.largeur.trim());
    return somme + (px ? Number(px[1]) : PLANCHER_FRACTION);
  }, 0);
  return Math.round(total + ECART * (colonnes.length - 1) + MARGE);
}

export function EnteteTableau({ colonnes }: { colonnes: Colonne[] }) {
  return (
    <div
      role="row"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        display: "grid",
        gridTemplateColumns: colonnes.map((c) => c.largeur).join(" "),
        // ⚠️ En dessous, les colonnes s'écrasent au point que les EN-TÊTES se
        // tronquent : on ne sait plus ce que chaque colonne contient. Le cadre
        // parent fait défiler.
        minWidth: largeurMinimale(colonnes),
        alignItems: "center",
        height: "var(--entete-tableau)",
        padding: "0 14px",
        gap: 8,
        background: "var(--brand-indigo-100)",
        borderBottom: "1px solid var(--line-200)",
        font: "600 12px/1 var(--police-texte)",
        letterSpacing: "var(--interlettrage-entete)",
        textTransform: "uppercase",
        color: "var(--ink-500)",
      }}
    >
      {colonnes.map((c) => (
        <span key={c.cle} style={{ textAlign: c.aDroite ? "right" : "left" }}>
          {c.libelle}
        </span>
      ))}
    </div>
  );
}

export function LigneTableau({
  colonnes,
  children,
  ton = "normal",
  hauteur = "var(--ligne-tableau)",
}: {
  colonnes: Colonne[];
  children: ReactNode;
  /** `alerte` teinte la ligne entière : réservé à ce qui bloque réellement. */
  ton?: "normal" | "alterne" | "alerte" | "selection";
  hauteur?: string;
}) {
  const fonds = {
    normal: "var(--surface)",
    alterne: "var(--surface-alt)",
    alerte: "var(--danger-100)",
    selection: "var(--brand-magenta-100)",
  };
  return (
    <div
      role="row"
      style={{
        display: "grid",
        gridTemplateColumns: colonnes.map((c) => c.largeur).join(" "),
        // Même largeur utile que l'en-tête, sans quoi les colonnes se
        // décaleraient l'une par rapport à l'autre pendant le défilement.
        minWidth: largeurMinimale(colonnes),
        alignItems: "center",
        minHeight: hauteur,
        // ⚠️ Une marge verticale, depuis que les colonnes de texte peuvent tenir
        // sur deux lignes : sans elle, la seconde ligne touche le filet du bas.
        // `minHeight` garde les lignes d'une seule ligne à la hauteur voulue.
        padding: "8px 14px",
        gap: 8,
        borderBottom: "1px solid var(--line-100)",
        background: fonds[ton],
        font: "400 var(--taille-tableau)/1.3 var(--police-texte)",
        color: "var(--ink-900)",
      }}
    >
      {children}
    </div>
  );
}

/** Une cellule : sur une ligne par défaut, sur deux quand le texte le demande. */
export function Cellule({
  children,
  aDroite = false,
  tabulaire = false,
  couleur,
  gras = false,
  titre,
  lignes,
}: {
  children: ReactNode;
  aDroite?: boolean;
  tabulaire?: boolean;
  couleur?: string;
  gras?: boolean;
  titre?: string;
  /**
   * Combien de lignes le texte peut occuper, plutôt qu'une coupure.
   *
   * ⚠️ MESURÉ SUR LE TABLEAU DE BORD : 105 coupures, 8 textes distincts. La
   * pire perdait 187 px sur 329 — « Règlement autre qu'en espèces au-delà du
   * seuil… ». Une dénomination sociale et un libellé d'obligation sont ce qui
   * identifie la ligne ; les tronquer rend le tableau illisible, et le comptable
   * doit survoler chaque ligne pour savoir de quoi elle parle.
   *
   * ⚠️ Deux lignes suffisent aux dénominations et aux obligations. Les libellés
   * de RÈGLE en demandent trois : « Règlement autre qu'en espèces au-delà du
   * seuil de déductibilité » réclame 329 px, et la colonne qui l'accueille n'en
   * offre que 150.
   *
   * Réservé aux colonnes de texte. Un montant, une date ou un délai tiennent sur
   * une ligne par construction, et les faire passer à deux désalignerait la
   * colonne.
   */
  lignes?: 2 | 3;
}) {
  return (
    <span
      title={titre}
      style={{
        minWidth: 0,
        overflow: "hidden",
        textAlign: aDroite ? "right" : "left",
        fontVariantNumeric: tabulaire ? "tabular-nums" : undefined,
        fontWeight: gras ? 600 : undefined,
        color: couleur,
        ...(lignes
          ? {
              // `line-clamp` coupe à la LIGNE, pas au caractère : le texte
              // s'arrête sur un mot entier, et les points de suspension ne
              // paraissent qu'au-delà de deux lignes.
              display: "-webkit-box",
              WebkitBoxOrient: "vertical" as const,
              WebkitLineClamp: lignes,
              whiteSpace: "normal",
              lineHeight: 1.25,
              wordBreak: "break-word" as const,
            }
          : { textOverflow: "ellipsis", whiteSpace: "nowrap" }),
      }}
    >
      {children}
    </span>
  );
}

/**
 * État vide. Exigé sur chaque écran — § 5, « états systématiques ».
 * Un tableau vide sans explication laisse croire à une panne.
 */
export function EtatVide({ titre, detail }: { titre: string; detail?: string }) {
  return (
    <div
      style={{
        padding: "36px 24px",
        textAlign: "center",
        font: "400 13px/1.7 var(--police-texte)",
        color: "var(--ink-500)",
      }}
    >
      <strong style={{ display: "block", color: "var(--ink-900)", fontWeight: 600 }}>
        {titre}
      </strong>
      {detail}
    </div>
  );
}

/** État d'erreur, avec le motif réel — jamais « une erreur est survenue ». */
export function EtatErreur({ titre, detail }: { titre: string; detail: string }) {
  return (
    <div
      role="alert"
      style={{
        margin: 14,
        padding: "14px 16px",
        borderRadius: "var(--rayon)",
        border: "1px solid var(--danger)",
        background: "var(--danger-100)",
        font: "400 13px/1.6 var(--police-texte)",
        color: "var(--ink-900)",
      }}
    >
      <strong style={{ display: "block", color: "var(--danger)" }}>⬣ {titre}</strong>
      {detail}
    </div>
  );
}
