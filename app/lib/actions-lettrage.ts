"use server";

/**
 * Lettrer et délettrer (pas 108). Maquette « Parcours comptable », vue C.
 *
 * ⚠️ Chemins **littéraux** : l'outil du contrat des écrans et la mesure d'avancement ne lisent
 * que les littéraux (leçon du pas 101).
 *
 * ⚠️ Le front n'additionne pas : la sélection part telle quelle, et c'est le backend qui dit si
 * elle se solde, avec les montants dans son refus.
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import type { EtatActe } from "./saisie";

function rafraichir() {
  revalidatePath("/[locale]/comptabilite", "page");
  revalidatePath("/[locale]/comptabilite/grand-livre", "page");
}

export async function lettrerLaSelection(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const compte = String(donnees.get("compte") ?? "");
  const lignes = donnees.getAll("ligne").map((valeur) => {
    const [cle_ecriture, rang] = String(valeur).split("#");
    return { cle_ecriture, rang: Number(rang) };
  });
  if (lignes.length < 2) return { echec: "Cochez au moins deux lignes qui se soldent.", fait: null };
  let lettre: string;
  try {
    const lettrage = await appeler<{ lettre: string }>(`/comptabilite/dossiers/${encodeURIComponent(dossier)}/lettrages`, {
      methode: "POST",
      authentifie: true,
      corps: { exercice, compte, lignes },
    });
    lettre = lettrage.lettre;
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  rafraichir();
  return { echec: null, fait: `${lignes.length} lignes lettrées ${lettre}.` };
}

export async function delettrer(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const exercice = String(donnees.get("exercice") ?? "");
  const identifiant = String(donnees.get("identifiant") ?? "");
  try {
    await appeler<{ lettre: string }>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/lettrages/${encodeURIComponent(identifiant)}/delettrage?exercice=${encodeURIComponent(exercice)}`,
      { methode: "POST", authentifie: true },
    );
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  rafraichir();
  return { echec: null, fait: "Lettrage défait : les lignes sont de nouveau ouvertes." };
}
