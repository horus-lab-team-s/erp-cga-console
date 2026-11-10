"use client";

import { createContext, useActionState, useContext } from "react";

/**
 * L'annonce de la coquille, dans un module léger (10 novembre 2026).
 *
 * ⚠️ SÉPARÉ DE `Coquille.tsx` : un geste qui l'importait tirait toute la coquille (barre
 * latérale, navigation) dans ses tests, que l'environnement de test ne sait pas charger.
 * Ici, rien que le contexte et le crochet ; la coquille fournit le contexte.
 */
export const ContexteAnnonce = createContext<{ annoncer: (texte: string) => void }>({ annoncer: () => {} });

export function useAnnonce() {
  return useContext(ContexteAnnonce).annoncer;
}

/**
 * `useActionState`, dont le résultat s'annonce aussi par la coquille.
 *
 * Pour les gestes dont le bloc quitte l'écran après coup : une ligne de caisse encaissée,
 * une étape franchie, une pièce reçue, une DSF validée. L'annonce part de l'action même,
 * car le bloc est démonté dans le même rendu que le résultat.
 */
export function useActionAnnoncee<E extends { fait: string | null }>(
  action: (precedent: E, donnees: FormData) => Promise<E>,
  initial: E,
): [E, (donnees: FormData) => void, boolean] {
  const annoncer = useAnnonce();
  const [etat, envoyer, enCours] = useActionState<E, FormData>(
    async (precedent, donnees) => {
      const resultat = await action(precedent as E, donnees);
      if (resultat.fait) annoncer(resultat.fait);
      return resultat;
    },
    initial as Awaited<E>,
  );
  return [etat as E, envoyer, enCours];
}
