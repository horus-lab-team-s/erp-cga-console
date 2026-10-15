"use server";

/**
 * Les gestes d'une mission de prestation ponctuelle (15 octobre 2026). Voir `routes_missions.py` :
 * l'agent propose, le juriste décide, un second valide. Le serveur vérifie tout de toute façon.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi, telecharger } from "./api";
import type { EtatDocumentDeCreation } from "./document-de-creation";
import type { Mission } from "./missions-etats";
import type { EtatActe } from "./saisie";

const chemin = (id: string) => `/missions/${encodeURIComponent(id)}`;

async function geste(id: string, fait: string, appel: () => Promise<unknown>): Promise<EtatActe> {
  try {
    await appel();
    revalidatePath("/[locale]/missions", "page");
    revalidatePath(`/[locale]/missions/${id}`, "page");
    return { echec: null, fait };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/** Ouvrir une mission, puis y verser le document : un seul formulaire pour le juriste. */
export async function ouvrirUneMission(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const texte = (cle: string) => String(donnees.get(cle) ?? "").trim() || null;
  const fichier = donnees.get("fichier");
  try {
    const mission = await appeler<Mission>("/missions", {
      methode: "POST",
      authentifie: true,
      corps: {
        type: texte("type"),
        objet: texte("objet"),
        client: texte("client"),
        client_courriel: texte("client_courriel"),
        reference_commerciale: texte("reference_commerciale"),
        dossier_niu: texte("dossier_niu"),
        exercice: texte("exercice"),
      },
    });
    if (fichier instanceof File && fichier.size > 0) {
      const envoi = new FormData();
      envoi.append("fichier", fichier, fichier.name);
      await appeler(`${chemin(mission.identifiant)}/document`, { methode: "POST", authentifie: true, formulaire: envoi });
    }
    revalidatePath("/[locale]/missions", "page");
    return { echec: null, fait: mission.identifiant };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function analyserLeContrat(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  try {
    const mission = await appeler<Mission>(`${chemin(id)}/analyse-automatique`, { methode: "POST", authentifie: true });
    revalidatePath(`/[locale]/missions/${id}`, "page");
    const derniere = mission.lectures.at(-1);
    if (derniere?.incident) return { echec: derniere.incident, fait: null };
    return { echec: null, fait: `${derniere?.propositions ?? 0} propositions de l'agent, à décider une par une.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function ecrireLeCahier(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  return geste(id, "Cahier enregistré.", () =>
    appeler(`${chemin(id)}/cahier`, {
      methode: "POST",
      authentifie: true,
      corps: {
        type_de_contrat: String(donnees.get("type_de_contrat") ?? "").trim(),
        cahier: String(donnees.get("cahier") ?? "").trim(),
      },
    }),
  );
}

export async function redigerLeContrat(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  try {
    const mission = await appeler<Mission>(`${chemin(id)}/redaction-automatique`, { methode: "POST", authentifie: true });
    revalidatePath(`/[locale]/missions/${id}`, "page");
    const derniere = mission.lectures.at(-1);
    if (derniere?.incident) return { echec: derniere.incident, fait: null };
    return { echec: null, fait: `${derniere?.propositions ?? 0} articles proposés, à décider un par un.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

export async function ajouterUnPoint(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  const texte = (cle: string) => String(donnees.get(cle) ?? "").trim() || null;
  return geste(id, "Point ajouté : il attend sa décision comme les autres.", () =>
    appeler(`${chemin(id)}/propositions`, {
      methode: "POST",
      authentifie: true,
      corps: {
        rubrique: texte("rubrique"),
        titre: texte("titre"),
        texte: texte("texte"),
        citation: texte("citation"),
        gravite: texte("gravite"),
      },
    }),
  );
}

export async function deciderDUnPoint(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  const rang = String(donnees.get("rang") ?? "");
  const decision = String(donnees.get("decision") ?? "");
  const texte = (cle: string) => String(donnees.get(cle) ?? "").trim() || null;
  return geste(id, "Décision enregistrée.", () =>
    appeler(`${chemin(id)}/propositions/${encodeURIComponent(rang)}/decision`, {
      methode: "POST",
      authentifie: true,
      corps: { decision, texte_retenu: texte("texte_retenu"), motif: texte("motif") },
    }),
  );
}

export async function soumettreLaMission(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  return geste(id, "Soumise au second regard.", () => appeler(`${chemin(id)}/soumission`, { methode: "POST", authentifie: true }));
}

export async function validerLaMission(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  return geste(id, "Validée : la mission est livrée.", () => appeler(`${chemin(id)}/validation`, { methode: "POST", authentifie: true }));
}

export async function renvoyerLaMission(_p: EtatActe, donnees: FormData): Promise<EtatActe> {
  const id = String(donnees.get("mission") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  return geste(id, "Renvoyée au juriste.", () =>
    appeler(`${chemin(id)}/renvoi`, { methode: "POST", authentifie: true, corps: { motif } }),
  );
}

/** Le document de la mission, pour l'aperçu (`DocumentDeLaPiece`). */
export async function lireLeDocumentDeLaMission(
  _precedent: EtatDocumentDeCreation,
  donnees: FormData,
): Promise<EtatDocumentDeCreation> {
  const id = String(donnees.get("mission") ?? "");
  try {
    const f = await telecharger(`${chemin(id)}/document`);
    return { echec: null, fichier: { nom: f.nom, typeMime: f.typeMime, base64: Buffer.from(f.octets).toString("base64") } };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fichier: null };
    throw erreur;
  }
}
