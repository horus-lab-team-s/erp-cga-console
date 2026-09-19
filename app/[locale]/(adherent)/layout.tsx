import type { ReactNode } from "react";

import { exigerAcces } from "@/app/lib/session";
import "@/app/styles/coquille.css";

/**
 * Coquille de l'espace adhérent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN GROUPE DE ROUTES DISTINCT, ET CE N'EST PAS UNE QUESTION DE THÈME
 *
 * L'espace collaborateur est dense, fait pour un écran large et un clavier :
 * des tableaux de vingt lignes, des raccourcis, une barre latérale de seize
 * entrées. L'adhérent, lui, ouvre son téléphone, entre deux clients, pour savoir
 * s'il doit quelque chose et déposer une facture. Ce ne sont pas les mêmes
 * gestes, et les servir depuis les mêmes écrans obligerait à faire des deux
 * moitiés un compromis.
 *
 * `data-espace="adherent"` porte les cibles de 44 px et l'espacement large.
 *
 * CE QU'IL NE VOIT PAS, ET POURQUOI
 *
 * Pas de comptabilité. Le rôle `ADHERENT` ne porte pas `LIRE_COMPTABILITE`, et
 * l'API le refuserait : un solde intermédiaire lu comme définitif conduit à des
 * décisions de trésorerie fondées sur un brouillon. Il verra ses comptes quand
 * l'exercice sera arrêté — c'est un écran à construire, pas un droit à ajouter.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function LayoutAdherent({ children }: { children: ReactNode }) {
  // Même garde que l'espace collaborateur : rien n'est rendu sans session.
  await exigerAcces();
  return (
    <div className="espace-adherent" data-espace="adherent">
      {children}
    </div>
  );
}
