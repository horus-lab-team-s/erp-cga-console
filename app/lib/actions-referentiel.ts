"use server";

/**
 * Décider sur le référentiel depuis l'écran (pas 95).
 *
 * ⚠️ Ce que la personne valide ici entre **au calcul suivant du cabinet** : contrôle de
 * conformité, échéancier, paie. Le navigateur n'envoie que ce qu'elle a écrit ; le
 * backend confronte la session au circuit, vérifie la valeur à l'unité, refuse une date
 * passée, et journalise avec le motif.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { DecisionSurLeReferentiel } from "./referentiel";
import type { EtatActe } from "./saisie";

function lire(donnees: FormData, nom: string): string {
  return String(donnees.get(nom) ?? "").trim();
}

async function geste(appel: () => Promise<DecisionSurLeReferentiel>, fait: (d: DecisionSurLeReferentiel) => string): Promise<EtatActe> {
  try {
    const decision = await appel();
    revalidatePath("/[locale]/referentiel", "page");
    return { echec: null, fait: fait(decision) };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function validerUneVersionLivree(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const code = lire(donnees, "code");
  const applicable_du = lire(donnees, "applicable_du");
  const motif = lire(donnees, "motif");
  if (motif.length < 10) return { echec: "Écrivez le texte confronté ou la décision prise (10 caractères au moins).", fait: null };
  return geste(
    () =>
      appeler<DecisionSurLeReferentiel>(
        `/transverse/referentiel/parametres/${encodeURIComponent(code)}/versions/${encodeURIComponent(applicable_du)}/validation`,
        { methode: "POST", authentifie: true, corps: { motif } },
      ),
    (d) => `${d.code} : version du ${d.applicable_du.split("-").reverse().join("/")} validée pour le cabinet.`,
  );
}

/**
 * La valeur est envoyée **typée** : un nombre pour toute unité chiffrée, du texte pour une
 * expression régulière. « 19,25 » écrit à la française est lu 19.25 ; le backend refuse
 * encore ce qui ne convient pas à l'unité.
 */
function valeurTypee(brute: string, unite: string): string | number {
  if (unite === "REGEX") return brute;
  const nombre = Number(brute.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(nombre) && brute !== "" ? nombre : brute;
}

export async function proposerUneVersion(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const [code, unite] = lire(donnees, "code").split("|");
  const corps = {
    valeur: valeurTypee(lire(donnees, "valeur"), unite ?? ""),
    applicable_du: lire(donnees, "applicable_du"),
    fondement: { texte: lire(donnees, "fondement_texte"), source: lire(donnees, "fondement_source") },
    note: lire(donnees, "note") || null,
    motif: lire(donnees, "motif"),
  };
  if (!code) return { echec: "Choisissez le paramètre.", fait: null };
  if (!corps.applicable_du) return { echec: "Indiquez la date d'effet.", fait: null };
  return geste(
    () =>
      appeler<DecisionSurLeReferentiel>(`/transverse/referentiel/parametres/${encodeURIComponent(code)}/propositions`, {
        methode: "POST",
        authentifie: true,
        corps,
      }),
    (d) => `Proposition ${d.identifiant} enregistrée : sans effet tant qu'elle n'est pas validée.`,
  );
}

export async function trancherUneProposition(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = lire(donnees, "identifiant");
  const decision = lire(donnees, "decision");
  const motif = lire(donnees, "motif");
  if (decision !== "VALIDER" && decision !== "REFUSER") return { echec: "Choisissez de valider ou de refuser.", fait: null };
  return geste(
    () =>
      appeler<DecisionSurLeReferentiel>(`/transverse/referentiel/decisions/${encodeURIComponent(identifiant)}/tranchage`, {
        methode: "POST",
        authentifie: true,
        corps: { decision, motif },
      }),
    (d) => (d.statut === "APPLIQUEE" ? `${d.code} : nouvelle valeur appliquée aux calculs du cabinet.` : `Proposition ${d.identifiant} refusée.`),
  );
}

/**
 * Mettre fin à une décision validée, à compter d'une date (pas 98).
 *
 * Le même geste sert à une valeur du référentiel et à une règle du cabinet : `sorte` dit
 * laquelle. La date est aujourd'hui au plus tôt ; le backend le vérifie et le dit.
 */
export async function retirerUneDecision(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = lire(donnees, "identifiant");
  const corps = { a_compter_du: lire(donnees, "a_compter_du"), motif: lire(donnees, "motif") };
  if (!corps.a_compter_du) return { echec: "Indiquez à compter de quand la décision cesse de valoir.", fait: null };
  try {
    // Deux appels écrits en entier plutôt qu'un chemin calculé : l'outil de contrat ne vérifie
    // que les chemins littéraux.
    const reponse =
      lire(donnees, "sorte") === "regle"
        ? await appeler<{ fin_d_effet: string | null }>(`/conformite/regles/propositions/${encodeURIComponent(identifiant)}/retrait`, {
            methode: "POST",
            authentifie: true,
            corps,
          })
        : await appeler<{ fin_d_effet: string | null }>(`/transverse/referentiel/decisions/${encodeURIComponent(identifiant)}/retrait`, {
            methode: "POST",
            authentifie: true,
            corps,
          });
    revalidatePath("/[locale]/referentiel", "page");
    return { echec: null, fait: `Retirée à compter du ${String(reponse.fin_d_effet).split("-").reverse().join("/")}.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
