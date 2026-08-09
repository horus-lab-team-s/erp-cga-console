/**
 * Système de gravité — § 9 du dossier de design.
 *
 * RÈGLE ABSOLUE : la couleur ne porte jamais seule l'information. Le glyphe et le
 * libellé sont toujours présents, y compris dans les tableaux les plus denses.
 * C'est pourquoi ce composant n'expose aucune variante « pastille de couleur
 * seule » : elle serait inaccessible et illisible en impression noir et blanc.
 */

export type Severite =
  | "BLOQUANT"
  | "MAJEUR"
  | "AVERTISSEMENT"
  | "INFORMATION"
  | "CONFORME";

type Apparence = {
  glyphe: string;
  libelle: string;
  libelleCourt: string;
  fond: string;
  texte: string;
  bordure: string;
};

/** Traitement visuel du § 9, tableau des cinq niveaux. */
export const APPARENCE: Record<Severite, Apparence> = {
  BLOQUANT: {
    glyphe: "⬣",
    libelle: "Bloquant",
    libelleCourt: "Bloquant",
    fond: "var(--danger)",
    texte: "#ffffff",
    bordure: "var(--danger)",
  },
  MAJEUR: {
    glyphe: "▲",
    libelle: "Majeur",
    libelleCourt: "Majeur",
    fond: "var(--warning)",
    texte: "#ffffff",
    bordure: "var(--warning)",
  },
  AVERTISSEMENT: {
    glyphe: "△",
    libelle: "Avertissement",
    libelleCourt: "Avertis.",
    // --warning ne sert jamais de texte à 13 px sur blanc (contraste 4,3:1) :
    // ici il est posé sur --warning-100. Voir § 10.8.
    fond: "var(--warning-100)",
    texte: "var(--warning)",
    bordure: "var(--warning)",
  },
  INFORMATION: {
    glyphe: "ⓘ",
    libelle: "Information",
    libelleCourt: "Info",
    fond: "var(--brand-indigo-100)",
    texte: "var(--brand-indigo-700)",
    bordure: "var(--brand-indigo-100)",
  },
  CONFORME: {
    glyphe: "✓",
    libelle: "Conforme",
    libelleCourt: "Conforme",
    fond: "var(--success-100)",
    texte: "var(--success)",
    bordure: "var(--success-100)",
  },
};

export function BadgeGravite({
  severite,
  court = false,
}: {
  severite: Severite;
  /** Forme abrégée pour les colonnes étroites. Le glyphe reste présent. */
  court?: boolean;
}) {
  const a = APPARENCE[severite];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
        padding: "3px 8px",
        borderRadius: "var(--rayon-pilule)",
        border: `1px solid ${a.bordure}`,
        background: a.fond,
        color: a.texte,
        font: "600 11px/1.3 var(--police-texte)",
      }}
    >
      <span aria-hidden="true">{a.glyphe}</span>
      {court ? a.libelleCourt : a.libelle}
    </span>
  );
}

/**
 * Bandeau de verdict de l'écran E02 — le premier élément que lit le comptable.
 * Il annonce la gravité maximale **et la conséquence fiscale chiffrée**, en
 * langage clair : « Anomalie majeure — TVA non déductible : 379 350 FCFA ».
 */
export function BandeauVerdict({
  severite,
  titre,
  detail,
}: {
  severite: Severite;
  titre: string;
  detail: string;
}) {
  const a = APPARENCE[severite];
  const surFondPlein = severite === "BLOQUANT" || severite === "MAJEUR";
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: "var(--rayon)",
        border: `1px solid ${a.bordure}`,
        background: a.fond,
        color: surFondPlein ? "#ffffff" : "var(--ink-900)",
      }}
    >
      <span aria-hidden="true" style={{ font: "600 20px/1 var(--police-texte)" }}>
        {a.glyphe}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", font: "600 18px/1.3 var(--police-titre)" }}>
          {titre}
        </span>
        <span
          style={{
            display: "block",
            font: "400 12.5px/1.5 var(--police-texte)",
            opacity: surFondPlein ? 0.9 : 1,
          }}
        >
          {detail}
        </span>
      </span>
    </div>
  );
}
