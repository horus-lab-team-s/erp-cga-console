"use server";

/**
 * Les gestes de la revue d'un mois transmis (pas 102).
 *
 * ⚠️ Chaque geste écrit son chemin **en littéral** : l'outil du contrat des écrans et la
 * mesure d'avancement ne lisent que les littéraux (leçon du pas 101).
 */

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { appeler, ErreurApi } from "./api";
import type { VueRevue } from "./revue";
import type { EtatActe } from "./saisie";

function rafraichir() {
  revalidatePath("/[locale]/comptabilite/revues", "page");
  revalidatePath("/[locale]/comptabilite/revues/[identifiant]", "page");
}

function lire(donnees: FormData) {
  return {
    dossier: encodeURIComponent(String(donnees.get("dossier") ?? "")),
    identifiant: encodeURIComponent(String(donnees.get("identifiant") ?? "")),
    rang: Number(donnees.get("rang")),
    message: String(donnees.get("message") ?? "").trim() || null,
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

export async function transmettreUnMois(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const mois = String(donnees.get("mois") ?? "");
  if (!/^\d{4}-\d{2}$/.test(mois)) return { echec: "Choisissez le mois à transmettre.", fait: null };
  const [annee, m] = mois.split("-").map(Number);
  const du = `${mois}-01`;
  const au = new Date(Date.UTC(annee, m, 0)).toISOString().slice(0, 10);
  let identifiant: string;
  try {
    const vue = await appeler<VueRevue>(`/comptabilite/dossiers/${encodeURIComponent(dossier)}/revues`, {
      methode: "POST",
      authentifie: true,
      corps: { du, au, message: String(donnees.get("message") ?? "").trim() || null },
    });
    identifiant = vue.revue.identifiant;
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  rafraichir();
  // ⚠️ `redirect` lève : hors du `try`.
  redirect({ href: `/comptabilite/revues/${identifiant}?dossier=${encodeURIComponent(dossier)}`, locale: await getLocale() });
  return { echec: null, fait: null };
}

export async function poserUneRemarque(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant } = lire(donnees);
  const texte = String(donnees.get("texte") ?? "").trim();
  if (texte.length < 10) return { echec: "Dites ce qui ne va pas (10 caractères au moins).", fait: null };
  const corps = { nature: String(donnees.get("nature") ?? ""), reference: String(donnees.get("reference") ?? ""), texte };
  return executer(
    () =>
      appeler<VueRevue>(`/comptabilite/dossiers/${dossier}/revues/${identifiant}/remarques`, {
        methode: "POST",
        authentifie: true,
        corps,
      }),
    "Remarque posée.",
  );
}

export async function repondreALaRemarque(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant, rang } = lire(donnees);
  const reponse = String(donnees.get("reponse") ?? "").trim();
  if (reponse.length < 10) return { echec: "Dites ce qui a été fait (10 caractères au moins).", fait: null };
  return executer(
    () =>
      appeler<VueRevue>(`/comptabilite/dossiers/${dossier}/revues/${identifiant}/remarques/${rang}/reponse`, {
        methode: "POST",
        authentifie: true,
        corps: { reponse },
      }),
    "Réponse enregistrée.",
  );
}

export async function cloreLaRemarque(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant, rang } = lire(donnees);
  return executer(
    () =>
      appeler<VueRevue>(`/comptabilite/dossiers/${dossier}/revues/${identifiant}/remarques/${rang}/cloture`, {
        methode: "POST",
        authentifie: true,
      }),
    "Remarque close.",
  );
}

export async function renvoyerLeMois(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant, message } = lire(donnees);
  return executer(
    () =>
      appeler<VueRevue>(`/comptabilite/dossiers/${dossier}/revues/${identifiant}/renvoi`, {
        methode: "POST",
        authentifie: true,
        corps: { message },
      }),
    "Mois renvoyé au comptable.",
  );
}

export async function retransmettreLeMois(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant, message } = lire(donnees);
  return executer(
    () =>
      appeler<VueRevue>(`/comptabilite/dossiers/${dossier}/revues/${identifiant}/retransmission`, {
        methode: "POST",
        authentifie: true,
        corps: { message },
      }),
    "Mois retransmis au réviseur.",
  );
}

export async function validerLeMois(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const { dossier, identifiant } = lire(donnees);
  return executer(
    () =>
      appeler<VueRevue>(`/comptabilite/dossiers/${dossier}/revues/${identifiant}/validation`, {
        methode: "POST",
        authentifie: true,
      }),
    "Mois validé.",
  );
}
