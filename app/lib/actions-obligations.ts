"use server";

/**
 * Constater le dépôt d'une obligation hors TVA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'OBLIGATION EST DÉSIGNÉE, JAMAIS DÉCRITE
 *
 * Le formulaire envoie un code et une période choisis dans l'échéancier affiché ;
 * le backend retrouve l'obligation à son propre échéancier et refuse celle qui
 * n'y figure pas. Le guichet ne se transmet pas : il vient du catalogue.
 *
 * ⚠️ CE CONSTAT NE PROUVE PAS CE QUE LE GUICHET A REÇU
 *
 * Aucun bordereau n'est confronté, contrairement au dépôt de TVA. L'écran le dit
 * avant l'envoi, et l'accusé consigné sans pièce jointe est marqué non vérifiable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { revalidatePath } from "next/cache";

import { appeler, ErreurApi } from "./api";
import { versUtc } from "./heure-douala";
import type { EtatActe } from "./saisie";
import type { DepotConstate, PenaliteSimulee } from "./obligations";
import { jourADouala } from "./heure-douala";

export async function constaterUnDepot(
  _precedent: EtatActe,
  donnees: FormData,
): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const [code, debut, fin] = String(donnees.get("obligation") ?? "").split("|");
  const numero = String(donnees.get("numero") ?? "").trim();
  const deposeLe = String(donnees.get("depose_le") ?? "").trim();
  const montant = String(donnees.get("montant_constate") ?? "").replace(/\s/g, "");
  const precision = String(donnees.get("precision") ?? "").trim();
  const pieceJointe = String(donnees.get("piece_jointe") ?? "").trim().toUpperCase();

  if (!dossier || !code || !debut || !fin) {
    return { echec: "Choisissez l'obligation déposée.", fait: null };
  }
  if (!numero) return { echec: "Le numéro de l'accusé est obligatoire.", fait: null };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deposeLe)) {
    return {
      echec: "La date et l'heure du dépôt, telles que l'accusé les porte, sont obligatoires.",
      fait: null,
    };
  }
  if (montant && !/^\d+$/.test(montant)) {
    return { echec: "Le montant constaté s'écrit en francs, sans décimales.", fait: null };
  }

  try {
    await appeler(`/obligations/dossiers/${encodeURIComponent(dossier)}/depots`, {
      methode: "POST",
      authentifie: true,
      corps: {
        code_obligation: code,
        periode_debut: debut,
        periode_fin: fin,
        numero,
        depose_le: versUtc(deposeLe),
        montant_constate: montant || null,
        piece_jointe: pieceJointe || null,
        precision: precision || null,
      },
    });
    revalidatePath("/[locale]/obligations", "page");
    return { echec: null, fait: `Dépôt ${numero} consigné : l'obligation est déclarée.` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Consigner l'accusé d'un dépôt de TVA fait sur le portail de la DGI (pas 87).
 *
 * ⚠️ La période voyage avec le formulaire : le backend reprépare le dossier de cette
 * période et confronte l'accusé à **son** empreinte. Un accusé obtenu avant une correction
 * des écritures est refusé, et la phrase du backend le dit.
 *
 * ⚠️ Depuis le pas 87, une date d'accusé future ou antérieure à la fin de la période est
 * refusée ici comme pour les autres obligations.
 */
export async function constaterLeDepotTva(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const debut = String(donnees.get("periode_debut") ?? "");
  const fin = String(donnees.get("periode_fin") ?? "");
  const numero = String(donnees.get("numero") ?? "").trim();
  const deposeLe = String(donnees.get("depose_le") ?? "").trim();
  const montant = String(donnees.get("montant_constate") ?? "").replace(/\s/g, "");
  const piece = String(donnees.get("piece_jointe") ?? "").trim();
  const precision = String(donnees.get("precision") ?? "").trim();
  if (!numero) return { echec: "Le numéro de l'accusé est obligatoire.", fait: null };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deposeLe)) {
    return { echec: "La date et l'heure du dépôt, telles que l'accusé les porte, sont obligatoires.", fait: null };
  }
  if (montant && !/^\d+$/.test(montant)) {
    return { echec: "Le montant constaté s'écrit en francs, sans décimales.", fait: null };
  }
  const requete = new URLSearchParams({
    periode_debut: debut,
    periode_fin: fin,
    // ⚠️ Le jour de DOUALA, pas celui du conteneur. `toISOString` rendait le
    // jour UTC : entre minuit et une heure du matin, le dépôt de TVA était
    // constaté à la date de la veille — sur une déclaration dont la date de
    // dépôt est précisément ce qui prouve qu'on a respecté l'échéance.
    a_la_date: jourADouala(),
  });
  try {
    const r = await appeler<DepotConstate>(
      `/obligations/dossiers/${encodeURIComponent(dossier)}/depot-tva?${requete}`,
      {
        methode: "POST",
        authentifie: true,
        corps: {
          numero,
          depose_le: versUtc(deposeLe),
          montant_constate: montant || null,
          piece_jointe: piece || null,
          precision: precision || null,
        },
      },
    );
    revalidatePath("/[locale]/obligations/declarations", "page");
    revalidatePath("/[locale]/obligations", "page");
    const reserves = r.reserves_assumees.length ? ` Réserves assumées : ${r.reserves_assumees.join(", ")}.` : "";
    return { echec: null, fait: `Accusé ${r.accuse.numero} consigné : la TVA de la période est déclarée.${reserves}` };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/** L'état du simulateur de pénalité : la simulation, ou le refus du backend. */
export type EtatPenalite = { echec: string | null; penalite: PenaliteSimulee | null };

/**
 * Estimer la pénalité d'un dépôt tardif (pas 87).
 *
 * ⚠️ Aucun taux n'est envoyé : le backend les lit au référentiel à la date de l'échéance
 * et les rend avec leur fondement. Avant le pas 87, la route appliquait 10 % au lieu des
 * 25 % validés.
 */
export async function simulerUnePenalite(_precedent: EtatPenalite, donnees: FormData): Promise<EtatPenalite> {
  const montant = String(donnees.get("montant_du") ?? "").replace(/\s/g, "");
  const echeance = String(donnees.get("echeance") ?? "");
  const aLaDate = String(donnees.get("a_la_date") ?? "");
  if (!/^\d+$/.test(montant) || montant === "0") {
    return { echec: "Le montant dû s'écrit en francs, sans décimales, et n'est pas nul.", penalite: null };
  }
  const requete = new URLSearchParams({ montant_du: montant, echeance, a_la_date: aLaDate });
  try {
    const penalite = await appeler<PenaliteSimulee>(`/obligations/penalite?${requete}`, { authentifie: true });
    return { echec: null, penalite };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, penalite: null };
    throw erreur;
  }
}

/**
 * Régler ses rappels d'échéance (pas 115, maquette « Espace adhérent », vue F).
 *
 * Les jalons arrivent comme cases cochées (`jalons` répété). Le backend refuse un moment non proposé
 * et des rappels actifs sans moment : sa phrase s'affiche telle quelle.
 */
export async function reglerMesRappels(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "").trim();
  const actifs = donnees.get("actifs") === "oui";
  const jalons = donnees.getAll("jalons").map((j) => Number(j)).filter((j) => Number.isInteger(j));
  if (!dossier) return { echec: "Dossier non désigné.", fait: null };
  try {
    await appeler(`/obligations/dossiers/${encodeURIComponent(dossier)}/mes-rappels`, {
      methode: "POST",
      authentifie: true,
      corps: { actifs, jalons: actifs ? jalons : [] },
    });
    revalidatePath("/[locale]/mon-espace/reglages", "page");
    return {
      echec: null,
      fait: actifs
        ? `Rappels enregistrés : ${[...jalons].sort((a, b) => b - a).map((j) => `${j} jour${j > 1 ? "s" : ""}`).join(" et ")} avant chaque échéance, par courriel et dans votre espace.`
        : "Rappels désactivés : vous ne serez plus prévenu avant vos échéances.",
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}

/**
 * Valider ou refuser la quittance envoyée par l'adhérent (14 octobre 2026).
 *
 * ⚠️ Un verdict ne se reprend pas : il est écrit au journal chaîné. Un refus dit pourquoi, et
 * l'adhérent le lit sur sa carte pour envoyer la bonne quittance.
 */
export async function jugerLaQuittance(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const verdict = String(donnees.get("verdict") ?? "");
  const motif = String(donnees.get("motif") ?? "").trim();
  const montantQuittance = String(donnees.get("montant_quittance") ?? "").replace(/\s/g, "");
  if (verdict === "REFUSEE" && motif.length < 5) {
    return { echec: "Dites pourquoi : l'adhérent doit savoir quelle quittance renvoyer.", fait: null };
  }
  try {
    await appeler(`/obligations/dossiers/${encodeURIComponent(dossier)}/preuves-de-paiement/verdict`, {
      methode: "POST",
      authentifie: true,
      corps: {
        code_obligation: String(donnees.get("code_obligation") ?? ""),
        periode_debut: String(donnees.get("periode_debut") ?? ""),
        piece: String(donnees.get("piece") ?? ""),
        verdict,
        ...(motif ? { motif } : {}),
        // 18 octobre 2026 (point 7) : le montant que porte la quittance, s'il est relevé.
        ...(/^\d+$/.test(montantQuittance) ? { montant_quittance: montantQuittance } : {}),
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
  // ⚠️ 18 octobre 2026 : PAS DE RELECTURE APRÈS UNE VALIDATION. Une quittance validée quitte
  // la liste des preuves à juger ; relire la page démontait aussitôt le formulaire de son
  // écriture de paiement (point 7), qui ne se voyait jamais. La page se relit quand
  // l'on y revient. Un refus, sans écriture, la relit tout de suite.
  if (verdict !== "VALIDEE") revalidatePath("/[locale]/obligations", "page");
  return {
    echec: null,
    fait: verdict === "VALIDEE" ? "Quittance validée : l'adhérent lit « Payée »." : "Quittance refusée : l'adhérent lit le motif.",
  };
}

/**
 * L'écriture de paiement d'une quittance validée, enregistrée en brouillon (18 octobre 2026,
 * point 7). Le serveur la propose (compte soldé au débit, trésorerie au crédit) ; elle part
 * par la route de saisie, qui rejoue ses contrôles, et un comptable la valide ensuite.
 */
export async function enregistrerLEcritureDePaiement(_precedent: EtatActe, donnees: FormData): Promise<EtatActe> {
  const dossier = String(donnees.get("dossier") ?? "");
  const params = new URLSearchParams({
    code_obligation: String(donnees.get("code_obligation") ?? ""),
    periode_debut: String(donnees.get("periode_debut") ?? ""),
    piece: String(donnees.get("piece") ?? ""),
    compte_tresorerie: String(donnees.get("compte_tresorerie") ?? "521"),
  });
  const montant = String(donnees.get("montant") ?? "").replace(/\s/g, "");
  if (/^\d+$/.test(montant)) params.set("montant", montant);
  try {
    const proposee = await appeler<Record<string, unknown>>(
      `/obligations/dossiers/${encodeURIComponent(dossier)}/preuves-de-paiement/ecriture-proposee?${params}`,
      { authentifie: true },
    );
    const ecriture = await appeler<{ journal: string; numero: number }>(
      `/comptabilite/dossiers/${encodeURIComponent(dossier)}/ecritures`,
      { methode: "POST", authentifie: true, corps: proposee },
    );
    // ⚠️ Pas de relecture des obligations ici non plus : elle démontait la confirmation
    // « écriture proposée » avant qu'on la lise. La page se relit à la navigation suivante.
    revalidatePath("/[locale]/comptabilite/saisie", "page");
    return {
      echec: null,
      fait: `Brouillon ${ecriture.journal} n° ${ecriture.numero} créé : à relire et valider sur l'écran de saisie.`,
    };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, fait: null };
    throw erreur;
  }
}
