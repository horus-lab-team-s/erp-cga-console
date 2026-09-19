"use server";

/**
 * Les gestes d'administration des comptes : inviter, suspendre (pas 69), confier un
 * dossier, fermer une habilitation, fermer les sessions d'un compte (pas 70).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AUCUN SECRET NE REVIENT À L'ÉCRAN
 *
 * L'invitation rendait le lien d'activation à l'administrateur, qui pouvait activer
 * lui-même le compte qu'il créait. Le lien part désormais au collaborateur, et
 * seulement à lui. L'écran dit à qui il est parti et jusqu'à quand il vaut.
 *
 * ⚠️ LES RÈGLES RESTENT AU BACKEND
 *
 * Adresse déjà prise, portée obligatoire pour un rôle, auto-suspension : le backend
 * refuse, et sa phrase s'affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

const CHEMIN_COMPTES = "/[locale]/comptes";

/**
 * « 2026-09-30 » → « 30/09/2026 », sans passer par `Date`.
 *
 * ⚠️ `new Date("2026-09-30")` est minuit **UTC** : sur un serveur réglé à l'ouest de
 * Greenwich, `toLocaleDateString` afficherait le 29. Une date de fin d'habilitation
 * décalée d'un jour est exactement l'erreur qu'on ne remarque pas.
 */
function jourFr(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export async function inviterUnCollaborateur(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const courriel = String(donnees.get("courriel") ?? "").trim();
  const nom = String(donnees.get("nom") ?? "").trim();
  const prenom = String(donnees.get("prenom") ?? "").trim();
  const role = String(donnees.get("role") ?? "").trim();
  const depuis = String(donnees.get("depuis") ?? "").trim();
  const telephone = String(donnees.get("telephone") ?? "").trim();
  const toutLeCabinet = donnees.get("portee_mode") === "tout";
  // Deux sources, selon ce que le rôle connecté peut lire : les cases du portefeuille,
  // ou la saisie libre des NIU (un administrateur ne lit pas le portefeuille).
  const portee = [
    ...donnees.getAll("portee").map(String),
    ...String(donnees.get("portee_niu") ?? "")
      .split(/[\s,;]+/)
      .filter(Boolean),
  ];
  if (!courriel || !nom || !prenom || !role || !/^\d{4}-\d{2}-\d{2}$/.test(depuis)) {
    return { echec: "Adresse, nom, prénom, rôle et date de début sont obligatoires.", fait: null };
  }
  try {
    const r = await appeler<{ compte: { courriel: string }; expire_le: string }>("/transverse/comptes/invitation", {
      methode: "POST",
      authentifie: true,
      corps: {
        courriel,
        nom,
        prenom,
        role,
        // `null` : tout le portefeuille. Une liste, même vide, restreint.
        portee: toutLeCabinet ? null : portee,
        depuis,
        telephone: telephone || null,
      },
    });
    revalidatePath(CHEMIN_COMPTES, "page");
    return {
      echec: null,
      fait: `Invitation envoyée à ${r.compte.courriel}. Le lien vaut jusqu'au ${new Date(r.expire_le).toLocaleDateString("fr-FR")}.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function suspendreUnCompte(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (!identifiant) return { echec: "Compte non désigné.", fait: null };
  if (motif.length < 10) {
    return { echec: "Écrivez le motif : il reste au journal d'audit.", fait: null };
  }
  if (donnees.get("confirmation") !== "oui") {
    return { echec: "Cochez la confirmation : les sessions ouvertes seront fermées.", fait: null };
  }
  try {
    await appeler(`/transverse/comptes/${encodeURIComponent(identifiant)}/suspension`, {
      methode: "POST",
      authentifie: true,
      corps: { motif },
    });
    revalidatePath(CHEMIN_COMPTES, "page");
    return { echec: null, fait: "Compte suspendu, sessions fermées, titulaire prévenu." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Lever la suspension d'un compte (pas 91).
 *
 * ⚠️ Les habilitations ne se rouvrent pas : un collaborateur parti a les siennes fermées à
 * sa date de départ, et rétablir son compte ne lui rend aucun dossier. Le message le dit,
 * pour qu'on n'en conclue pas qu'il a retrouvé son portefeuille.
 */
export async function retablirUnCompte(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (!identifiant) return { echec: "Compte non désigné.", fait: null };
  if (motif.length < 10) {
    return { echec: "Écrivez pourquoi la suspension est levée : le motif reste au journal d'audit.", fait: null };
  }
  try {
    await appeler(`/transverse/comptes/${encodeURIComponent(identifiant)}/retablissement`, {
      methode: "POST",
      authentifie: true,
      corps: { motif },
    });
    revalidatePath(CHEMIN_COMPTES, "page");
    return {
      echec: null,
      fait: "Compte rétabli, titulaire prévenu. Ses habilitations fermées ne sont pas rouvertes : réaccordez-les si besoin.",
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Confier un dossier à une habilitation, à compter d'aujourd'hui (pas 70).
 *
 * ⚠️ L'identifiant rendu peut différer de celui envoyé : une habilitation qui a déjà
 * couru est relayée par une successeur ouverte ce jour, pour que l'historique ne dise
 * pas le dossier confié depuis le recrutement. Le message le dit.
 */
export async function confierUnDossier(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const habilitation = String(donnees.get("habilitation") ?? "").trim();
  const niu = String(donnees.get("niu") ?? "").trim().toUpperCase();
  if (!habilitation) return { echec: "Habilitation non désignée.", fait: null };
  if (!niu) return { echec: "Indiquez le NIU du dossier à confier.", fait: null };
  try {
    const r = await appeler<{ identifiant: string; debut: string }>(
      `/transverse/habilitations/${encodeURIComponent(habilitation)}/dossiers/${encodeURIComponent(niu)}`,
      { methode: "POST", authentifie: true },
    );
    revalidatePath(CHEMIN_COMPTES, "page");
    return {
      echec: null,
      fait:
        r.identifiant === habilitation
          ? `Dossier ${niu} confié.`
          : `Dossier ${niu} confié à compter du ${jourFr(r.debut)} : l'habilitation ${habilitation} est relayée par ${r.identifiant}, et l'historique antérieur reste intact.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/** Les motifs de fermeture proposés : ceux qui ont un sens pour un collaborateur. */
const MOTIFS_DE_FERMETURE = new Set(["DEPART", "CHANGEMENT_DE_POSTE", "REMPLACEMENT", "FIN_DE_MISSION", "CORRECTION"]);

/**
 * Fermer une habilitation à une date (pas 70). Elle n'est pas supprimée.
 *
 * ⚠️ Irréversible : une habilitation fermée ne se rouvre pas, on en ouvre une autre.
 * D'où la case, vérifiée ici autant qu'à l'écran.
 */
export async function fermerUneHabilitation(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const habilitation = String(donnees.get("habilitation") ?? "").trim();
  const le = String(donnees.get("le") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (!habilitation) return { echec: "Habilitation non désignée.", fait: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(le)) return { echec: "Indiquez la date de fin.", fait: null };
  if (!MOTIFS_DE_FERMETURE.has(motif)) return { echec: "Choisissez le motif de la fermeture.", fait: null };
  if (donnees.get("confirmation") !== "oui") {
    return { echec: "Cochez la confirmation : une habilitation fermée ne se rouvre pas.", fait: null };
  }
  try {
    await appeler(`/transverse/habilitations/${encodeURIComponent(habilitation)}/fermeture`, {
      methode: "POST",
      authentifie: true,
      corps: { le, motif },
    });
    revalidatePath(CHEMIN_COMPTES, "page");
    return { echec: null, fait: `Habilitation fermée : elle ne vaut plus à compter du ${jourFr(le)}.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Fermer toutes les sessions d'un compte, sans le suspendre (pas 70).
 *
 * Le geste d'un appareil perdu ou d'une session qu'on croit volée : le titulaire se
 * reconnecte, l'intrus non. Un départ appelle la suspension, pas ce geste.
 */
export async function fermerLesSessions(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "").trim();
  if (!identifiant) return { echec: "Compte non désigné.", fait: null };
  try {
    const r = await appeler<{ sessions_fermees: number }>(
      `/transverse/comptes/${encodeURIComponent(identifiant)}/sessions/revocation`,
      { methode: "POST", authentifie: true },
    );
    revalidatePath(CHEMIN_COMPTES, "page");
    const n = r.sessions_fermees;
    return {
      echec: null,
      fait: n === 0 ? "Aucune session ouverte." : `${n} session${n > 1 ? "s" : ""} fermée${n > 1 ? "s" : ""}.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Accorder un mandat à un autre locataire (pas 129).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE GESTE OUVRE SES PROPRES DONNÉES À DES COMPTES QU'ON NE GÈRE PAS
 *
 * C'est le seul de l'écran dans ce cas. Il ne crée aucun compte, n'accorde aucun
 * rôle, et ne se voit nulle part ailleurs : il autorise l'exercice, **ici**, de rôles
 * que des gens d'ailleurs tiennent déjà chez eux.
 *
 * ⚠️ LE MANDANT N'EST PAS UN CHAMP DU FORMULAIRE
 *
 * C'est le locataire servi, et le backend le prend de la requête. Le laisser choisir
 * permettrait d'accorder un mandat sur les données d'un autre.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function accorderUnMandat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const mandataire = String(donnees.get("mandataire") ?? "").trim();
  const roles = donnees.getAll("roles").map(String).filter(Boolean);
  const debut = String(donnees.get("debut") ?? "").trim();
  const fin = String(donnees.get("fin") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  const precision = String(donnees.get("precision") ?? "").trim();
  // ⚠️ Champ vide = tous les comptes du mandataire, et non « aucun ». La distinction
  // est celle du domaine : une désignation vide n'autoriserait personne, et le modèle
  // la refuse. L'écran ne doit donc jamais envoyer une liste vide.
  const comptes = String(donnees.get("comptes") ?? "")
    .split(/[\s,;]+/)
    .map((valeur) => valeur.trim())
    .filter(Boolean);

  if (!mandataire) return { echec: "Désigner le locataire mandaté.", fait: null };
  if (roles.length === 0) return { echec: "Un mandat sans rôle n'autorise rien.", fait: null };
  if (!debut) return { echec: "Indiquer la date de début.", fait: null };
  if (!motif) return { echec: "Indiquer à quel titre le mandat est accordé.", fait: null };

  try {
    await appeler("/transverse/mandats", {
      methode: "POST",
      authentifie: true,
      corps: {
        mandataire,
        roles,
        debut,
        fin: fin || null,
        motif,
        comptes: comptes.length > 0 ? comptes : null,
        precision: precision || null,
      },
    });
    revalidatePath(CHEMIN_COMPTES, "page");
    return {
      echec: null,
      fait: `Mandat accordé à « ${mandataire} » à compter du ${jourFr(debut)}.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Retirer un mandat avant son terme (pas 129).
 *
 * ⚠️ **Le motif est exigé, et long.** Retirer un accès accordé à un tiers se motive :
 * c'est ce motif qu'on relit deux ans plus tard, quand plus personne ne se souvient
 * de la raison. Le backend refuse en deçà de dix caractères, et l'écran le dit avant
 * d'appeler plutôt que de faire découvrir la règle par un refus.
 */
export async function revoquerUnMandat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (!identifiant) return { echec: "Mandat non désigné.", fait: null };
  if (motif.length < 10) {
    return { echec: "Le motif du retrait se dit en une phrase, pas en un mot.", fait: null };
  }
  try {
    await appeler(`/transverse/mandats/${encodeURIComponent(identifiant)}/revocation`, {
      methode: "POST",
      authentifie: true,
      corps: { motif },
    });
    revalidatePath(CHEMIN_COMPTES, "page");
    return { echec: null, fait: "Mandat retiré. Il ne vaut plus à la requête suivante." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
