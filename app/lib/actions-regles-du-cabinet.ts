"use server";

/**
 * Éprouver, proposer et trancher une règle construite (pas 97).
 *
 * La construction voyage en JSON dans un champ caché : l'écran assemble des conditions en
 * clair, jamais un prédicat. L'essai n'enregistre rien ; la proposition rejoue l'essai côté
 * serveur et le conserve, pour que le valideur tranche sur le même résultat.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { PropositionDeRegle } from "./regles-du-cabinet";
import type { EtatActe } from "./saisie";

export type EtatEssaiDeRegle = {
  echec: string | null;
  essai: { phrase: string; eprouvees: number; reagit_sur: string[]; reagit_partout: boolean } | null;
};

function construction(donnees: FormData): unknown {
  return JSON.parse(String(donnees.get("construction") ?? "{}"));
}

export async function eprouverUneRegle(_precedent: EtatEssaiDeRegle, donnees: FormData): Promise<EtatEssaiDeRegle> {
  try {
    const essai = await appeler<NonNullable<EtatEssaiDeRegle["essai"]>>("/conformite/constructeur/essai", {
      methode: "POST",
      authentifie: true,
      corps: construction(donnees),
    });
    return { echec: null, essai };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, essai: null };
    throw erreur;
  }
}

export async function proposerUneRegle(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  try {
    const proposition = await appeler<PropositionDeRegle>("/conformite/regles/propositions", {
      methode: "POST",
      authentifie: true,
      corps: { construction: construction(donnees), motif: String(donnees.get("motif") ?? "").trim() },
    });
    revalidatePath("/[locale]/referentiel", "page");
    return {
      echec: null,
      fait: `Règle ${proposition.regle.code} proposée : sans effet tant qu'une autre personne ne l'a pas validée.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function trancherUneRegle(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  if (decision !== "CONFIRMER" && decision !== "REFUSER") return { echec: "Choisissez de valider ou de refuser.", fait: null };
  try {
    const p = await appeler<PropositionDeRegle>(`/conformite/regles/propositions/${encodeURIComponent(identifiant)}/tranchage`, {
      methode: "POST",
      authentifie: true,
      corps: { decision, motif: String(donnees.get("motif") ?? "").trim() },
    });
    revalidatePath("/[locale]/referentiel", "page");
    return {
      echec: null,
      fait: p.statut === "APPLIQUEE" ? `Règle ${p.regle.code} en vigueur pour le cabinet.` : `Règle ${p.regle.code} refusée.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
