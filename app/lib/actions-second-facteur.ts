"use server";

/**
 * Le second facteur, depuis l'écran : enrôler, renforcer, réinitialiser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'ÉCRAN NE DÉCIDE PAS (pas 61)
 *
 * Le pas 60 a fermé une faille : l'enrôlement remplaçait le facteur de n'importe
 * quel compte connecté, et le second facteur tombait devant le mot de passe. Les
 * règles sont toutes au backend : un compte déjà enrôlé ne se ré-enrôle pas sans
 * code, on ne réinitialise pas son propre facteur, la réinitialisation ferme les
 * sessions du titulaire. **Ces actions ne les rejouent pas** ; elles transmettent,
 * et affichent le refus tel quel.
 *
 * ⚠️ LE SECRET N'EST AFFICHÉ QU'UNE FOIS, ET N'EST CONSERVÉ NULLE PART
 *
 * Il revient dans l'état de l'action pour être saisi dans l'application
 * d'authentification, puis disparaît avec la page. Il n'est ni journalisé, ni
 * placé dans un témoin, ni renvoyé au serveur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

export type EtatEnrolement = {
  echec: string | null;
  secret: string | null;
  uri: string | null;
  consigne: string | null;
  /** Vrai quand un lien est parti par courriel : aucun secret n'est rendu (pas 62). */
  confirmation_par_courriel: boolean;
};

type Enrolement = {
  secret: string | null;
  uri: string | null;
  consigne: string;
  confirmation_par_courriel: boolean;
};

const ECHEC = (message: string): EtatEnrolement => ({
  echec: message,
  secret: null,
  uri: null,
  consigne: null,
  confirmation_par_courriel: false,
});

// Sans paramètre : l'état précédent et le formulaire vide n'apportent rien, et
// `useActionState` accepte une action qui les ignore.
export async function enrolerSecondFacteur(): Promise<EtatEnrolement> {
  try {
    const enrolement = await appeler<Enrolement>("/transverse/second-facteur", {
      methode: "POST",
      authentifie: true,
    });
    return { echec: null, ...enrolement };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return ECHEC(erreur.message);
    throw erreur;
  }
}

/**
 * Présente le jeton reçu par courriel et rend la clé, une seule fois.
 *
 * ⚠️ Appelée **au clic**, jamais à l'ouverture de la page : les messageries
 * professionnelles ouvrent les liens pour les analyser, et un jeton consommé à
 * l'affichage serait consommé par l'antivirus, qui verrait la clé à la place du
 * titulaire.
 */
export async function confirmerEnrolement(
  _precedent: EtatEnrolement,
  donnees: FormData,
): Promise<EtatEnrolement> {
  const jeton = String(donnees.get("jeton") ?? "").trim();
  if (!jeton) return ECHEC("Lien incomplet : rouvrez le lien reçu par courriel.");
  try {
    const enrolement = await appeler<Enrolement>("/transverse/second-facteur/confirmation", {
      methode: "POST",
      authentifie: true,
      corps: { jeton },
    });
    revalidatePath("/", "layout");
    return { echec: null, ...enrolement };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return ECHEC(erreur.message);
    throw erreur;
  }
}

export async function renforcerLaSession(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  // Les espaces sont tolérés : les applications affichent « 123 456 ».
  const code = String(donnees.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(code)) {
    return { echec: "Saisissez les six chiffres affichés par l'application.", fait: null };
  }
  try {
    await appeler("/transverse/session/renforcement", {
      methode: "POST",
      authentifie: true,
      corps: { code },
    });
    // ⚠️ Toute l'application : la session renforcée ouvre des gestes sur plusieurs
    // écrans, et chacun relit `facteur_fort` depuis le serveur.
    revalidatePath("/", "layout");
    return { echec: null, fait: "Session renforcée pour quinze minutes." };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function reinitialiserSecondFacteur(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const identifiant = String(donnees.get("identifiant") ?? "").trim();
  const motif = String(donnees.get("motif") ?? "").trim();
  if (!identifiant) return { echec: "Compte non désigné.", fait: null };
  if (motif.length < 30) {
    return {
      echec:
        "Le motif compte au moins trente caractères : comment la perte a été signalée, " +
        "et comment elle a été vérifiée auprès du titulaire.",
      fait: null,
    };
  }
  if (donnees.get("confirmation") !== "oui") {
    return {
      echec: "Cochez la confirmation : les sessions ouvertes du titulaire seront fermées.",
      fait: null,
    };
  }
  try {
    await appeler(
      `/transverse/comptes/${encodeURIComponent(identifiant)}/second-facteur/reinitialisation`,
      { methode: "POST", authentifie: true, corps: { motif } },
    );
    revalidatePath("/[locale]/comptes", "page");
    return {
      echec: null,
      fait: "Second facteur retiré, sessions du titulaire fermées, titulaire prévenu.",
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
