"use server";

/**
 * Saisir, valider, contre-passer : les trois écritures du contexte E.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST LA PREMIÈRE ACTION SERVEUR MÉTIER DU PRODUIT
 *
 * Jusqu'ici, la seule action serveur de toute l'application était la connexion.
 * L'espace de travail **lisait** : seize écrans, aucun formulaire. L'API savait
 * pourtant écrire, et un cabinet ne pouvait pas s'en servir, faute d'un endroit
 * où taper.
 *
 * POURQUOI DES ACTIONS SERVEUR ET NON UN APPEL DEPUIS LE NAVIGATEUR
 *
 * Le témoin de session est `HttpOnly` : le JavaScript de la page ne peut pas le
 * lire, donc pas l'envoyer. C'est délibéré, et c'est ce qui rend une injection de
 * script incapable d'exfiltrer la session. L'appel part donc du serveur Next, qui
 * lui a le témoin. Voir `app/lib/api.ts`.
 *
 * ⚠️ LES REFUS DU BACKEND SE MONTRENT TELS QUELS
 *
 * « journal ZZ inconnu pour ce dossier, journaux ouverts : AC, BQ, CA, OD, VE »
 * est exploitable par un comptable ; « erreur lors de l'enregistrement » ne l'est
 * pas. Le backend prend soin de nommer ce qui manque et ce qui était possible :
 * le reformuler ici ne ferait que perdre cette information.
 *
 * Contrairement à l'écran de connexion, il n'y a ici aucun oracle à refermer :
 * celui qui saisit est déjà authentifié et habilité sur le dossier.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, controlerPieceDemonstration, ErreurApi } from "./api";
// ⚠️ Les constantes vivent dans `saisie.ts`, pas ici : Next exige que **tout**
// export d'un module « use server » soit une fonction asynchrone, et le message
// d'erreur ne dit pas laquelle des exportations est fautive.
import type { Ecriture, PropositionDEcriture } from "./comptabilite";
import { LIGNES_OFFERTES, type EtatActe, type EtatProposition, type EtatSaisie } from "./saisie";

// ⚠️ Un groupe de routes — `(collaborateur)` — **ne figure pas** dans l'URL, et
// `revalidatePath` attend le chemin tel que le navigateur le voit. L'y laisser
// ne lève aucune erreur : l'invalidation ne trouve simplement rien, et la liste
// des écritures reste celle d'avant la saisie. Le défaut se présente alors comme
// « ma saisie n'a pas été prise en compte », ce qui envoie chercher au mauvais
// endroit. Le segment `[locale]` est dynamique, d'où le second paramètre.
const CHEMIN_SAISIE = "/[locale]/comptabilite/saisie";

type LigneSoumise = {
  compte: string;
  libelle: string;
  sens: "DEBIT" | "CREDIT";
  montant: string;
};

/**
 * Relève les lignes réellement remplies.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI HUIT LIGNES OFFERTES ET NON UN BOUTON « AJOUTER UNE LIGNE »
 *
 * Parce qu'un bouton qui ajoute une ligne suppose du JavaScript, et que le
 * formulaire doit fonctionner sans. Sur les connexions visées, c'est la
 * différence entre « je saisis » et « la page ne fait rien ».
 *
 * Huit lignes couvrent l'écrasante majorité des écritures d'un cabinet : un achat
 * avec TVA en compte trois, une paie en compte sept. Au-delà, on saisit en deux
 * écritures — ce que fait de toute façon un comptable devant un journal papier.
 *
 * Les lignes vides sont **ignorées**, pas refusées : un formulaire qui exigerait
 * de remplir ses huit lignes serait inutilisable.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function lignesRemplies(donnees: FormData): LigneSoumise[] {
  const lignes: LigneSoumise[] = [];
  // ⚠️ Pas 72 : un brouillon à corriger peut compter plus de huit lignes (une reprise,
  // une paie). Le formulaire dit combien il en offre ; au-delà de cent, c'est une
  // requête fabriquée, pas un formulaire.
  const offertes = Math.min(Number(donnees.get("lignes_offertes")) || LIGNES_OFFERTES, 100);
  for (let rang = 0; rang < offertes; rang += 1) {
    const compte = String(donnees.get(`compte-${rang}`) ?? "").trim();
    const montant = String(donnees.get(`montant-${rang}`) ?? "").trim();
    // Ni compte ni montant : la ligne n'a pas été employée.
    if (!compte && !montant) continue;
    lignes.push({
      compte,
      libelle: String(donnees.get(`libelle-${rang}`) ?? "").trim(),
      sens: String(donnees.get(`sens-${rang}`) ?? "DEBIT") === "CREDIT" ? "CREDIT" : "DEBIT",
      montant: montant.replace(/\s/g, "").replace(",", "."),
    });
  }
  return lignes;
}

/**
 * Relit et contrôle ce que la saisie et la correction partagent (pas 72).
 *
 * ⚠️ Un seul corps pour les deux actions : la correction est une saisie à un numéro
 * existant. Deux copies de ces contrôles finiraient par ne plus refuser la même chose.
 */
function contenuSaisi(
  donnees: FormData,
): { echec: string } | { corps: Omit<Record<string, unknown>, "journal" | "exercice"> } {
  const dateOperation = String(donnees.get("date_operation") ?? "").trim();
  const libelle = String(donnees.get("libelle") ?? "").trim();
  const piece = String(donnees.get("piece_justificative") ?? "").trim();
  if (!dateOperation) return { echec: "Renseigner la date de l'opération." };
  if (!libelle) {
    return { echec: "Renseigner le libellé : c'est ce qu'un vérificateur lit en premier." };
  }

  const lignes = lignesRemplies(donnees);
  // ⚠️ Ces deux contrôles-ci sont faits **avant** l'appel, et ce sont les seuls.
  // Ils évitent un aller-retour sur une saisie manifestement inachevée. Tout le
  // reste — équilibre, existence des comptes, exercice ouvert — appartient au
  // backend, qui est le seul à pouvoir le dire, et le seul dont la réponse
  // engage. Recopier une règle métier ici en produirait une seconde version,
  // qui divergerait.
  if (lignes.length < 2) {
    return { echec: "Une écriture compte au moins deux lignes : au moins un débit et un crédit." };
  }
  if (lignes.some((l) => !l.compte || !l.montant || !l.libelle)) {
    return { echec: "Chaque ligne commencée doit porter un compte, un libellé et un montant." };
  }
  return {
    corps: {
      date_operation: dateOperation,
      libelle,
      piece_justificative: piece || null,
      lignes: lignes.map((l) => ({ compte: l.compte, libelle: l.libelle, sens: l.sens, montant: l.montant })),
    },
  };
}

export async function saisirEcriture(
  _precedent: EtatSaisie,
  donnees: FormData,
): Promise<EtatSaisie> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const exercice = String(donnees.get("exercice") ?? "").trim();
  const journal = String(donnees.get("journal") ?? "").trim();
  if (!dossier || !exercice || !journal) {
    return { echec: "Dossier, exercice et journal sont requis.", enregistree: null };
  }
  const contenu = contenuSaisi(donnees);
  if ("echec" in contenu) return { echec: contenu.echec, enregistree: null };

  try {
    const enregistree = await appeler<Ecriture>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures`,
      { methode: "POST", authentifie: true, corps: { journal, exercice, ...contenu.corps } },
    );
    revalidatePath(CHEMIN_SAISIE, "page");
    return { echec: null, enregistree };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, enregistree: null };
    throw erreur;
  }
}

/**
 * Corriger un brouillon, à son numéro (pas 72).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'ÉCRAN LE PROMETTAIT DEPUIS LE PREMIER JOUR
 *
 * Le message de réussite de la saisie disait « reste modifiable tant qu'elle n'est
 * pas validée ». Aucune route ne corrigeait : un brouillon saisi sans pièce ne se
 * validait pas, ne se contre-passait pas, et bloquait la clôture de l'exercice.
 *
 * Ni le journal ni l'exercice ne sont envoyés : ils font partie de la clé, et le
 * backend refuse tout champ qu'il n'attend pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function corrigerEcriture(
  _precedent: EtatSaisie,
  donnees: FormData,
): Promise<EtatSaisie> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const cle = String(donnees.get("cle") ?? "").trim();
  if (!dossier || !/^[^/]+\/[^/]+\/\d+$/.test(cle)) {
    return { echec: "Écriture non désignée.", enregistree: null };
  }
  const contenu = contenuSaisi(donnees);
  if ("echec" in contenu) return { echec: contenu.echec, enregistree: null };

  try {
    const enregistree = await appeler<Ecriture>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures/${cle}/correction`,
      { methode: "POST", authentifie: true, corps: contenu.corps },
    );
    revalidatePath(CHEMIN_SAISIE, "page");
    return { echec: null, enregistree };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, enregistree: null };
    throw erreur;
  }
}

/**
 * Valider engage l'écriture, et elle devient immuable.
 *
 * Le formulaire n'a qu'un bouton et aucun champ : il n'y a rien à saisir, et
 * demander une confirmation supplémentaire n'ajouterait aucune information, juste
 * un clic. Ce qui protège ici, c'est que la correction reste possible par
 * contre-passation, pas qu'on rende le geste pénible.
 */
export async function validerEcriture(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const cle = String(donnees.get("cle") ?? "").trim();
  if (!dossier || !cle) return { echec: "Écriture non désignée.", fait: null };

  try {
    const validee = await appeler<Ecriture>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures/${cle}/validation`,
      { methode: "POST", authentifie: true },
    );
    revalidatePath(CHEMIN_SAISIE, "page");
    return {
      echec: null,
      fait: `Écriture ${validee.journal} n° ${validee.numero} validée. Elle est désormais immuable.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Contre-passer annule par une écriture inverse, jamais par une suppression.
 *
 * ⚠️ Le motif est exigé **deux fois** par le backend, et pour deux raisons
 * distinctes : le contrôle d'accès le réclame parce que `CONTRE_PASSER` figure
 * parmi les actes qui se justifient, et le domaine le réclame pour l'inscrire
 * dans l'écriture elle-même. Un motif vide reçoit donc un 403, pas un 409 : ce
 * n'est pas l'écriture qui est refusée, c'est l'acte.
 *
 * ⚠️ La date est celle du constat, et le backend la borne depuis le pas 71 : jamais
 * avant l'écriture d'origine, jamais hors de son exercice, jamais dans un exercice
 * clos. Avant, elle n'était comparée à rien, et une contre-passation après clôture
 * modifiait la balance d'un exercice déjà déclaré. Les refus s'affichent tels quels.
 */
export async function contrepasserEcriture(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const cle = String(donnees.get("cle") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  // Le jour du constat (pas 71). Vide : le backend retient aujourd'hui.
  const dateOperation = String(donnees.get("date_operation") ?? "").trim();
  if (!dossier || !cle) return { echec: "Écriture non désignée.", fait: null };
  if (dateOperation && !/^\d{4}-\d{2}-\d{2}$/.test(dateOperation)) {
    return { echec: "Date du constat illisible.", fait: null };
  }
  if (!motif) {
    return {
      echec:
        "Le motif est obligatoire : six mois plus tard, personne ne saura si l'écriture " +
        "d'origine était fausse ou si elle a été annulée par erreur.",
      fait: null,
    };
  }

  try {
    const inverse = await appeler<Ecriture>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures/${cle}/contre-passation`,
      {
        methode: "POST",
        authentifie: true,
        corps: dateOperation ? { motif, date_operation: dateOperation } : { motif },
      },
    );
    revalidatePath(CHEMIN_SAISIE, "page");
    // Pas 110 : la fiche de l'écriture montre aussi qu'elle est contre-passée.
    revalidatePath("/[locale]/comptabilite/ecritures", "page");
    return {
      echec: null,
      fait:
        `Contre-passation enregistrée en brouillon sous ${inverse.journal} n° ${inverse.numero}. ` +
        "Elle reste à valider, comme toute écriture.",
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Signaler une écriture au réviseur, depuis sa fiche (pas 110). Le signalement est une entrée du
 * journal d'audit, que les abonnements annoncent aux réviseurs du dossier.
 */
export async function signalerAuReviseur(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = encodeURIComponent(String(donnees.get("dossier") ?? ""));
  const exercice = encodeURIComponent(String(donnees.get("exercice") ?? ""));
  const journal = encodeURIComponent(String(donnees.get("journal") ?? ""));
  const numero = Number(donnees.get("numero"));
  const message = String(donnees.get("message") ?? "").trim();
  if (message.length < 10) return { echec: "Dites au réviseur ce qu'il doit regarder (10 caractères au moins).", fait: null };
  try {
    await appeler(`/comptabilite/dossiers/${dossier}/ecritures/${exercice}/${journal}/${numero}/signalement`, {
      methode: "POST",
      authentifie: true,
      corps: { message },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  revalidatePath("/[locale]/comptabilite/ecritures", "page");
  return { echec: null, fait: "Signalée : les réviseurs du dossier sont prévenus." };
}

/**
 * La proposition d'écriture d'une pièce, refaite côté serveur (pas 73).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE NAVIGATEUR N'ENVOIE QUE LA RÉFÉRENCE DE LA PIÈCE
 *
 * La facture est relue ici, auprès du backend, et proposée dans le dossier de son
 * destinataire. Envoyer depuis le navigateur la facture ou les lignes proposées
 * permettrait de les retoucher entre l'affichage et l'enregistrement : c'est
 * exactement ce qu'on a trouvé côté API au pas 73, où le régime déclaré dans la
 * requête décidait de la TVA récupérable.
 *
 * Le backend rattache désormais la facture au portefeuille et dit ce qu'il a
 * rectifié : l'écran l'affiche au lieu de le taire.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function proposer(reference: string): Promise<{ dossier: string; proposition: PropositionDEcriture }> {
  const { facture } = await controlerPieceDemonstration(reference);
  const dossier = facture.destinataire.niu;
  if (!dossier) {
    throw new ErreurApi(
      "Cette pièce ne désigne aucun destinataire : elle n'appartient encore à aucun dossier.",
      409,
    );
  }
  const proposition = await appeler<PropositionDEcriture>(
    `/comptabilite/dossiers/${encodeURIComponent(dossier)}/propositions`,
    { methode: "POST", authentifie: true, corps: { facture, journal: "AC" } },
  );
  return { dossier, proposition };
}

export async function proposerLEcritureDeLaPiece(
  _precedent: EtatProposition,
  donnees: FormData,
): Promise<EtatProposition> {
  const reference = String(donnees.get("reference") ?? "").trim();
  if (!reference) return { echec: "Pièce non désignée.", proposition: null, dossier: null, enregistree: null };
  try {
    const { dossier, proposition } = await proposer(reference);
    return { echec: null, proposition, dossier, enregistree: null };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return { echec: erreur.message, proposition: null, dossier: null, enregistree: null };
    }
    throw erreur;
  }
}

/**
 * Enregistre en brouillon l'écriture proposée pour une pièce.
 *
 * ⚠️ La proposition est **refaite** avant d'enregistrer, et c'est sa saisie qui part,
 * au champ près. Si la pièce, le référentiel ou le portefeuille ont changé depuis
 * l'affichage, c'est la version du moment qui s'enregistre : le brouillon se relit
 * de toute façon avant validation, sur l'écran de saisie.
 */
export async function enregistrerLEcritureDeLaPiece(
  _precedent: EtatProposition,
  donnees: FormData,
): Promise<EtatProposition> {
  const reference = String(donnees.get("reference") ?? "").trim();
  if (!reference) return { echec: "Pièce non désignée.", proposition: null, dossier: null, enregistree: null };
  try {
    const { dossier, proposition } = await proposer(reference);
    if (!proposition.comptabilisable || !proposition.saisie) {
      return { echec: proposition.empechements.join(" ") || "Pièce non comptabilisable.", proposition, dossier, enregistree: null };
    }
    const enregistree = await appeler<Ecriture>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures`,
      { methode: "POST", authentifie: true, corps: proposition.saisie },
    );
    revalidatePath(CHEMIN_SAISIE, "page");
    return { echec: null, proposition, dossier, enregistree };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return { echec: erreur.message, proposition: null, dossier: null, enregistree: null };
    }
    throw erreur;
  }
}
