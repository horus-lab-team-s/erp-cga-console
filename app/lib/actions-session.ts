"use server";

/**
 * Ouvrir et fermer une session, depuis le serveur Next.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI DES ACTIONS SERVEUR ET NON UN APPEL DEPUIS LE NAVIGATEUR
 *
 * Parce que le témoin doit être `HttpOnly`. S'il était posé par du JavaScript de
 * page, il serait par construction lisible par du JavaScript de page — donc
 * exfiltrable par la première injection venue. Il est donc posé par le serveur,
 * sur la réponse à l'action, et le navigateur ne le voit jamais.
 *
 * Le mot de passe ne transite ainsi que sur une seule origine, celle du site, et
 * n'apparaît dans aucune requête que l'onglet réseau du navigateur montrerait
 * vers un tiers.
 *
 * LE BACKEND REND L'IDENTIFIANT DE SESSION DANS SON CORPS
 *
 * On le lit là plutôt que de démonter l'en-tête `Set-Cookie` de sa réponse.
 * Analyser un `Set-Cookie` à la main est une source d'erreurs connue — attributs
 * dans un ordre variable, valeurs entre guillemets — et il n'y a rien à y gagner
 * ici puisque l'information est déjà rendue proprement.
 *
 * LE MESSAGE D'ÉCHEC EST CELUI DU BACKEND, TEL QUEL
 *
 * Le backend rend délibérément **le même message** quelle que soit la cause :
 * compte inconnu, mot de passe faux, compte suspendu, jamais activé, verrouillé.
 * Le reformuler ici, ou tenter de le préciser, rouvrirait l'oracle d'énumération
 * que le backend prend soin de refermer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import { appeler, ErreurApi, TEMOIN_SESSION } from "./api";
import type { Acces } from "./acces";

/** Douze heures — la durée de session du backend. Voir `DUREE_SESSION`. */
const DUREE_TEMOIN = 12 * 60 * 60;

/**
 * La connexion en cours est-elle chiffrée ?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI PAS `NODE_ENV === "production"`, QUI ÉTAIT LA VERSION PRÉCÉDENTE
 *
 * Parce que `NODE_ENV` décrit la **compilation**, pas le transport. Une image de
 * production servie en clair — `docker compose up`, une recette derrière un
 * simple port, une démonstration sur un poste — posait un témoin `Secure` que
 * le navigateur refusait ensuite de renvoyer.
 *
 * Le symptôme est déroutant et parfaitement silencieux : la connexion **réussit**,
 * la redirection part vers le tableau de bord, et la page suivante renvoie à
 * l'écran de connexion. Aucune erreur, aucune trace, rien à chercher. J'y suis
 * tombé en soumettant le formulaire comme le ferait un navigateur.
 *
 * `x-forwarded-proto` dit la vérité sur le transport réel : un mandataire qui
 * termine le TLS le pose à `https`, une connexion directe en clair ne le pose
 * pas. Le témoin est donc `Secure` exactement quand il peut l'être.
 *
 * ⚠️ LE MANDATAIRE DOIT POSER CET EN-TÊTE
 *
 * S'il l'oublie, le témoin de session circulera sans `Secure` en production. La
 * même exigence pèse déjà sur l'API, dont la limitation de débit lit l'adresse
 * reconstituée par le mandataire — c'est la même ligne de configuration, et elle
 * est signalée dans les deux `Dockerfile`.
 *
 * `HttpOnly` et `SameSite=Lax` s'appliquent dans tous les cas : ils ne dépendent
 * pas du transport.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function surHttps(): Promise<boolean> {
  const { headers } = await import("next/headers");
  const entetes = await headers();
  return (entetes.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
}

export type EtatConnexion = {
  echec: string | null;
};

export async function connexion(
  _precedent: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const courriel = String(donnees.get("courriel") ?? "").trim();
  const motDePasse = String(donnees.get("motDePasse") ?? "");

  if (!courriel || !motDePasse) {
    return { echec: "Renseigner l'adresse et le mot de passe." };
  }

  let acces: Acces;
  try {
    acces = await appeler<Acces>("/transverse/session", {
      methode: "POST",
      corps: { courriel, mot_de_passe: motDePasse },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message };
    throw erreur;
  }

  const magasin = await cookies();
  magasin.set(TEMOIN_SESSION, acces.session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_TEMOIN,
    secure: await surHttps(),
  });

  const langue = await getLocale();
  // Le routage dépend du profil, et il se décide **après** authentification : la
  // page de connexion n'offre aucun choix d'espace, parce qu'il n'y a rien à
  // choisir. Un adhérent qui atterrirait sur l'espace de travail y verrait des
  // écrans dont aucune donnée ne le concerne.
  redirect({ href: acces.interne ? "/tableau-de-bord" : "/mon-espace", locale: langue });

  // `redirect` interrompt l'exécution en levant : la ligne suivante n'est jamais
  // atteinte. Elle est là parce que le vérificateur de types l'ignore, et non
  // parce qu'un cas de sortie manquerait.
  return { echec: null };
}

export async function deconnexion(): Promise<void> {
  const magasin = await cookies();
  const session = magasin.get(TEMOIN_SESSION)?.value;

  if (session) {
    try {
      // On ferme la session **côté serveur** avant d'effacer le témoin. L'ordre
      // inverse laisserait une session vivante que plus personne ne peut fermer :
      // le témoin effacé, on ne saurait même plus laquelle révoquer.
      await appeler<void>("/transverse/session", {
        methode: "DELETE",
        authentifie: true,
      });
    } catch {
      // Une déconnexion qui échoue parce que la session avait déjà expiré
      // donnerait une erreur à quelqu'un qui a fait exactement ce qu'il fallait.
      // On efface le témoin dans tous les cas.
    }
  }

  magasin.delete(TEMOIN_SESSION);
  const langue = await getLocale();
  redirect({ href: "/connexion", locale: langue });
}

// ── Définir son mot de passe depuis un lien ─────────────────────────────────
//
// ⚠️ CETTE ACTION FERMAIT LE PARCOURS, ET ELLE N'EXISTAIT PAS.
//
// Le paiement validé faisait partir un courriel dont le lien menait à
// `/activation?jeton=…` — une page **absente**. Un adhérent qui venait de payer
// tombait donc sur un 404, et le seul chemin vers son espace était mort. Le
// backend était complet des deux côtés : la route de définition existait, le
// jeton était émis, l'audit tracé. Il manquait vingt lignes au milieu.
//
// C'est la classe de défaut la plus coûteuse : chaque moitié fonctionne, les
// tests des deux moitiés passent, et personne ne parcourt le chemin entier.

export type EtatDefinition = {
  echec: string | null;
};

export async function definirMotDePasse(
  _precedent: EtatDefinition,
  donnees: FormData,
): Promise<EtatDefinition> {
  const jeton = String(donnees.get("jeton") ?? "");
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");

  if (!jeton) {
    return {
      echec:
        "Ce lien est incomplet. Ouvrez-le depuis le courriel plutôt que de le recopier.",
    };
  }
  if (!motDePasse) return { echec: "Choisissez un mot de passe." };
  // ⚠️ La confirmation se vérifie **ici**, avant l'appel. Le lien est à usage
  // unique : le laisser consommer par une faute de frappe obligerait à en
  // redemander un, et l'adhérent qui vient de payer ne comprendrait pas.
  if (motDePasse !== confirmation) {
    return { echec: "Les deux saisies diffèrent. Vérifiez avant de valider." };
  }

  try {
    await appeler<unknown>("/transverse/mot-de-passe/definition", {
      methode: "POST",
      corps: { secret: jeton, mot_de_passe: motDePasse },
    });
  } catch (erreur) {
    // Le message du backend se montre tel quel, et c'est voulu : celui qui
    // choisit son mot de passe est légitime, et un refus sans motif le fait
    // essayer au hasard. C'est l'inverse exact de la connexion, où le message
    // est délibérément indifférencié.
    if (erreur instanceof ErreurApi) return { echec: erreur.message };
    throw erreur;
  }

  const langue = await getLocale();
  // On ne connecte pas d'office. Saisir son mot de passe une première fois est
  // ce qui l'ancre ; enchaîner directement sur l'espace le fait oublier avant
  // le lendemain.
  redirect({ href: "/connexion?defini=1", locale: langue });
  return { echec: null };
}

// ── Demander un lien de réinitialisation ────────────────────────────────────
//
// ⚠️ ELLE MANQUAIT AUSSI, ET LE SYMPTÔME ÉTAIT PLUS DISCRET.
//
// « Mot de passe oublié ? » figurait dans les traductions depuis l'origine, et
// n'était **rendu nulle part**. La route backend existait, le gabarit de
// courriel existait, le jeton de deux heures existait. Il n'y avait aucun moyen
// de déclencher tout cela depuis le site.
//
// C'est le même défaut que la page d'activation absente, en moins visible : là
// un adhérent tombait sur un 404, ici il ne trouve simplement rien — et appelle
// le cabinet.

export type EtatOubli = {
  echec: string | null;
  envoye: boolean;
};

export async function demanderReinitialisation(
  _precedent: EtatOubli,
  donnees: FormData,
): Promise<EtatOubli> {
  const courriel = String(donnees.get("courriel") ?? "").trim();
  if (!courriel) return { echec: "Renseignez votre adresse.", envoye: false };

  try {
    await appeler<unknown>("/transverse/mot-de-passe/oubli", {
      methode: "POST",
      corps: { courriel },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, envoye: false };
    throw erreur;
  }

  // ⚠️ On confirme **toujours**, même si l'adresse est inconnue. Le backend rend
  // déjà la même réponse dans les deux cas ; afficher ici « cette adresse
  // n'existe pas » rouvrirait l'oracle qu'il prend soin de refermer — on essaie
  // mille adresses, on note lesquelles répondent, et l'on obtient la liste des
  // adhérents du cabinet.
  return { echec: null, envoye: true };
}
