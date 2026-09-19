"use server";

/**
 * Les gestes sur une demande de pièce (pas 74).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE CYCLE EXISTAIT DANS LE DOMAINE, PAS DANS LE PRODUIT
 *
 * Demander, satisfaire, classer, tracer une relance : aucune route ne le faisait.
 * Une pièce reçue laissait sa demande ouverte et relancée, et la liste des relances,
 * que le domaine appelle « la défense du Centre », restait vide.
 *
 * ⚠️ LA FICHE D'UNE FACTURE NE CONNAÎT PAS SA PIÈCE
 *
 * L'écran E02 est désigné par la référence de la facture ; la demande vise une pièce
 * de la collecte. L'action cherche la pièce du dossier qui porte cette référence.
 * **Deux pièces pour la même facture, c'est un doublon** : l'action refuse de choisir,
 * et renvoie à l'arbitrage. Demander la rectificative de la mauvaise copie laisserait
 * l'autre comptabilisable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import { lirePieces, type DemandePiece } from "./collecte";
import type { EtatActe } from "./saisie";

const CHEMINS = ["/[locale]/pieces/[reference]", "/[locale]/pieces/attendues"] as const;

function rafraichir() {
  for (const chemin of CHEMINS) revalidatePath(chemin, "page");
}

function jourFr(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

/**
 * La gestion commune d'un geste : rafraîchir, dire ce qui a été fait, ou la phrase du refus.
 *
 * ⚠️ Pas 78 : l'aide recevait le **chemin** et faisait l'appel elle-même. L'outil de
 * confrontation au backend (`outils/contrat_des_ecrans.py`) ne pouvait pas lire un
 * chemin passé en variable, et ces trois gestes échappaient à la vérification. L'appel
 * typé est désormais écrit au point d'usage, et l'aide ne reçoit que sa promesse.
 */
async function geste(appel: () => Promise<DemandePiece>, fait: (d: DemandePiece) => string): Promise<EtatActe> {
  try {
    const demande = await appel();
    rafraichir();
    return { echec: null, fait: fait(demande) };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function demanderUneRectificative(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = String(donnees.get("reference") ?? "").trim();
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  const attenduePour = String(donnees.get("attendue_pour") ?? "").trim();
  if (!reference || !dossier) return { echec: "Facture non désignée.", fait: null };
  if (motif.length < 10) return { echec: "Écrivez ce qui est à rectifier : l'adhérent le transmettra au fournisseur.", fait: null };
  try {
    const candidates = (await lirePieces({ entreprise: dossier })).filter(
      (p) => p.reference_document === reference && p.etat !== "ARCHIVEE",
    );
    if (candidates.length === 0) {
      return { echec: `Aucune pièce reçue ne porte la facture ${reference} dans ce dossier.`, fait: null };
    }
    if (candidates.length > 1) {
      return {
        echec:
          `${candidates.length} pièces portent la facture ${reference} (${candidates.map((p) => p.identifiant).join(", ")}) : ` +
          "arbitrer le doublon avant de demander la rectificative.",
        fait: null,
      };
    }
    const r = await appeler<{ demande: DemandePiece; adherents_prevenus: number }>(
      `/collecte/pieces/${encodeURIComponent(candidates[0].identifiant)}/rectificative`,
      {
        methode: "POST",
        authentifie: true,
        corps: attenduePour ? { motif, attendue_pour: attenduePour } : { motif },
      },
    );
    rafraichir();
    return {
      echec: null,
      fait:
        `Demande ${r.demande.identifiant} émise. ` +
        (r.adherents_prevenus > 0
          ? `${r.adherents_prevenus} compte${r.adherents_prevenus > 1 ? "s" : ""} adhérent prévenu${r.adherents_prevenus > 1 ? "s" : ""} par courriel.`
          : "Aucun compte adhérent actif sur ce dossier : prévenir par un autre canal, puis tracer la relance."),
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function satisfaireUneDemande(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const demande = String(donnees.get("demande") ?? "").trim();
  const piece = String(donnees.get("piece") ?? "").trim().toUpperCase();
  if (!demande || !piece) return { echec: "Indiquez la pièce reçue.", fait: null };
  return geste(
    () =>
      appeler<DemandePiece>(`/collecte/demandes/${encodeURIComponent(demande)}/satisfaction`, {
        methode: "POST",
        authentifie: true,
        corps: { piece },
      }),
    (d) => `Demande ${d.identifiant} satisfaite par ${piece} : elle ne se relancera plus.`,
  );
}

export async function tracerUneRelance(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const demande = String(donnees.get("demande") ?? "").trim();
  const canal = String(donnees.get("canal") ?? "").trim();
  if (!demande || !canal) return { echec: "Indiquez le canal de la relance.", fait: null };
  return geste(
    () =>
      appeler<DemandePiece>(`/collecte/demandes/${encodeURIComponent(demande)}/relances`, {
        methode: "POST",
        authentifie: true,
        corps: { canal },
      }),
    (d) => `Relance tracée (${d.relances.length} au total, la dernière le ${jourFr(d.relances.at(-1)![0])}).`,
  );
}

export async function classerUneDemande(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const demande = String(donnees.get("demande") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Le motif est obligatoire : il distingue une décision d'un abandon.", fait: null };
  if (donnees.get("confirmation") !== "oui") {
    return { echec: "Cochez la confirmation : une demande classée ne se relance plus.", fait: null };
  }
  return geste(
    () =>
      appeler<DemandePiece>(`/collecte/demandes/${encodeURIComponent(demande)}/classement`, {
        methode: "POST",
        authentifie: true,
        corps: { motif },
      }),
    (d) => `Demande ${d.identifiant} classée sans suite.`,
  );
}

/** La limite du backend (`TAILLE_MAXIMALE`, 20 Mo), vérifiée ici pour un message lisible. */
const TAILLE_MAXIMALE = 20 * 1024 * 1024;

type ResultatReception = {
  piece: { identifiant: string; reference_document: string | null };
  suspicions: unknown[];
  a_arbitrer: boolean;
  /** Pas 96 : la pièce était déjà au dossier ; le backend la rend inchangée. */
  rejeu: boolean;
};

/**
 * L'adhérent dépose une pièce depuis son espace (pas 81).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX ÉTAPES, DANS CET ORDRE, ET LA SECONDE NE CROIT PAS LA PREMIÈRE
 *
 * 1. Le **fichier** part à `POST /collecte/fichiers`. Le backend lit son type réel
 *    dans les octets, borne sa taille, et rend son empreinte.
 * 2. La **pièce** est déclarée à `POST /collecte/pieces` avec cette empreinte. Le
 *    backend relit le fichier et recalcule l'empreinte : une clé inventée est refusée.
 *
 * Le dépôt est **rejouable** : l'identifiant de la pièce dérive de l'empreinte, et
 * redéposer le même fichier rend la même pièce. Un adhérent dont la connexion tombe
 * entre les deux étapes recommence sans créer de doublon.
 *
 * ⚠️ Le commentaire de `mon-espace` disait que le magasin de fichiers « n'a pas
 * d'adaptateur réel ». Il en a un, sur disque, depuis longtemps : c'était une
 * affirmation périmée, qui empêchait de brancher ce geste.
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * Le dépôt en deux étapes, commun au portail de l'adhérent et à la réception au cabinet
 * (pas 88). Rend le message à afficher, ou lève `ErreurApi`.
 *
 * ⚠️ Une seule implémentation : le cabinet et l'adhérent passent par les mêmes contrôles
 * (type réel lu dans les octets, taille bornée, empreinte recalculée). Recopier ce corps
 * pour le cabinet aurait fait diverger le premier contrôle ajouté à l'un des deux.
 */
async function deposerFichierEtPiece(
  donnees: FormData,
  {
    canal,
    deposeLe,
    pourLeCabinet,
    ensuite,
  }: {
    canal: string;
    deposeLe: string | null;
    pourLeCabinet: boolean;
    /** Pas 113 : ce qui suit la réception (la preuve de paiement dit ce que la pièce règle). */
    ensuite?: (resultat: ResultatReception) => Promise<EtatActe>;
  },
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const fichier = donnees.get("fichier");
  if (!dossier) return { echec: pourLeCabinet ? "Choisissez le dossier de la pièce." : "Dossier non désigné.", fait: null };
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { echec: "Choisissez le document à envoyer : une photo ou un PDF.", fait: null };
  }
  if (fichier.size > TAILLE_MAXIMALE) {
    return {
      echec: "Le document dépasse 20 Mo. Photographiez-le en qualité normale, ou envoyez un PDF allégé.",
      fait: null,
    };
  }
  const texte = (cle: string) => {
    const v = String(donnees.get(cle) ?? "").trim();
    return v === "" ? null : v;
  };
  const montant = texte("montant_ttc")?.replace(/\s/g, "").replace(",", ".") ?? null;
  if (montant !== null && !/^\d+(\.\d+)?$/.test(montant)) {
    return { echec: "Montant illisible : écrivez-le en chiffres, par exemple 125000.", fait: null };
  }

  const envoi = new FormData();
  envoi.set("fichier", fichier, fichier.name);
  const range = await appeler<{ empreinte: string; nom_fichier: string; deja_present: boolean }>(
    `/collecte/fichiers?entreprise=${encodeURIComponent(dossier)}`,
    { methode: "POST", authentifie: true, formulaire: envoi },
  );
  const resultat = await appeler<ResultatReception>("/collecte/pieces", {
    methode: "POST",
    authentifie: true,
    corps: {
      entreprise: dossier,
      canal,
      empreinte: range.empreinte,
      // `null` : le backend pose aujourd'hui. Une date déclarée n'est envoyée que par le
      // cabinet, pour une pièce reçue plus tôt et saisie maintenant (90 jours au plus).
      depose_le: deposeLe,
      nom_fichier: range.nom_fichier,
      type: texte("type") ?? "INDETERMINE",
      reference_document: texte("reference_document"),
      date_document: texte("date_document"),
      montant_ttc: montant,
      emetteur: texte("emetteur"),
      commentaire: texte("commentaire"),
    },
  });
  if (ensuite) return ensuite(resultat);
  if (pourLeCabinet) {
    revalidatePath("/[locale]/pieces", "page");
    return {
      echec: null,
      fait: resultat.a_arbitrer
        ? `Pièce ${resultat.piece.identifiant} reçue, et signalée : elle ressemble à une pièce déjà au dossier. À arbitrer avant de la comptabiliser.`
        : `Pièce ${resultat.piece.identifiant} reçue au dossier ${dossier}.`,
    };
  }
  revalidatePath("/[locale]/mon-espace", "page");
  revalidatePath("/[locale]/mon-espace/justificatifs", "page");
  if (resultat.rejeu) {
    // Une file hors ligne rejoue par construction : l'adhérent doit lire que c'est déjà fait,
    // et non croire qu'il a envoyé deux fois le même document.
    return { echec: null, fait: "Ce document était déjà arrivé au cabinet : rien n'a été envoyé une seconde fois." };
  }
  return {
    echec: null,
    fait: resultat.a_arbitrer
      ? "Pièce reçue. Elle ressemble à un document déjà transmis : le cabinet vérifiera qu'il ne s'agit pas d'un doublon."
      : "Pièce reçue. Le cabinet la traitera ; vous la voyez ci-dessous, en cours de traitement.",
  };
}

export async function deposerUnePiece(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  // ⚠️ Pas 96 : un dépôt rejoué depuis la file hors ligne porte **le jour de la capture**.
  // La photo prise lundi sans réseau et partie mercredi a été déposée lundi : c'est ce
  // jour-là qui mesure le délai de l'adhérent. Le backend borne l'antériorité et refuse
  // l'avenir ; l'heure de réception, elle, reste celle du serveur.
  const captureLe = String(donnees.get("capture_le") ?? "").trim();
  if (captureLe && !/^\d{4}-\d{2}-\d{2}$/.test(captureLe)) {
    return { echec: "Date de capture illisible.", fait: null };
  }
  try {
    // ⚠️ Le canal est posé par l'écran, pas choisi par l'adhérent : ce formulaire est le
    // portail. Le laisser choisir fausserait les délais de collecte par canal.
    return await deposerFichierEtPiece(donnees, { canal: "PORTAIL", deposeLe: captureLe || null, pourLeCabinet: false });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/** Les canaux par lesquels une pièce arrive **au cabinet** (pas 88). Le portail est celui de l'adhérent. */
const CANAUX_DU_CABINET = new Set(["DEPOT_CABINET", "COURRIEL", "WHATSAPP"]);

/**
 * Le cabinet enregistre une pièce reçue au guichet, par courriel ou par WhatsApp (pas 88).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE BOUTON « IMPORTER DES PIÈCES » ÉTAIT DÉCORATIF
 *
 * Il figurait sur la boîte de réception depuis sa construction, sans action : un
 * collaborateur qui recevait une facture papier ne pouvait pas l'enregistrer, et le
 * délai de collecte du dossier se mesurait sans elle.
 *
 * ⚠️ LA DATE DE DÉPÔT PEUT PRÉCÉDER LA SAISIE, DANS LA LIMITE DU BACKEND
 *
 * Une facture posée au guichet vendredi et saisie lundi a été déposée vendredi : c'est
 * cette date qui mesure le délai de l'adhérent. Le backend borne l'antériorité à
 * quatre-vingt-dix jours, et refuse l'avenir ; l'écran ne recopie pas la borne, il affiche
 * le refus.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function recevoirUnePieceAuCabinet(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const canal = String(donnees.get("canal") ?? "");
  if (!CANAUX_DU_CABINET.has(canal)) {
    return { echec: "Indiquez comment la pièce est arrivée : au guichet, par courriel ou par WhatsApp.", fait: null };
  }
  const deposeLe = String(donnees.get("depose_le") ?? "").trim();
  if (deposeLe && !/^\d{4}-\d{2}-\d{2}$/.test(deposeLe)) {
    return { echec: "La date de dépôt s'écrit jour, mois et année.", fait: null };
  }
  try {
    return await deposerFichierEtPiece(donnees, { canal, deposeLe: deposeLe || null, pourLeCabinet: true });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/** Le document d'une pièce, en base64 : les octets passent intacts jusqu'au navigateur (pas 88). */
export type EtatDocument = { echec: string | null; fichier: { nom: string; typeMime: string; base64: string } | null };

/**
 * Récupérer le document scanné d'une pièce (pas 88).
 *
 * ⚠️ Le backend le rend en pièce jointe, avec `nosniff` : un fichier déposé de l'extérieur
 * ne doit jamais s'ouvrir dans la page du cabinet. L'écran le télécharge, il ne l'insère pas.
 */
export async function recupererLeDocument(_precedent: EtatDocument, donnees: FormData): Promise<EtatDocument> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  try {
    const f = await telecharger(`/collecte/pieces/${encodeURIComponent(identifiant)}/fichier`);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}

/**
 * Envoyer la relance des pièces cochées (pas 111). La sélection, le modèle et les canaux partent ;
 * le message, lui, est rendu par le backend, le même qu'à l'aperçu.
 */
export async function envoyerLaRelance(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const mois = String(donnees.get("mois") ?? "");
  const attentes = donnees.getAll("attente").map(String).filter(Boolean);
  const canaux = donnees.getAll("canal").map(String).filter(Boolean);
  if (attentes.length === 0) return { echec: "Cochez au moins une pièce à demander.", fait: null };
  if (canaux.length === 0) return { echec: "Choisissez au moins un canal.", fait: null };
  let resultat: { destinataires: number; demandes_creees: string[]; demandes_relancees: string[] };
  try {
    resultat = await appeler(`/pilotage/dossiers/${encodeURIComponent(dossier)}/relance`, {
      methode: "POST",
      authentifie: true,
      corps: { mois, attentes, canaux, modele: String(donnees.get("modele") ?? "") },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/pieces/relancer", "page");
  revalidatePath("/[locale]/pieces/attendues", "page");
  return {
    echec: null,
    fait: `Relance envoyée à ${resultat.destinataires} adhérent${resultat.destinataires > 1 ? "s" : ""} : ${resultat.demandes_relancees.length} pièce${resultat.demandes_relancees.length > 1 ? "s" : ""} demandée${resultat.demandes_relancees.length > 1 ? "s" : ""}, dont ${resultat.demandes_creees.length} nouvelle${resultat.demandes_creees.length > 1 ? "s" : ""}.`,
  };
}

/**
 * Classer une pièce sans écriture : doublon, relevé rapproché, document hors sujet (pas 107).
 *
 * ⚠️ Avant le pas 107, aucune route ne terminait le traitement d'une pièce : elle restait « à
 * traiter » pour toujours, et aurait bloqué la clôture de son mois. Le motif est exigé, et
 * inscrit au journal d'audit : une pièce classée disparaît du travail à faire.
 */
export async function classerUnePiece(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Dites pourquoi la pièce ne produira pas d'écriture (10 caractères au moins).", fait: null };
  try {
    await appeler<{ identifiant: string; etat: string }>(`/collecte/pieces/${encodeURIComponent(identifiant)}/classement`, {
      methode: "POST",
      authentifie: true,
      corps: { motif },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/pieces", "page");
  revalidatePath("/[locale]/comptabilite/cloture", "page");
  return { echec: null, fait: `${identifiant} classée sans écriture : son traitement est terminé.` };
}

/**
 * Lire une pièce reçue : l'identifier et la passer à LUE (pas 91).
 *
 * ⚠️ Seuls les champs saisis complètent la pièce : ce que l'adhérent avait déclaré n'est
 * pas effacé par un champ laissé vide. Le backend refuse une pièce encore incomplète, et
 * une pièce déjà lue, dont les données ne se réécrivent pas.
 */
export async function lireUnePiece(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "");
  const texte = (cle: string) => {
    const v = String(donnees.get(cle) ?? "").trim();
    return v === "" ? null : v;
  };
  const montant = texte("montant_ttc")?.replace(/\s/g, "").replace(",", ".") ?? null;
  if (montant !== null && !/^\d+(\.\d+)?$/.test(montant)) {
    return { echec: "Montant illisible : écrivez-le en chiffres.", fait: null };
  }
  try {
    const p = await appeler<{ identifiant: string; etat: string }>(`/collecte/pieces/${encodeURIComponent(identifiant)}/lecture`, {
      methode: "POST",
      authentifie: true,
      corps: {
        type: texte("type"),
        reference_document: texte("reference_document"),
        date_document: texte("date_document"),
        montant_ttc: montant,
        emetteur: texte("emetteur"),
      },
    });
    revalidatePath("/[locale]/pieces", "page");
    return { echec: null, fait: `${p.identifiant} identifiée et lue : elle peut être contrôlée.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * L'adhérent répond à une demande du cabinet (pas 112, maquette « Espace adhérent », vue C).
 *
 * Deux réponses toutes faites (le bouton porte sa nature) et un message libre. La date de
 * « plus tard » n'est pas choisie ici : le référentiel dit ce que « la semaine prochaine » veut
 * dire, et le backend la calcule. ⚠️ Une réponse ne ferme pas la demande : le cabinet décide.
 */
export async function repondreAuCabinet(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const demande = String(donnees.get("demande") ?? "").trim();
  const nature = String(donnees.get("nature") ?? "").trim();
  const message = String(donnees.get("message") ?? "").trim();
  if (!demande || !["PLUS_TARD", "INTROUVABLE", "MESSAGE"].includes(nature)) {
    return { echec: "Choisissez une réponse.", fait: null };
  }
  if (nature === "MESSAGE" && !message) return { echec: "Écrivez votre message avant de l'envoyer.", fait: null };
  try {
    const repondue = await appeler<DemandePiece & { derniere_reponse: { annoncee_pour: string | null } | null }>(
      `/collecte/demandes/${encodeURIComponent(demande)}/reponse`,
      { methode: "POST", authentifie: true, corps: message ? { nature, message } : { nature } },
    );
    revalidatePath("/[locale]/mon-espace", "page");
    const annoncee = repondue.derniere_reponse?.annoncee_pour;
    return {
      echec: null,
      fait: annoncee
        ? `Votre réponse est arrivée au cabinet : il attend la pièce pour le ${jourFr(annoncee)}.`
        : "Votre réponse est arrivée au cabinet.",
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * « J'ai déjà payé : envoyer la preuve » (pas 113, maquette « Espace adhérent », vue D).
 *
 * Deux temps, et le premier est le dépôt ordinaire : la quittance est une pièce du dossier, déposée
 * par les mêmes contrôles (type lu dans les octets, taille, empreinte), avec le type
 * `QUITTANCE_IMPOT`. Le second dit **ce qu'elle règle** : l'obligation et sa période.
 *
 * ⚠️ Si le second temps est refusé (échéance déjà déposée, quittance déjà envoyée), la pièce reste
 * reçue : l'adhérent le lit, et le cabinet la verra dans ses pièces. Rien ne se perd.
 */
export async function envoyerUnePreuveDePaiement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const [code, debut, fin] = String(donnees.get("echeance") ?? "").split("|");
  if (!dossier || !code || !debut || !fin) return { echec: "Échéance non désignée.", fait: null };
  donnees.set("type", "QUITTANCE_IMPOT");
  try {
    return await deposerFichierEtPiece(donnees, {
      canal: "PORTAIL",
      deposeLe: null,
      pourLeCabinet: false,
      ensuite: async (resultat) => {
        revalidatePath("/[locale]/mon-espace", "page");
        revalidatePath("/[locale]/mon-espace/echeances", "page");
        revalidatePath("/[locale]/mon-espace/justificatifs", "page");
        try {
          const recue = await appeler<{ titre: string; periode: string }>(
            `/obligations/dossiers/${encodeURIComponent(dossier)}/preuves-de-paiement`,
            {
              methode: "POST",
              authentifie: true,
              corps: { code_obligation: code, periode_debut: debut, periode_fin: fin, piece: resultat.piece.identifiant },
            },
          );
          return {
            echec: null,
            fait: `Preuve envoyée pour ${recue.titre}, ${recue.periode}. Le cabinet la vérifie et la joint à votre dossier.`,
          };
        } catch (erreur) {
          if (erreur instanceof ErreurApi) {
            return {
              echec: `Votre document est bien arrivé au cabinet (pièce ${resultat.piece.identifiant}), mais il n'a pas pu être rattaché à cette échéance : ${erreur.message}`,
              fait: null,
            };
          }
          throw erreur;
        }
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
