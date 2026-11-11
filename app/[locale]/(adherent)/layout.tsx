import type { ReactNode } from "react";

import { PorteDeLEspace, type AvisDAcces } from "@/app/components/adherent/PorteDeLEspace";
import type { Acces } from "@/app/lib/acces";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { lireLesHonoraires } from "@/app/lib/honoraires";
import { exigerAcces } from "@/app/lib/session";
import "@/app/styles/coquille.css";
import "@/app/styles/moderne.css";

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
  const acces = await exigerAcces();
  const avis = await avisDAcces(acces);
  return (
    <div className="espace-adherent" data-espace="adherent">
      <PorteDeLEspace avis={avis}>{children}</PorteDeLEspace>
    </div>
  );
}

/**
 * Réunion du 4 novembre 2026 : l'accès du client averti, ou suspendu, après trois mois
 * d'honoraires impayés. Une lecture qui échoue ne ferme rien : le serveur garde la porte.
 */
async function avisDAcces(acces: Acces): Promise<AvisDAcces | null> {
  if (acces.interne) return null;
  try {
    const { principal } = await monEntrepriseChoisie(acces);
    if (!principal) return null;
    const situation = (await lireLesHonoraires(principal)).situation;
    const etat = situation?.acces_client;
    if (!situation || (etat !== "AVERTI" && etat !== "SUSPENDU") || !situation.acces_suspendu_le) return null;
    return { etat, le: dateCourte(situation.acces_suspendu_le), du: montantFcfa(situation.du) };
  } catch {
    return null;
  }
}
