"use server";

/**
 * Les gestes du tunnel de création d'entreprise (pas 82).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AUCUNE DATE N'EST ENVOYÉE
 *
 * Les routes d'écriture acceptaient une date de la requête, qui datait les jalons :
 * un dossier franchissait une étape en 2019 après un dépôt de 2026. Le backend prend
 * désormais la date de son horloge (pas 82), et ces actions n'envoient rien de tel.
 * Seules les dates d'**obtention** d'un identifiant sont saisies : ce sont des faits
 * extérieurs, que le guichet a datés, et le backend refuse une date future.
 *
 * Les règles du tunnel (un cran à la fois, abandon toujours ouvert, conversion
 * seulement à la livraison) restent au backend : sa phrase s'affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { DossierCreation } from "./creations";
import type { EtatActe } from "./saisie";

function rafraichir() {
  revalidatePath("/[locale]/creation-entreprise", "page");
  revalidatePath("/[locale]/creation-entreprise/[reference]", "page");
}

async function geste(appel: () => Promise<unknown>, fait: string): Promise<EtatActe> {
  try {
    await appel();
    rafraichir();
    return { echec: null, fait };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

const champ = (donnees: FormData, cle: string) => String(donnees.get(cle) ?? "").trim();

export async function ouvrirUnDossierDeCreation(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const obligatoires = ["nom", "prenom", "courriel", "telephone", "denomination", "forme", "activite", "siege"];
  if (obligatoires.some((c) => !champ(donnees, c))) {
    return { echec: "Fondateur, dénomination, forme, activité et siège sont obligatoires.", fait: null };
  }
  const capital = champ(donnees, "capital").replace(/\s/g, "");
  if (capital && !/^\d+$/.test(capital)) return { echec: "Capital illisible : écrivez-le en chiffres.", fait: null };
  // La référence est tirée ici, lisible au téléphone : « CR-2026-4F7A ». Le backend refuse
  // une référence déjà prise (409), et l'écran le dit.
  const reference = `CR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  try {
    const dossier = await appeler<DossierCreation>("/creations", {
      methode: "POST",
      authentifie: true,
      corps: {
        reference,
        fondateur: {
          nom: champ(donnees, "nom"),
          prenom: champ(donnees, "prenom"),
          courriel: champ(donnees, "courriel"),
          telephone: champ(donnees, "telephone"),
          piece_identite: champ(donnees, "piece_identite") || null,
        },
        denomination_souhaitee: champ(donnees, "denomination"),
        forme_juridique: champ(donnees, "forme"),
        activite: champ(donnees, "activite"),
        siege: champ(donnees, "siege"),
        capital: capital || null,
      },
    });
    rafraichir();
    return { echec: null, fait: `Dossier ${dossier.reference} ouvert, en qualification.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function franchirUneEtape(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = champ(donnees, "reference");
  const vers = champ(donnees, "vers");
  if (!reference || !vers) return { echec: "Étape non désignée.", fait: null };
  return geste(
    () =>
      appeler<DossierCreation>(`/creations/${encodeURIComponent(reference)}/etape`, {
        methode: "POST",
        authentifie: true,
        corps: { vers, commentaire: champ(donnees, "commentaire") || null },
      }),
    "Étape franchie, datée d'aujourd'hui.",
  );
}

/**
 * Marque une pièce reçue, et **joint son document quand il y en a un**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE DOSSIER NE DOIT PAS PORTER DEUX SORTES DE PIÈCES REÇUES.
 *
 * Depuis le pas 141, la fondatrice dépose ses pièces par son lien signé, et le
 * document est rangé. Un collaborateur qui recevait la même pièce autrement —
 * par messagerie, au guichet, par courriel — ne pouvait que cocher une case :
 * rien ne produisait d'empreinte de son côté.
 *
 * Le dossier portait donc deux sortes de pièces reçues, et six mois plus tard on
 * ne savait plus laquelle portait son document.
 *
 * ⚠️ **LE FICHIER RESTE FACULTATIF.** Une pièce vue au guichet et rendue au
 * client existe : l'exiger empêcherait de la marquer reçue, et le dossier
 * resterait bloqué pour une raison qui n'en est pas une.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function recevoirUnePiece(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = champ(donnees, "reference");
  const code = champ(donnees, "code");
  if (!reference || !code) return { echec: "Pièce non désignée.", fait: null };

  const fichier = donnees.get("fichier");
  let empreinte: string | undefined;
  if (fichier instanceof File && fichier.size > 0) {
    // ⚠️ Deux appels, et l'ordre compte : on ne peut pas citer une empreinte qui
    // n'existe pas encore. C'est le même motif que pour les pièces du cabinet.
    const envoi = new FormData();
    envoi.append("fichier", fichier);
    try {
      const depose = await appeler<{ empreinte: string }>("/collecte/fichiers-de-formalite", {
        methode: "POST",
        authentifie: true,
        formulaire: envoi,
      });
      empreinte = depose.empreinte;
    } catch (erreur) {
      if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
      throw erreur;
    }
  }

  return geste(
    () =>
      appeler<DossierCreation>(`/creations/${encodeURIComponent(reference)}/pieces`, {
        methode: "POST",
        authentifie: true,
        corps: empreinte ? { code, empreinte } : { code },
      }),
    empreinte
      ? "Pièce reçue, document joint au dossier."
      : "Pièce marquée reçue aujourd'hui, sans document.",
  );
}

export async function porterLesIdentifiants(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = champ(donnees, "reference");
  const corps: Record<string, string> = {};
  // ⚠️ Un identifiant et sa date vont ensemble : le backend refuse l'un sans l'autre,
  // parce que la date mesure le délai du guichet. L'écran le vérifie aussi, pour un
  // message avant l'envoi.
  for (const nom of ["rccm", "niu", "patente", "cnps"] as const) {
    const valeur = champ(donnees, nom);
    const cleDate = nom === "patente" || nom === "cnps" ? `${nom}_obtenue_le` : `${nom}_obtenu_le`;
    const date = champ(donnees, cleDate);
    if (!valeur && !date) continue;
    if (!valeur || !date) {
      return { echec: `${nom.toUpperCase()} et sa date d'obtention vont ensemble.`, fait: null };
    }
    corps[nom] = valeur;
    corps[cleDate] = date;
  }
  if (!reference || Object.keys(corps).length === 0) {
    return { echec: "Renseignez au moins un identifiant et sa date.", fait: null };
  }
  return geste(
    () =>
      appeler<DossierCreation>(`/creations/${encodeURIComponent(reference)}/identifiants`, {
        methode: "POST",
        authentifie: true,
        corps,
      }),
    "Identifiants enregistrés.",
  );
}

export async function abandonnerLeDossier(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = champ(donnees, "reference");
  const motif = champ(donnees, "motif");
  if (motif.length < 10) return { echec: "Le motif est obligatoire : c'est ce qui rend le pipeline analysable.", fait: null };
  if (donnees.get("confirmation") !== "oui") {
    return { echec: "Cochez la confirmation : un dossier abandonné ne se rouvre pas.", fait: null };
  }
  return geste(
    () =>
      appeler<DossierCreation>(`/creations/${encodeURIComponent(reference)}/abandon`, {
        methode: "POST",
        authentifie: true,
        corps: { motif },
      }),
    "Dossier abandonné, avec son motif.",
  );
}

export async function convertirLeDossier(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const reference = champ(donnees, "reference");
  const regime = champ(donnees, "regime");
  const centre = champ(donnees, "centre");
  if (!regime || !centre) return { echec: "Choisissez le régime d'entrée et le centre des impôts.", fait: null };
  if (donnees.get("confirmation") !== "oui") {
    return { echec: "Cochez la confirmation : la conversion fait entrer l'entreprise au portefeuille.", fait: null };
  }
  try {
    const r = await appeler<{ niu: string; denomination: string }>(
      `/creations/${encodeURIComponent(reference)}/conversion`,
      { methode: "POST", authentifie: true, corps: { regime, centre, adherent: donnees.get("adherent") === "oui" } },
    );
    rafraichir();
    revalidatePath("/[locale]/portefeuille", "page");
    return { echec: null, fait: `${r.denomination} entre au portefeuille sous le NIU ${r.niu}.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
