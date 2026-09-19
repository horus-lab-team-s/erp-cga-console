/**
 * Les écarts de constats, côté écran (pas 92) : lectures.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'ÉCRAN NE REJOUE PAS LA POLITIQUE, IL LA LIT
 *
 * Ce qui est écartable, ce qui exige un second regard et qui peut le donner est écrit
 * au référentiel du backend (`Docs/referentiel/ecarts/politique.yaml`). L'écran lit la
 * politique pour **ne pas proposer** ce qui sera refusé : un bouton « Écarter » sur un
 * constat bloquant serait un bouton qui échoue.
 *
 * Il ne décide rien pour autant. Le backend recontrôle chaque geste, et si la politique
 * change entre l'affichage et le clic, c'est sa phrase de refus qui s'affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { appeler, type Constat, type EcartDeConstat, type SeveriteApi } from "./api";
import type { Acces, Permission } from "./acces";

export type RegleDEcart = { ecartable: boolean; second_regard: boolean };

export type PolitiqueDEcart = {
  motif_minimum: number;
  /** Une sévérité absente n'est pas écartable (réglage prudent du backend). */
  par_severite: Partial<Record<SeveriteApi, RegleDEcart>>;
  regles_non_ecartables: string[];
  permissions_du_second_regard: string[];
  /** Le fichier lu, ou « défaut prudent » : affiché pour qu'un refus s'explique. */
  source: string;
};

export function lirePolitiqueDEcart() {
  return appeler<PolitiqueDEcart>("/conformite/ecarts/politique", { authentifie: true });
}

export function lireEcartsEnAttente() {
  return appeler<EcartDeConstat[]>("/conformite/ecarts/en-attente", { authentifie: true });
}

/**
 * La règle qui s'applique à ce constat, **dans l'ordre du backend** : une règle
 * interdite l'emporte sur sa sévérité, et une sévérité absente est fermée.
 *
 * ⚠️ C'est la seule logique recopiée, et elle ne sert qu'à masquer un bouton : si elle
 * divergeait, le backend refuserait le geste avec sa propre phrase.
 */
export function regleDEcartPour(politique: PolitiqueDEcart, constat: Constat): RegleDEcart {
  if (politique.regles_non_ecartables.includes(constat.code_regle)) {
    return { ecartable: false, second_regard: true };
  }
  return politique.par_severite[constat.severite] ?? { ecartable: false, second_regard: true };
}

/** Vrai si la session détient une des permissions que la politique désigne. */
export function peutDonnerLeSecondRegard(acces: Acces, politique: PolitiqueDEcart): boolean {
  return politique.permissions_du_second_regard.some((p) => acces.permissions.includes(p as Permission));
}

export const LIBELLES_STATUT_ECART: Record<EcartDeConstat["statut"], string> = {
  EN_ATTENTE: "En attente du second regard",
  EFFECTIF: "Effectif",
  REFUSE: "Refusé",
  LEVE: "Levé",
};
