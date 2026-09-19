"use client";

import { useEffect, useRef, useState } from "react";

/**
 * La palette des comptes, ouverte par F2 depuis un champ « Compte » (pas 110).
 * Maquette « Parcours comptable », vue E, UC11 : « trouver le bon compte sans quitter le clavier ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI VIENT D'ABORD
 *
 * « Les comptes déjà utilisés dans le dossier passent avant le plan SYSCOHADA général. » L'ordre
 * des comptes utilisés vient du backend (du plus au moins employé) ; la palette ne compte rien.
 * On tape un début de numéro ou un mot de l'intitulé ; ↑ et ↓ déplacent, Entrée choisit,
 * Échap referme et rend la main au champ.
 *
 * ⚠️ « Ctrl+N crée un compte auxiliaire » n'est pas fait : ouvrir un compte au plan est un acte
 * de paramétrage, que le backend refuse encore à la saisie (un compte inventé par faute de
 * frappe ferait des comptes jumeaux). La palette le dit plutôt que de promettre le raccourci.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type EntreeDePalette = { numero: string; intitule: string; lignes: number | null };

export function PaletteDeComptes({
  entrees,
  onChoisir,
  onFermer,
}: {
  /** Les comptes utilisés d'abord (avec leur nombre de lignes), puis le reste du plan. */
  entrees: EntreeDePalette[];
  onChoisir: (numero: string) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [rang, setRang] = useState(0);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => champ.current?.focus(), []);

  const terme = recherche.trim().toLowerCase();
  const trouvees = (terme ? entrees.filter((e) => e.numero.startsWith(terme) || e.intitule.toLowerCase().includes(terme)) : entrees).slice(0, 12);
  const actif = Math.min(rang, Math.max(trouvees.length - 1, 0));

  function clavier(evenement: React.KeyboardEvent<HTMLInputElement>) {
    if (evenement.key === "ArrowDown") {
      evenement.preventDefault();
      setRang(Math.min(actif + 1, trouvees.length - 1));
    } else if (evenement.key === "ArrowUp") {
      evenement.preventDefault();
      setRang(Math.max(actif - 1, 0));
    } else if (evenement.key === "Enter") {
      evenement.preventDefault();
      if (trouvees[actif]) onChoisir(trouvees[actif].numero);
    } else if (evenement.key === "Escape") {
      evenement.preventDefault();
      onFermer();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Palette des comptes"
      style={{ position: "absolute", zIndex: 20, marginTop: 4, width: "min(420px, 90vw)", background: "var(--surface)", border: "1px solid var(--line-300)", borderRadius: "var(--rayon)", boxShadow: "var(--ombre-modale)", padding: 8 }}
    >
      <input
        ref={champ}
        type="search"
        aria-label="Rechercher un compte"
        value={recherche}
        onChange={(e) => {
          setRecherche(e.target.value);
          setRang(0);
        }}
        onKeyDown={clavier}
        placeholder="401 quinc…"
        style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", font: "400 13px/1.4 var(--police-texte)" }}
      />
      <ul role="listbox" style={{ listStyle: "none", margin: "6px 0 0", padding: 0, maxHeight: 280, overflowY: "auto" }}>
        {trouvees.length === 0 && <li style={{ padding: "6px 8px", font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>Aucun compte ne correspond.</li>}
        {trouvees.map((e, i) => (
          <li
            key={e.numero}
            role="option"
            aria-selected={i === actif}
            onMouseDown={(evenement) => {
              evenement.preventDefault();
              onChoisir(e.numero);
            }}
            style={{ display: "flex", gap: 8, padding: "5px 8px", borderRadius: "var(--rayon-petit)", cursor: "pointer", background: i === actif ? "var(--brand-magenta-100)" : "transparent", font: "400 12.5px/1.4 var(--police-texte)" }}
          >
            <strong style={{ width: 64, fontVariantNumeric: "tabular-nums" }}>{e.numero}</strong>
            <span style={{ flex: 1, minWidth: 0 }}>{e.intitule}</span>
            <span style={{ color: "var(--ink-500)", fontSize: 11 }}>{e.lignes ? `utilisé ${e.lignes} fois` : "plan général"}</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "6px 0 0", font: "400 11px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>↵ choisit · Échap ferme · un compte absent s&rsquo;ouvre au plan, pas depuis la saisie</p>
    </div>
  );
}
