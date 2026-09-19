"use server";

/**
 * Les gestes du fichier du personnel : embaucher, ouvrir un contrat, le clore (pas 89).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ EMBAUCHER, C'EST DEUX ÉCRITURES
 *
 * Le salarié s'inscrit (`POST …/salaries`), puis son premier contrat s'ouvre
 * (`POST …/contrats`). Si la seconde échoue (un salaire illisible, une fin avant le
 * début), le salarié reste inscrit sans contrat : l'écran le dit, et le contrat
 * s'ouvre ensuite depuis la ligne du salarié. Annuler l'inscription supposerait une
 * route de suppression, que le fichier du personnel n'a pas, et à raison : la CNPS
 * peut réclamer un salarié des années après.
 *
 * ⚠️ LES REFUS SONT CEUX DU BACKEND (pas 89)
 *
 * Matricule déjà attribué, salarié d'un autre dossier, contrat qui en chevauche un
 * autre : le backend refuse, et sa phrase s'affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

const CHEMIN = "/[locale]/social";

function texte(donnees: FormData, cle: string): string | null {
  const v = String(donnees.get(cle) ?? "").trim();
  return v === "" ? null : v;
}

function montant(v: string | null): string | null {
  return v === null ? null : v.replace(/\s/g, "");
}

type Contrat = { salarie: string; debut: string; fin: string | null; type_contrat: string };

function corpsDuContrat(donnees: FormData): { corps: Record<string, unknown> } | { echec: string } {
  const type = texte(donnees, "type_contrat");
  const debut = texte(donnees, "debut");
  const fin = texte(donnees, "fin");
  const base = montant(texte(donnees, "salaire_base"));
  const primes = montant(texte(donnees, "primes")) ?? "0";
  if (!type || !debut || !base) return { echec: "Type de contrat, début et salaire de base sont obligatoires." };
  if (!/^\d+$/.test(base) || !/^\d+$/.test(primes)) {
    return { echec: "Salaire et primes s'écrivent en francs, sans décimales." };
  }
  return {
    corps: { type_contrat: type, debut, fin, salaire_base: base, primes, poste: texte(donnees, "poste") },
  };
}

export async function embaucherUnSalarie(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = texte(donnees, "dossier") ?? "";
  const matricule = texte(donnees, "matricule");
  const nom = texte(donnees, "nom");
  const prenom = texte(donnees, "prenom");
  if (!matricule || !nom || !prenom) return { echec: "Matricule, nom et prénom sont obligatoires.", fait: null };
  const contrat = corpsDuContrat(donnees);
  if ("echec" in contrat) return { echec: contrat.echec, fait: null };
  const enfants = texte(donnees, "enfants_a_charge") ?? "0";
  try {
    await appeler(`/social/dossiers/${encodeURIComponent(dossier)}/salaries`, {
      methode: "POST",
      authentifie: true,
      corps: {
        matricule,
        nom,
        prenom,
        matricule_cnps: texte(donnees, "matricule_cnps"),
        date_naissance: texte(donnees, "date_naissance"),
        enfants_a_charge: Number(enfants) || 0,
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  try {
    await appeler<Contrat>(
      `/social/dossiers/${encodeURIComponent(dossier)}/salaries/${encodeURIComponent(matricule)}/contrats`,
      { methode: "POST", authentifie: true, corps: contrat.corps },
    );
  } catch (erreur) {
    revalidatePath(CHEMIN, "page");
    if (erreur instanceof ErreurApi) {
      return {
        echec: `${prenom} ${nom} est inscrit, mais son contrat n'a pas pu s'ouvrir : ${erreur.message} Ouvrez-le depuis sa ligne.`,
        fait: null,
      };
    }
    throw erreur;
  }
  revalidatePath(CHEMIN, "page");
  return { echec: null, fait: `${prenom} ${nom} (${matricule}) est embauché : il entre dans la déclaration de son premier mois.` };
}

export async function ouvrirUnContrat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = texte(donnees, "dossier") ?? "";
  const matricule = texte(donnees, "matricule") ?? "";
  const contrat = corpsDuContrat(donnees);
  if ("echec" in contrat) return { echec: contrat.echec, fait: null };
  try {
    const c = await appeler<Contrat>(
      `/social/dossiers/${encodeURIComponent(dossier)}/salaries/${encodeURIComponent(matricule)}/contrats`,
      { methode: "POST", authentifie: true, corps: contrat.corps },
    );
    revalidatePath(CHEMIN, "page");
    return { echec: null, fait: `Contrat ${c.type_contrat} ouvert le ${c.debut.split("-").reverse().join("/")}.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function cloreUnContrat(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = texte(donnees, "dossier") ?? "";
  const matricule = texte(donnees, "matricule") ?? "";
  const le = texte(donnees, "le");
  if (!le) return { echec: "Indiquez la date de fin : le premier jour où le contrat ne court plus.", fait: null };
  try {
    const c = await appeler<Contrat>(
      `/social/dossiers/${encodeURIComponent(dossier)}/salaries/${encodeURIComponent(matricule)}/contrats/cloture`,
      { methode: "POST", authentifie: true, corps: { le } },
    );
    revalidatePath(CHEMIN, "page");
    return {
      echec: null,
      fait: `Contrat clos : il court jusqu'au ${(c.fin ?? le).split("-").reverse().join("/")} exclu. Le suivant peut commencer ce jour-là.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
