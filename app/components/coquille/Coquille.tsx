"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { Entreprise } from "@/app/lib/donnees-demo";
import { BarreLaterale } from "./BarreLaterale";
import { Icone } from "./Icone";

/**
 * E00 · Structure générale.
 *
 * Le cadre dans lequel tous les écrans collaborateur s'inscrivent : barre
 * latérale, zone de travail. L'en-tête est rendu par chaque page, parce que le
 * fil d'Ariane et les actions dépendent de l'écran.
 *
 * Le dossier sélectionné vit ici plutôt que dans l'URL : le collaborateur change
 * de dossier en gardant le même écran, et l'inverse est tout aussi fréquent. Le
 * jour où un lien devra pointer vers « ce dossier sur cet écran », ce sera un
 * paramètre de requête, pas une refonte.
 *
 * Sous 1000 px, la barre latérale sort du flux et devient un tiroir. Ses 240 px
 * fixes prenaient les deux tiers d'un écran de téléphone et il ne restait rien
 * pour travailler.
 *
 * Le bouton d'ouverture est rendu **ici** et non dans `EnteteTravail` : l'en-tête
 * appartient à chaque écran, alors que la barre appartient à la coquille. Le
 * placer là évite d'avoir à modifier chaque page — et d'oublier celles à venir.
 */
const ContexteDossier = createContext<{
  entreprise: Entreprise | null;
  choisir: (entreprise: Entreprise | null) => void;
}>({ entreprise: null, choisir: () => {} });

/** Dossier actuellement sélectionné. `null` = vue consolidée du portefeuille. */
export function useDossier() {
  return useContext(ContexteDossier);
}

export function Coquille({ children }: { children: ReactNode }) {
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  useEffect(() => {
    if (!tiroirOuvert) return;
    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") setTiroirOuvert(false);
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [tiroirOuvert]);

  return (
    <ContexteDossier.Provider value={{ entreprise, choisir: setEntreprise }}>
      <div className="coquille" data-tiroir={tiroirOuvert}>
        <button
          type="button"
          className="coquille__menu"
          onClick={() => setTiroirOuvert((ouvert) => !ouvert)}
          aria-expanded={tiroirOuvert}
          aria-label={tiroirOuvert ? "Fermer le menu" : "Ouvrir le menu"}
        >
          <Icone nom={tiroirOuvert ? "fermer" : "menu"} taille={20} />
        </button>

        {/* Le voile n'existe que tiroir ouvert : un élément permanent à
            `pointer-events: none` intercepterait quand même le survol sur
            certains navigateurs anciens. */}
        {tiroirOuvert && (
          <div
            className="coquille__voile"
            onClick={() => setTiroirOuvert(false)}
            aria-hidden="true"
          />
        )}

        {/* Suivre un lien referme le tiroir : le laisser ouvert masquerait
            l'écran qu'on vient de demander. On l'intercepte au clic plutôt que
            dans un effet observant le chemin — un effet provoquerait un rendu
            de plus à chaque navigation, tiroir fermé compris. */}
        <div
          className="coquille__barre"
          onClick={(evenement) => {
            if ((evenement.target as HTMLElement).closest("a")) setTiroirOuvert(false);
          }}
        >
          <BarreLaterale
            entrepriseCourante={entreprise}
            onChangementEntreprise={setEntreprise}
          />
        </div>
        <div className="zone-travail">{children}</div>
      </div>
    </ContexteDossier.Provider>
  );
}
