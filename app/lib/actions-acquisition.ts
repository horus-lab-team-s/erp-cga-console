"use server";

/**
 * Déposer une demande de contact dans le parcours d'acquisition.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE ACTION EXISTE
 *
 * Les formulaires de la vitrine composaient un message WhatsApp et n'appelaient
 * aucune API, avec ce motif écrit dans leur en-tête : « le point d'entrée n'existe
 * pas encore ». Il existait depuis : `POST /acquisition/demandes`. Le motif était
 * resté, et la conséquence était lourde. **Aucune demande venue du site n'entrait
 * dans le système** : ni l'affectation à un responsable, ni la veille des dossiers
 * immobiles, ni la reprise, ni la relance ne voyaient jamais un vrai prospect. Le
 * message partait dans une conversation WhatsApp, hors de toute trace.
 *
 * WHATSAPP RESTE, ET IL N'EST PLUS SEUL
 *
 * Le motif d'origine gardait une part juste : WhatsApp est le canal professionnel
 * dominant au Cameroun. Le formulaire continue donc d'ouvrir la conversation, et
 * l'action enregistre la demande **en même temps**. Le cabinet peut recevoir les
 * deux ; c'est le même numéro de téléphone, et le responsable affecté les
 * rapproche. Mieux vaut un doublon visible qu'une demande introuvable.
 *
 * ⚠️ LE CONSENTEMENT TRANSMIS EST CELUI QUE LE VISITEUR A DONNÉ, PAS PLUS
 *
 * La case du formulaire dit « me recontacter au sujet de ma demande ». Ce n'est
 * pas un consentement à recevoir des messages WhatsApp du cabinet, dont le texte
 * est versionné côté backend. L'action transmet donc `consentement_whatsapp: false`
 * et le canal `APPEL` ; le backend rappelle par téléphone, et l'accusé le dit.
 * Étendre le consentement ici serait faire consentir le visiteur à un texte qu'il
 * n'a pas lu.
 *
 * ⚠️ UNE ACTION SERVEUR SE VALIDE ELLE-MÊME
 *
 * Elle est joignable par un POST direct, sans passer par le formulaire. Les bornes
 * sont donc revérifiées ici, et le consentement exigé : sans lui, rien n'est
 * transmis.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";
import { DEMARCHES, type DemandeSoumise, type ResultatDemande } from "./acquisition";
import type { ProformaConsultee, ProformaEmise, Proposition } from "./console-acquisition";
import { adresseAbsolue } from "./site";

type AccuseDeDemande = {
  recue: boolean;
  canal_de_rappel: "APPEL" | "WHATSAPP" | "COURRIEL";
  message: string;
};

export async function deposerUneDemande(demande: DemandeSoumise): Promise<ResultatDemande> {
  const nom = String(demande?.nom ?? "").trim();
  const telephone = String(demande?.telephone ?? "").trim();
  const courriel = String(demande?.courriel ?? "").trim();
  const message = String(demande?.message ?? "").trim();

  if (demande?.consentementContact !== true) {
    return {
      enregistree: false,
      motif: "Sans votre accord, votre demande ne peut pas être enregistrée.",
    };
  }
  if (!(DEMARCHES as readonly string[]).includes(demande.demarche)) {
    return { enregistree: false, motif: "Démarche inconnue." };
  }
  if (nom.length < 3 || nom.length > 120) {
    return { enregistree: false, motif: "Le nom doit compter entre 3 et 120 caractères." };
  }
  if (telephone.replace(/\D/g, "").length < 8) {
    return { enregistree: false, motif: "Le numéro de téléphone est incomplet." };
  }

  try {
    const accuse = await appeler<AccuseDeDemande>("/acquisition/demandes", {
      methode: "POST",
      corps: {
        nom,
        telephone,
        courriel: courriel || null,
        service_souhaite: demande.demarche,
        message: message || null,
        canal_prefere: "APPEL",
        consentement_whatsapp: false,
        origine: String(demande.origine ?? "vitrine").slice(0, 40),
      },
    });
    return { enregistree: true, canalDeRappel: accuse.canal_de_rappel };
  } catch (erreur) {
    // ⚠️ Le motif du backend est rendu tel quel : « +33612345678 n'est pas un
    // numéro camerounais exploitable » dit au visiteur quoi corriger, « une erreur
    // est survenue » ne lui dit rien.
    return {
      enregistree: false,
      motif:
        erreur instanceof ErreurApi && erreur.statut !== null
          ? erreur.message
          : "Le service d'enregistrement est momentanément indisponible.",
    };
  }
}

// ══ La console du responsable (pas 64) ═══════════════════════════════════════
//
// ⚠️ Aucun auteur ne part dans les corps : qui affecte, qui classe, qui a appelé est
// le compte de la session, lu par le backend (pas 63). Les refus du domaine (motif
// hors vocabulaire, dossier déjà payé, rappel déjà clos) s'affichent tels quels.

const CHEMIN_CONSOLE = "/[locale]/acquisition";

export async function affecterLeDossier(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = String(donnees.get("reference") ?? "").trim();
  if (!reference) return { echec: "Dossier non désigné.", fait: null };
  try {
    const resultat = await appeler<{
      affecte: boolean;
      responsable: string | null;
      motif: string | null;
      empechements: string[];
    }>(`/acquisition/dossiers/${encodeURIComponent(reference)}/affectation`, {
      methode: "POST",
      authentifie: true,
      corps: {},
    });
    revalidatePath(CHEMIN_CONSOLE, "page");
    // ⚠️ Une absence de candidat n'est pas une erreur : le backend rend 200 et les
    // empêchements. L'écran le dit comme un fait, pas comme une panne.
    return resultat.affecte
      ? { echec: null, fait: `Affecté. ${resultat.motif ?? ""}`.trim() }
      : {
          echec: `Aucun collaborateur ne convient : ${resultat.empechements.join(" ; ") || "aucun candidat"}.`,
          fait: null,
        };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function classerSansSuite(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = String(donnees.get("reference") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  const precision = String(donnees.get("precision") ?? "").trim();
  if (!reference) return { echec: "Dossier non désigné.", fait: null };
  if (!motif) return { echec: "Choisissez un motif.", fait: null };
  try {
    await appeler(`/acquisition/dossiers/${encodeURIComponent(reference)}/sans-suite`, {
      methode: "POST",
      authentifie: true,
      corps: { motif, precision },
    });
    revalidatePath(CHEMIN_CONSOLE, "page");
    return { echec: null, fait: "Dossier classé sans suite. Il n'est pas supprimé." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function cloreLeRappel(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "").trim();
  if (!identifiant) return { echec: "Rappel non désigné.", fait: null };
  try {
    await appeler(`/acquisition/rappels/${encodeURIComponent(identifiant)}/fait`, {
      methode: "POST",
      authentifie: true,
      corps: {},
    });
    revalidatePath(CHEMIN_CONSOLE, "page");
    return { echec: null, fait: "Rappel noté comme passé, à votre nom." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

// ══ La fiche d'un dossier (pas 66) ═══════════════════════════════════════════

export type EtatChiffrage = { echec: string | null; proposition: Proposition | null };

/**
 * Enregistre les réponses saisies pendant l'échange.
 *
 * ⚠️ **Seules les réponses renseignées partent.** Le backend refuse une réponse vide
 * à une question obligatoire, et c'est juste : ce serait la faire sortir des
 * manquantes sans répondre à rien. Le formulaire envoie donc ce qui est rempli, et la
 * qualification se complète au fil des appels, comme le métier le fait.
 */
export async function enregistrerLaQualification(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const reference = String(donnees.get("reference") ?? "").trim();
  if (!reference) return { echec: "Dossier non désigné.", fait: null };
  const reponses: { code: string; valeur: string }[] = [];
  for (const [cle, valeur] of donnees.entries()) {
    if (!cle.startsWith("q_") || typeof valeur !== "string" || !valeur.trim()) continue;
    reponses.push({ code: cle.slice(2), valeur: valeur.trim() });
  }
  const note = String(donnees.get("note") ?? "").trim();
  if (reponses.length === 0 && !note) {
    return { echec: "Aucune réponse saisie.", fait: null };
  }
  try {
    const resultat = await appeler<{ complete: boolean; manquantes: string[] }>(
      `/acquisition/dossiers/${encodeURIComponent(reference)}/qualification`,
      { methode: "POST", authentifie: true, corps: { reponses, note } },
    );
    revalidatePath("/[locale]/acquisition/[reference]", "page");
    return {
      echec: null,
      fait: resultat.complete
        ? "Qualification complète : le dossier peut être chiffré."
        : `Enregistré. Il manque encore : ${resultat.manquantes.join(", ")}.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Calcule la proposition sur la qualification **enregistrée** (pas 65).
 *
 * ⚠️ Aucun fait ne part d'ici : l'écran envoie le score de charge déclaré, rien
 * d'autre. Les ajustements écartés faute de réponse reviennent dans `echecs`, et
 * l'écran les montre comme des questions à poser (pas 66).
 */
export async function chiffrerLeDossier(
  _precedent: EtatChiffrage,
  donnees: FormData,
): Promise<EtatChiffrage> {
  const reference = String(donnees.get("reference") ?? "").trim();
  const score = String(donnees.get("score_charge") ?? "0").trim() || "0";
  if (!/^\d+$/.test(score)) {
    return { echec: "Le score de charge est un entier positif.", proposition: null };
  }
  try {
    const proposition = await appeler<Proposition>(
      `/acquisition/dossiers/${encodeURIComponent(reference)}/chiffrage`,
      { methode: "POST", authentifie: true, corps: { score_charge: Number(score) } },
    );
    revalidatePath("/[locale]/acquisition/[reference]", "page");
    return { echec: null, proposition };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, proposition: null };
    throw erreur;
  }
}


// ══ La proforma (pas 67) ═════════════════════════════════════════════════════

export type EtatEmission = {
  echec: string | null;
  proforma: ProformaEmise | null;
  /** Le lien à envoyer au client, **affiché une seule fois** : le backend ne le rend qu'à l'émission. */
  lien: string | null;
};

/**
 * Émet la proforma au montant arrêté.
 *
 * ⚠️ L'intervalle, la version du barème et les faits ne partent pas : le backend les
 * recalcule sur la qualification enregistrée (pas 65). L'écran envoie ce que le
 * responsable décide, le montant et son motif, et le score de charge déclaré.
 *
 * ⚠️ Le lien d'acceptation n'est rendu qu'ici. Il est construit sur l'adresse publique
 * du site, et l'écran dit de le copier maintenant.
 */
export async function emettreLaProforma(_precedent: EtatEmission, donnees: FormData): Promise<EtatEmission> {
  const reference = String(donnees.get("reference") ?? "").trim();
  const montant = String(donnees.get("montant") ?? "").replace(/\s/g, "");
  const motif = String(donnees.get("motif") ?? "").trim();
  const score = String(donnees.get("score_charge") ?? "0").trim() || "0";
  const vide = { proforma: null, lien: null };
  if (!/^\d+$/.test(montant)) return { echec: "Le montant arrêté s'écrit en francs, sans décimales.", ...vide };
  if (!/^\d+$/.test(score)) return { echec: "Le score de charge est un entier positif.", ...vide };
  try {
    const proforma = await appeler<ProformaEmise>(
      `/acquisition/dossiers/${encodeURIComponent(reference)}/proforma`,
      {
        methode: "POST",
        authentifie: true,
        corps: { montant, motif: motif || null, score_charge: Number(score) },
      },
    );
    revalidatePath("/[locale]/acquisition/[reference]", "page");
    const lien =
      proforma.lien_acceptation && proforma.expire_le
        ? adresseAbsolue(
            `/proforma/${encodeURIComponent(proforma.numero)}?v=${proforma.version}` +
              `&e=${encodeURIComponent(proforma.expire_le)}&s=${proforma.lien_acceptation}`,
          )
        : null;
    return { echec: null, proforma, lien };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, ...vide };
    throw erreur;
  }
}

/** Note que le lien est parti chez le client : c'est cette date qui arme la relance. */
export async function transmettreLaProforma(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const numero = String(donnees.get("numero") ?? "").trim();
  if (!numero) return { echec: "Proforma non désignée.", fait: null };
  try {
    await appeler(`/acquisition/proformas/${encodeURIComponent(numero)}/transmission`, {
      methode: "POST",
      authentifie: true,
    });
    revalidatePath("/[locale]/acquisition/[reference]", "page");
    return { echec: null, fait: "Transmission notée : la relance est armée si le client ne répond pas." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

// ══ Côté client, sans compte (pas 67) ════════════════════════════════════════

export type LienPresente = { numero: string; version: string; expire_le: string; sceau: string };

/** Lit la proforma par le lien signé. Publique : le sceau est l'authentification. */
export async function consulterLaProforma(lien: LienPresente): Promise<ProformaConsultee | { echec: string }> {
  const p = new URLSearchParams({ version: lien.version, expire_le: lien.expire_le, sceau: lien.sceau });
  try {
    return await appeler<ProformaConsultee>(
      `/acquisition/proformas/${encodeURIComponent(lien.numero)}/consultation?${p}`,
    );
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message };
    throw erreur;
  }
}

/**
 * Le client accepte. **Vaut engagement** : l'identité déclarée et la case cochée
 * sont exigées ici avant l'envoi, et le backend fige le montant, la date et l'origine.
 */
export async function accepterLaProforma(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const numero = String(donnees.get("numero") ?? "").trim();
  const identite = String(donnees.get("identite_declaree") ?? "").trim();
  if (identite.length < 2) return { echec: "Indiquez votre nom et votre qualité.", fait: null };
  if (donnees.get("engagement") !== "oui") {
    return { echec: "Cochez la case pour confirmer votre accord.", fait: null };
  }
  try {
    await appeler(`/acquisition/proformas/${encodeURIComponent(numero)}/acceptation`, {
      methode: "POST",
      corps: {
        version: Number(donnees.get("version")),
        expire_le: String(donnees.get("expire_le") ?? ""),
        sceau: String(donnees.get("sceau") ?? ""),
        identite_declaree: identite,
      },
    });
    return { echec: null, fait: "Votre accord est enregistré. Le cabinet revient vers vous pour le règlement." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}


// ══ Le règlement (pas 68) ════════════════════════════════════════════════════

/**
 * Demande le débit sur le téléphone du client. **N'encaisse rien.**
 *
 * ⚠️ Le backend répond « la demande est partie », pas « le client a payé » : le client
 * doit encore saisir son code. L'espace s'ouvrira sur la notification de l'opérateur.
 * L'adresse choisie est retenue et ne se remplace plus.
 */
export async function demanderLeReglement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const numero = String(donnees.get("numero") ?? "").trim();
  const slug = String(donnees.get("slug") ?? "").trim().toLowerCase();
  const telephone = String(donnees.get("telephone") ?? "").trim();
  if (!numero || slug.length < 3) return { echec: "Choisissez l'adresse de l'espace du client.", fait: null };
  try {
    const r = await appeler<{ accepte: boolean; message: string; telephone: string; montant: string }>(
      `/acquisition/proformas/${encodeURIComponent(numero)}/reglement`,
      { methode: "POST", authentifie: true, corps: { slug, telephone } },
    );
    revalidatePath("/[locale]/acquisition/[reference]", "page");
    return r.accepte
      ? { echec: null, fait: `Demande envoyée au ${r.telephone} : le client doit valider sur son téléphone. ${r.message}`.trim() }
      : { echec: `L'opérateur n'a pas accepté la demande : ${r.message}`, fait: null };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Confirme un règlement reçu hors téléphone : espèces, virement. **Ouvre l'espace du client.**
 *
 * ⚠️ La case de confirmation est vérifiée ici : c'est un rapprochement fait par un humain,
 * et il ouvre un espace. L'adresse doit être celle déjà retenue, s'il y en a une (pas 68).
 */
export async function confirmerLEncaissement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const numero = String(donnees.get("numero") ?? "").trim();
  const slug = String(donnees.get("slug") ?? "").trim().toLowerCase();
  const reference = String(donnees.get("reference_externe") ?? "").trim();
  if (!numero || slug.length < 3) return { echec: "Choisissez l'adresse de l'espace du client.", fait: null };
  if (donnees.get("rapproche") !== "oui") {
    return { echec: "Cochez la case : le règlement doit avoir été constaté avant d'ouvrir l'espace.", fait: null };
  }
  try {
    const r = await appeler<{ etat: string; tenant: string | null; rejeu: boolean }>(
      `/acquisition/proformas/${encodeURIComponent(numero)}/encaissement`,
      { methode: "POST", authentifie: true, corps: { slug, reference_externe: reference } },
    );
    revalidatePath("/[locale]/acquisition/[reference]", "page");
    return {
      echec: null,
      fait: r.rejeu
        ? "Ce règlement était déjà confirmé : aucun second espace n'est ouvert."
        : `Règlement confirmé. L'espace « ${slug} » s'ouvre.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
