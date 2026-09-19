"use server";

/**
 * Les gestes du rapprochement bancaire (pas 101).
 *
 * Le fichier du relevé part en base64 dans un corps JSON : le backend le lit selon le profil
 * choisi, ligne par ligne, et refuse tout l'import à la première ligne illisible, en la
 * nommant. Aucune lecture du fichier ici : deux lecteurs finiraient par diverger.
 */

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { appeler, ErreurApi } from "./api";
import type { VueRapprochement } from "./rapprochement";
import type { EtatActe } from "./saisie";

function rafraichir() {
  revalidatePath("/[locale]/comptabilite/rapprochement", "page");
  revalidatePath("/[locale]/comptabilite/rapprochement/[identifiant]", "page");
}

/** Un montant saisi à la française (« 4 031 500 », « -18 500 ») en chaîne décimale. */
function montantSaisi(valeur: FormDataEntryValue | null): string | null {
  const propre = String(valeur ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  return /^-?\d+(\.0+)?$/.test(propre) ? propre.replace(/\.0+$/, "") : null;
}

export async function importerUnReleve(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const fichier = donnees.get("fichier");
  const soldeInitial = montantSaisi(donnees.get("solde_initial"));
  const soldeFinal = montantSaisi(donnees.get("solde_final"));
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { echec: "Choisissez le fichier du relevé exporté par la banque.", fait: null };
  }
  if (soldeInitial === null || soldeFinal === null) {
    return { echec: "Recopiez les soldes du relevé, en francs, sans centimes (négatif si découvert).", fait: null };
  }
  let identifiant: string;
  try {
    const vue = await appeler<VueRapprochement>(`/comptabilite/dossiers/${encodeURIComponent(dossier)}/rapprochements`, {
      methode: "POST",
      authentifie: true,
      corps: {
        journal: String(donnees.get("journal") ?? "BQ"),
        du: String(donnees.get("du") ?? ""),
        au: String(donnees.get("au") ?? ""),
        solde_initial: soldeInitial,
        solde_final: soldeFinal,
        profil: String(donnees.get("profil") ?? ""),
        fichier_base64: Buffer.from(await fichier.arrayBuffer()).toString("base64"),
      },
    });
    identifiant = vue.rapprochement.identifiant;
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  rafraichir();
  // ⚠️ `redirect` lève : hors du `try`, sinon le `catch` l'avalerait.
  redirect({
    href: `/comptabilite/rapprochement/${identifiant}?dossier=${encodeURIComponent(dossier)}`,
    locale: await getLocale(),
  });
  return { echec: null, fait: null };
}

/**
 * ⚠️ Chaque geste écrit son chemin **en littéral** dans l'appel. Une aide commune qui
 * recevrait le chemin en paramètre serait plus courte, et rendrait ces routes invisibles à
 * l'outil du contrat des écrans comme à la mesure d'avancement, qui ne lisent que les
 * littéraux. Défaut constaté à la mesure du pas 101.
 */
function lire(donnees: FormData) {
  return {
    dossier: encodeURIComponent(String(donnees.get("dossier") ?? "")),
    identifiant: encodeURIComponent(String(donnees.get("identifiant") ?? "")),
    rang: Number(donnees.get("rang")),
  };
}

async function executer(appel: () => Promise<unknown>, fait: string): Promise<EtatActe> {
  try {
    await appel();
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  rafraichir();
  return { echec: null, fait };
}

export async function rapprocherLaLigne(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant, rang } = lire(donnees);
  const corps = { rang, ecriture: String(donnees.get("ecriture") ?? ""), ligne: Number(donnees.get("ligne")) };
  return executer(
    () =>
      appeler<VueRapprochement>(`/comptabilite/dossiers/${dossier}/rapprochements/${identifiant}/appariements`, {
        methode: "POST",
        authentifie: true,
        corps,
      }),
    "Ligne rapprochée.",
  );
}

export async function dissocierLaLigne(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant, rang } = lire(donnees);
  return executer(
    () =>
      appeler<VueRapprochement>(
        `/comptabilite/dossiers/${dossier}/rapprochements/${identifiant}/lignes/${rang}/dissociation`,
        { methode: "POST", authentifie: true },
      ),
    "Rapprochement défait.",
  );
}

export async function justifierLaLigne(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Expliquez la ligne (10 caractères au moins) : elle se relit à la révision.", fait: null };
  const nature = String(donnees.get("nature") ?? "");
  const { dossier, identifiant, rang } = lire(donnees);
  return executer(
    () =>
      appeler<VueRapprochement>(
        `/comptabilite/dossiers/${dossier}/rapprochements/${identifiant}/lignes/${rang}/justification`,
        { methode: "POST", authentifie: true, corps: { nature, motif } },
      ),
    nature === "PIECE_DEMANDEE" ? "Ligne justifiée : la pièce est demandée à l'adhérent." : "Ligne justifiée.",
  );
}

export async function validerLeRapprochement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant } = lire(donnees);
  return executer(
    () =>
      appeler<VueRapprochement>(`/comptabilite/dossiers/${dossier}/rapprochements/${identifiant}/validation`, {
        methode: "POST",
        authentifie: true,
      }),
    "Rapprochement arrêté : l'état ne bougera plus.",
  );
}

export async function abandonnerLeReleve(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const motif = String(donnees.get("motif") ?? "").trim();
  if (motif.length < 10) return { echec: "Dites pourquoi le relevé est abandonné (10 caractères au moins).", fait: null };
  const { dossier, identifiant } = lire(donnees);
  return executer(
    () =>
      appeler<VueRapprochement>(`/comptabilite/dossiers/${dossier}/rapprochements/${identifiant}/abandon`, {
        methode: "POST",
        authentifie: true,
        corps: { motif },
      }),
    "Relevé abandonné : la période est libérée.",
  );
}
