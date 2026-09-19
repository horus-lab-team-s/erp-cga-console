"use server";

/**
 * Inscrire un changement de régime depuis l'écran de veille des seuils.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE ACTION EXISTE
 *
 * La veille des seuils affichait « Reclassement dû » et ne permettait rien : le
 * réviseur voyait l'alerte, et devait aller inscrire le passage au réel ailleurs,
 * c'est-à-dire nulle part dans l'écran. La route existait depuis le pas 45.
 *
 * ⚠️ LE PASSAGE EST TOUJOURS « AU RÉEL, PAR DÉPASSEMENT DE SEUIL »
 *
 * C'est le seul geste qui répond à l'alerte affichée. Proposer ici tous les régimes
 * et toutes les causes ferait de la veille un formulaire générique, et permettrait
 * d'inscrire depuis un écran d'alerte un retour à l'IGS qui n'a rien à y faire.
 *
 * ⚠️ LA JUSTIFICATION N'EST JAMAIS PRÉREMPLIE
 *
 * Elle part au journal d'audit et devient la précision du statut. Un texte composé
 * d'avance serait un motif que personne n'a écrit, validé d'un clic. Le formulaire
 * en suggère la forme, dans l'indication grisée, sans l'écrire à la place du réviseur.
 *
 * Les refus du backend sont rendus tels quels : « le changement prendrait effet
 * pendant l'exercice clos 2025 » dit au réviseur quoi corriger.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

// ⚠️ Chemin tel que le routeur le voit, groupe de routes compris : voir
// `actions-comptabilite.ts` pour ce que coûte l'erreur inverse.
const CHEMIN_VEILLE = "/[locale]/obligations/veille-des-seuils";

type StatutsResolus = {
  regime: "IGS" | "REEL";
  a_la_date: string;
};

export async function inscrireReclassement(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const aCompterDu = String(donnees.get("a_compter_du") ?? "").trim();
  const justification = String(donnees.get("justification") ?? "").trim();

  if (!dossier) return { echec: "Dossier non désigné.", fait: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aCompterDu)) {
    return { echec: "La date d'effet est obligatoire.", fait: null };
  }
  if (justification.length < 30) {
    return {
      echec:
        "La justification compte au moins trente caractères : elle nomme la pièce qui " +
        "fonde le reclassement, et un vérificateur la lira.",
      fait: null,
    };
  }

  try {
    const statuts = await appeler<StatutsResolus>(
      `/portefeuille/entreprises/${encodeURIComponent(dossier)}/regimes`,
      {
        methode: "POST",
        authentifie: true,
        corps: {
          regime: "REEL",
          a_compter_du: aCompterDu,
          cause: "DEPASSEMENT_SEUIL",
          justification,
        },
      },
    );
    revalidatePath(CHEMIN_VEILLE, "page");
    return {
      echec: null,
      fait: `Passage au réel inscrit au ${statuts.a_la_date.split("-").reverse().join("/")}.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

// ══ L'adhésion au Centre (pas 57) ════════════════════════════════════════════
//
// ⚠️ Les deux gestes suivent la même discipline que le reclassement : l'écran ne
// rejoue aucune règle du domaine. L'antidate, le seuil de l'article 118, l'exercice
// clos traversé : le backend refuse, et sa phrase est affichée telle quelle.

const CHEMIN_PORTEFEUILLE = "/[locale]/portefeuille";

function formatJour(iso: string): string {
  return iso.split("-").reverse().join("/");
}

export async function admettreAuCentre(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const aCompterDu = String(donnees.get("a_compter_du") ?? "").trim();
  // Les espaces de milliers sont tolérés à la saisie : « 62 000 000 ».
  const chiffre = String(donnees.get("chiffre_affaires_declare") ?? "").replace(/[\s  ]/g, "");
  const source = String(donnees.get("source_du_chiffre") ?? "").trim();
  const justification = String(donnees.get("justification") ?? "").trim();

  if (!dossier) return { echec: "Dossier non désigné.", fait: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aCompterDu)) {
    return { echec: "La date d'effet est obligatoire.", fait: null };
  }
  if (!/^\d+$/.test(chiffre)) {
    return {
      echec: "Le chiffre d'affaires déclaré s'écrit en francs, sans décimales.",
      fait: null,
    };
  }
  if (source.length < 5) {
    return {
      echec: "Nommez la source du chiffre : la liasse de l'exercice, une attestation.",
      fait: null,
    };
  }
  if (justification.length < 30) {
    return {
      echec:
        "La justification compte au moins trente caractères : elle part au journal " +
        "d'audit, et c'est le Centre qui atteste l'éligibilité.",
      fait: null,
    };
  }

  try {
    const statuts = await appeler<{ a_la_date: string; adherente: boolean }>(
      `/portefeuille/entreprises/${encodeURIComponent(dossier)}/adhesions`,
      {
        methode: "POST",
        authentifie: true,
        corps: {
          a_compter_du: aCompterDu,
          chiffre_affaires_declare: chiffre,
          source_du_chiffre: source,
          justification,
        },
      },
    );
    revalidatePath(CHEMIN_PORTEFEUILLE, "page");
    return { echec: null, fait: `Adhésion inscrite à compter du ${formatJour(statuts.a_la_date)}.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function resilierLAdhesion(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const au = String(donnees.get("au") ?? "").trim();
  const justification = String(donnees.get("justification") ?? "").trim();

  if (!dossier) return { echec: "Dossier non désigné.", fait: null };
  // ⚠️ Aucune date proposée : une résiliation se date sur la lettre reçue, pas sur
  // le jour où l'on remplit le formulaire.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(au)) {
    return { echec: "La date de résiliation est obligatoire.", fait: null };
  }
  if (justification.length < 30) {
    return {
      echec:
        "La justification compte au moins trente caractères : elle nomme la lettre ou " +
        "la décision qui fonde la résiliation.",
      fait: null,
    };
  }

  try {
    await appeler<{ a_la_date: string }>(
      `/portefeuille/entreprises/${encodeURIComponent(dossier)}/adhesions/resiliation`,
      { methode: "POST", authentifie: true, corps: { au, justification } },
    );
    revalidatePath(CHEMIN_PORTEFEUILLE, "page");
    return { echec: null, fait: `Adhésion résiliée : plus adhérent le ${formatJour(au)}.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * L'adhérent signale un changement de son entreprise (pas 114, maquette « Espace adhérent », vue E).
 *
 * ⚠️ Rien ne change au dossier : le signalement est une parole datée, que le chargé de clientèle
 * instruit. Le message de retour le dit, pour que l'adhérent ne croie pas son adresse déjà changée.
 */
export async function signalerUnChangement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const nature = String(donnees.get("nature") ?? "").trim();
  const message = String(donnees.get("message") ?? "").trim();
  if (!dossier || !nature) return { echec: "Choisissez ce qui change.", fait: null };
  if (message.length < 5) return { echec: "Décrivez le changement en quelques mots.", fait: null };
  try {
    const recu = await appeler<{ libelle: string }>(
      `/portefeuille/entreprises/${encodeURIComponent(dossier)}/signalements`,
      { methode: "POST", authentifie: true, corps: { nature, message } },
    );
    revalidatePath("/[locale]/mon-espace/entreprise", "page");
    return {
      echec: null,
      fait: `Changement signalé (${recu.libelle.toLowerCase()}). Le cabinet l'instruit et vous contacte : votre dossier n'est pas encore modifié.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * L'adhérent choisit l'entreprise qu'il regarde (pas 116). Voir `entreprise-choisie.ts` : le témoin
 * retient un affichage, il ne protège rien, et un NIU hors périmètre est ignoré à la lecture.
 */
export async function choisirMonEntreprise(donnees: FormData): Promise<void> {
  const { cookies } = await import("next/headers");
  const niu = String(donnees.get("entreprise") ?? "").trim();
  if (/^[A-Z0-9]{8,20}$/.test(niu)) {
    (await cookies()).set("cga_entreprise", niu, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  for (const page of ["", "/justificatifs", "/echeances", "/documents", "/entreprise", "/reglages"]) {
    revalidatePath(`/[locale]/mon-espace${page}`, "page");
  }
}

/**
 * Le chargé de clientèle renvoie un lien d'accès à un adhérent (pas 116, maquette vue A, note 5).
 * Le lien part à l'adresse du compte ; la vérification écrite va au journal, au nom du chargé.
 */
export async function renvoyerUnLienDAcces(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const compte = String(donnees.get("compte") ?? "").trim();
  const verification = String(donnees.get("verification") ?? "").trim();
  if (!dossier || !compte) return { echec: "Compte non désigné.", fait: null };
  try {
    const lien = await appeler<{ type: string }>(
      `/portefeuille/entreprises/${encodeURIComponent(dossier)}/acces-adherents/${encodeURIComponent(compte)}/lien`,
      { methode: "POST", authentifie: true, corps: { verification } },
    );
    revalidatePath("/[locale]/portefeuille/[niu]", "page");
    return {
      echec: null,
      fait:
        lien.type === "ACTIVATION"
          ? "Lien d'activation envoyé à l'adresse du compte, valable 7 jours."
          : "Lien de réinitialisation envoyé à l'adresse du compte, valable 2 heures.",
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
