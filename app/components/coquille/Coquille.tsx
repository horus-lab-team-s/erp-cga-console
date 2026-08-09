"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { Entreprise } from "../../lib/donnees-demo";
import { BarreLaterale } from "./BarreLaterale";

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

  return (
    <ContexteDossier.Provider value={{ entreprise, choisir: setEntreprise }}>
      <div className="coquille">
        <BarreLaterale
          entrepriseCourante={entreprise}
          onChangementEntreprise={setEntreprise}
        />
        <div className="zone-travail">{children}</div>
      </div>
    </ContexteDossier.Provider>
  );
}
