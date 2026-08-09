"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { UTILISATEUR } from "../../lib/donnees-demo";
import {
  lireModificateur,
  modificateurParDefaut,
  souscrirePlateforme,
} from "../../lib/preferences";
import { Icone } from "./Icone";

export type Miette = { libelle: string; href?: string };

/**
 * En-tête de la zone de travail — § 6.1 : fil d'Ariane, recherche globale, accès
 * aux notifications, nom de l'utilisateur.
 */
export function EnteteTravail({
  miettes,
  notifications = 0,
}: {
  miettes: Miette[];
  notifications?: number;
}) {
  // Le raccourci affiché doit correspondre au clavier réel.
  const modificateur = useSyncExternalStore(
    souscrirePlateforme,
    lireModificateur,
    modificateurParDefaut,
  );

  return (
    <header className="entete">
      <nav className="fil-ariane" aria-label="Fil d'Ariane">
        {miettes.map((miette, index) => {
          const dernier = index === miettes.length - 1;
          return (
            <span key={`${miette.libelle}-${index}`} style={{ display: "contents" }}>
              {index > 0 && <span aria-hidden="true">/</span>}
              {miette.href && !dernier ? (
                <Link href={miette.href}>{miette.libelle}</Link>
              ) : (
                <span className="fil-ariane__actuel" aria-current={dernier ? "page" : undefined}>
                  {miette.libelle}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <button type="button" className="recherche-globale">
        <Icone nom="recherche" taille={15} />
        Recherche globale
        <kbd className="raccourci">{modificateur} K</kbd>
      </button>

      <button
        type="button"
        className="entete__action"
        aria-label={
          notifications > 0 ? `Notifications, ${notifications} non lues` : "Notifications"
        }
      >
        <Icone nom="notifications" taille={17} />
        {notifications > 0 && <span className="entete__point" />}
      </button>

      <div className="entete__utilisateur">
        <span className="entete__avatar" aria-hidden="true">
          {UTILISATEUR.initiales}
        </span>
        {UTILISATEUR.nom}
      </div>
    </header>
  );
}
