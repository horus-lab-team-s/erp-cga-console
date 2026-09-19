"use client";

import { useEffect, useRef } from "react";

/**
 * La navigation au clavier de la file d'anomalies (pas 117, maquette vue A).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * « ↑↓ parcourir · ↵ ouvrir la pièce » : le réviseur traite quarante constats d'affilée, et
 * chaque aller-retour à la souris se paie en minutes. Les lignes sont de vrais liens : la
 * tabulation et « Entrée » fonctionnent sans ce composant, qui n'ajoute que les flèches.
 *
 * ⚠️ Rien n'est capturé quand la frappe vise un champ (les filtres sont sur la même page) : un
 * réviseur qui écrit « 2026-07 » dans une date ne doit pas voir la liste défiler sous lui.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FileAuClavier({ nombre }: { nombre: number }) {
  const position = useRef(-1);
  useEffect(() => {
    const lignes = () => Array.from(document.querySelectorAll<HTMLElement>("[data-ligne-anomalie]"));
    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key !== "ArrowDown" && evenement.key !== "ArrowUp") return;
      const cible = evenement.target as HTMLElement | null;
      if (cible && ["INPUT", "SELECT", "TEXTAREA"].includes(cible.tagName)) return;
      const rangees = lignes();
      if (rangees.length === 0) return;
      evenement.preventDefault();
      const actuelle = rangees.findIndex((l) => l === document.activeElement);
      const depart = actuelle >= 0 ? actuelle : position.current;
      const suivante = evenement.key === "ArrowDown" ? depart + 1 : depart - 1;
      position.current = Math.max(0, Math.min(rangees.length - 1, suivante));
      rangees[position.current]?.focus();
    };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [nombre]);
  return null;
}
