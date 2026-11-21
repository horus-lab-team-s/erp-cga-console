"use client";

import { Children, useState, type ReactNode } from "react";

/**
 * Dix lignes à la fois, partout (9 novembre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Les listes s'affichaient entières : 28 échéances, 40 pièces, toute la balance.
 * Ce composant reçoit les lignes déjà rendues par la page (serveur) et n'en montre
 * que dix, avec la position (« 11–20 sur 43 ») et la navigation.
 *
 * ⚠️ SOUS LE SEUIL, RIEN NE CHANGE : pas de barre « 1 sur 1 » sous une liste courte.
 *
 * ⚠️ `commeElementDeListe` : dans un `<ul>`/`<ol>`, la navigation doit être un `<li>`,
 * sinon le HTML est invalide et les lecteurs d'écran comptent mal les éléments.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Paginer({
  children,
  parPage = 10,
  commeElementDeListe = false,
}: {
  children: ReactNode;
  parPage?: number;
  commeElementDeListe?: boolean;
}) {
  const elements = Children.toArray(children);
  const [demandee, setDemandee] = useState(0);
  const total = elements.length;
  if (total <= parPage) return <>{elements}</>;

  const pages = Math.ceil(total / parPage);
  const page = Math.min(demandee, pages - 1);
  const debut = page * parPage;
  const fin = Math.min(debut + parPage, total);

  const navigation = (
    <nav className="pagination" aria-label="Pagination de la liste">
      <span className="pagination__position" aria-live="polite">
        {debut + 1}–{fin} sur {total}
      </span>
      <span className="pagination__boutons">
        <button type="button" onClick={() => setDemandee(page - 1)} disabled={page === 0} aria-label="Page précédente">
          ‹ Précédent
        </button>
        {numeros(page, pages).map((n, i) =>
          n === null ? (
            <span key={`ellipse-${i}`} className="pagination__ellipse" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => setDemandee(n)}
              aria-current={n === page ? "page" : undefined}
              aria-label={`Page ${n + 1}`}
            >
              {n + 1}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => setDemandee(page + 1)}
          disabled={page === pages - 1}
          aria-label="Page suivante"
        >
          Suivant ›
        </button>
      </span>
    </nav>
  );

  return (
    <>
      {elements.slice(debut, fin)}
      {commeElementDeListe ? <li className="pagination__element">{navigation}</li> : navigation}
    </>
  );
}

/** Les numéros affichés : premier, dernier, et deux voisins de la page ; `null` = ellipse. */
export function numeros(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i);
  const garde = new Set([0, pages - 1, page - 1, page, page + 1].filter((n) => n >= 0 && n < pages));
  const tries = [...garde].sort((a, b) => a - b);
  const resultat: (number | null)[] = [];
  tries.forEach((n, i) => {
    if (i > 0 && n - tries[i - 1] > 1) resultat.push(null);
    resultat.push(n);
  });
  return resultat;
}
