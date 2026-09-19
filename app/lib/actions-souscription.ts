"use server";

/**
 * Les gestes de la souscription en ligne (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÔTÉ VISITEUR : ÉTABLIR UN DEVIS, S'Y ENGAGER
 *
 * Le devis établi, le visiteur est **redirigé** vers la page du devis : son adresse
 * porte la référence, elle se garde et se partage, et un rafraîchissement ne crée pas
 * un second devis.
 *
 * L'engagement, lui, ne redirige pas : le message du backend dit ce qui va se passer
 * (menu USSD sur le téléphone, ou, en démonstration, paiement validé d'office) et il
 * ne se reconstitue pas depuis la souscription. L'écran l'affiche, avec le lien de suivi.
 *
 * CÔTÉ CABINET : OUVRIR L'ACCÈS APRÈS VÉRIFICATION, RAPPROCHER, APPELER
 *
 * ⚠️ L'auteur de la vérification n'est pas envoyé : le backend le prend de la session.
 * Un champ « vérifié par » dans le formulaire permettrait de faire porter l'ouverture
 * d'un dossier à un collègue.
 *
 * ⚠️ LES RÈGLES RESTENT AU BACKEND
 *
 * Formule impossible à choisir, devis déjà engagé, description trop courte : le backend
 * refuse, et sa phrase s'affiche telle quelle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";
import type { Devis, Engagement, Souscription } from "./souscription";

const CHEMIN_CABINET = "/[locale]/souscriptions";

/** L'état du formulaire d'engagement : le message du backend et la souscription créée. */
export type EtatEngagement = { echec: string | null; message: string | null; souscription: string | null };

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? "").trim();
}

export async function etablirUnDevis(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const service = texte(donnees, "service");
  const formule = texte(donnees, "formule");
  const prospect = {
    nom: texte(donnees, "nom"),
    prenom: texte(donnees, "prenom"),
    courriel: texte(donnees, "courriel"),
    telephone: texte(donnees, "telephone"),
    // `null` et non "" : une chaîne vide serait un NIU déclaré, et faux.
    denomination: texte(donnees, "denomination") || null,
    niu: texte(donnees, "niu").toUpperCase() || null,
    // Chiffres seulement : « 28 000 000 » saisi avec des espaces reste lisible.
    chiffre_affaires_declare: texte(donnees, "chiffre_affaires").replace(/\s/g, "") || null,
  };
  if (!service || !prospect.nom || !prospect.prenom || !prospect.courriel || !prospect.telephone) {
    return { echec: "Service, nom, prénom, adresse et téléphone sont obligatoires.", fait: null };
  }
  let devis: Devis;
  try {
    devis = await appeler<Devis>("/souscription/devis", {
      methode: "POST",
      corps: { prospect, lignes: [{ service, formule: formule || null }] },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  // ⚠️ `redirect` lève : il ne doit pas être dans le `try`, sinon le `catch` l'avalerait.
  redirect({ href: `/souscrire/devis/${devis.reference}`, locale: await getLocale() });
  return { echec: null, fait: null };
}

export async function sEngagerSurLeDevis(_precedent: EtatEngagement, donnees: FormData): Promise<EtatEngagement> {
  const reference = texte(donnees, "reference");
  if (donnees.get("accord") !== "oui") {
    return { echec: "Cochez la case pour confirmer votre engagement.", message: null, souscription: null };
  }
  try {
    const r = await appeler<Engagement>(`/souscription/devis/${encodeURIComponent(reference)}/engagement`, {
      methode: "POST",
      corps: {},
    });
    return { echec: null, message: r.message, souscription: r.souscription.reference };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, message: null, souscription: null };
    throw erreur;
  }
}

export async function activerUneSouscription(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = texte(donnees, "reference");
  const verification = texte(donnees, "verification");
  if (donnees.get("confirmation") !== "oui") {
    return { echec: "Cochez la case : ouvrir l'accès donne à cette personne la lecture du dossier.", fait: null };
  }
  // ⚠️ Le backend refuse aussi (vingt caractères), mais avec le message anglais de sa
  // validation : « String should have at least 20 characters ». Constaté à l'essai réel.
  // Le seuil reste celui du backend ; ici, on ne fait que le dire en français.
  if (verification.length < 20) {
    return { echec: "Décrivez la vérification faite (au moins vingt caractères) : pièces présentées, par qui, quand.", fait: null };
  }
  try {
    const s = await appeler<Souscription>(`/souscription/souscriptions/${encodeURIComponent(reference)}/activation`, {
      methode: "POST",
      authentifie: true,
      corps: { verification },
    });
    revalidatePath(CHEMIN_CABINET, "page");
    return { echec: null, fait: `Accès ouvert à ${s.prospect.courriel} ; le lien d'activation lui est parti.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

// Sans paramètre : ni l'état précédent ni le formulaire ne changent ce que la tâche fait.
export async function lancerLaReconciliation(): Promise<EtatActe> {
  try {
    const r = await appeler<{ examines: number; valides: number; repeches: number; indetermines: number }>(
      "/souscription/reconciliation",
      { methode: "POST", authentifie: true },
    );
    revalidatePath(CHEMIN_CABINET, "page");
    return {
      echec: null,
      fait: `${r.examines} paiement(s) interrogé(s) : ${r.valides} validé(s), dont ${r.repeches} repêché(s) ; ${r.indetermines} sans réponse.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function lancerLesPrelevements(): Promise<EtatActe> {
  try {
    const r = await appeler<{ appelees: number; deja_appelees: number; refusees: number; montant_appele: string }>(
      "/souscription/prelevements",
      { methode: "POST", authentifie: true },
    );
    revalidatePath(CHEMIN_CABINET, "page");
    return {
      echec: null,
      fait: `${r.appelees} mensualité(s) appelée(s) pour ${Number(r.montant_appele).toLocaleString("fr-FR")} FCFA ; ${r.deja_appelees} déjà appelée(s), ${r.refusees} refusée(s).`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
