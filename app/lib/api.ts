/**
 * Client du backend, côté serveur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE NAVIGATEUR NE PARLE JAMAIS AU BACKEND
 *
 * Tous les appels passent par le serveur Next : composants serveur pour les
 * lectures, actions serveur pour les écritures. Le navigateur ne connaît qu'une
 * seule origine, celle du site.
 *
 * Trois raisons, et la troisième est la plus importante :
 *
 * 1. **Le témoin de session reste sur une seule origine.** Pas de CORS avec
 *    `credentials`, pas de `domain=.cga-brcg.cm` à configurer, pas de différence
 *    de comportement entre le développement et la production — c'est-à-dire pas
 *    de bogue qui n'apparaît qu'après le déploiement.
 * 2. **L'adresse du backend reste privée.** Elle n'est pas dans le code livré au
 *    visiteur, et l'API n'a pas à être exposée sur l'internet public.
 * 3. **Le témoin est `HttpOnly`.** Un jeton que le JavaScript de la page devrait
 *    lire pour l'envoyer lui-même ne peut pas l'être — et cesserait donc d'être
 *    protégé d'une injection de script.
 *
 * ⚠️ Conséquence à connaître : ce module ne s'importe **que** depuis un composant
 * serveur, une action serveur ou un gestionnaire de route. `next/headers` lève
 * hors d'un contexte de requête, ce qui rend l'erreur immédiate plutôt que
 * silencieuse.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { cookies } from "next/headers";

/** Interne au réseau : jamais `NEXT_PUBLIC_`, voir l'en-tête. */
export const BASE_API = process.env.API_URL ?? "http://127.0.0.1:8000";

/** Le nom du témoin, aligné sur `NOM_TEMOIN` du contexte K. */
export const TEMOIN_SESSION = "cga_session";

/** Erreur d'appel, porteuse d'un motif lisible : jamais « une erreur est survenue ». */
export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number | null,
  ) {
    super(message);
    this.name = "ErreurApi";
  }
}

type Options = {
  /** Transmet le témoin de session. Faux pour les routes publiques. */
  authentifie?: boolean;
  methode?: "GET" | "POST" | "DELETE";
  corps?: unknown;
  /**
   * Un formulaire multipart, pour envoyer un fichier (pas 81). Exclusif de `corps` :
   * l'en-tête `Content-Type` n'est pas posé, `fetch` y met la frontière lui-même.
   */
  formulaire?: FormData;
  /**
   * Durée de mise en cache, en secondes. Par défaut aucune.
   *
   * Le défaut est délibéré : presque tout ce que rend ce backend dépend d'une
   * date ou d'un droit. Servir une réponse en cache ferait afficher un verdict
   * périmé après une modification de règle, ou les dossiers d'un collaborateur à
   * un autre. Le cache s'active ligne par ligne, sur ce dont on a prouvé qu'il
   * ne varie pas.
   */
  cache?: number;
  /**
   * Des statuts d'erreur dont le corps est une réponse, pas un refus (pas 84).
   *
   * Le contrôle de santé d'un service répond `429` quand il est suspect et `503` quand
   * il est en panne, avec l'état et le motif dans le corps : c'est la convention de
   * Consul. Sans cette option, `appeler` lèverait « 429 Too Many Requests » et l'écran
   * perdrait le motif, c'est-à-dire la seule chose à lire. À n'employer que pour une
   * route qui documente ces statuts comme des réponses.
   */
  accepter?: number[];
};

async function enteteSession(): Promise<Record<string, string>> {
  const magasin = await cookies();
  const session = magasin.get(TEMOIN_SESSION)?.value;
  return session ? { Cookie: `${TEMOIN_SESSION}=${session}` } : {};
}

/**
 * Le motif lisible d'une réponse en erreur : le `detail` du backend, ou le premier
 * message d'une erreur de validation. Partagé par `appeler` et `telecharger` (pas 85).
 */
async function motifDErreur(reponse: Response): Promise<string> {
  let detail = `${reponse.status} ${reponse.statusText}`;
  try {
    const corpsErreur = (await reponse.json()) as { detail?: unknown };
    if (typeof corpsErreur.detail === "string") detail = corpsErreur.detail;
    else if (Array.isArray(corpsErreur.detail)) {
      // Erreur de validation FastAPI : on rend le premier message plutôt que
      // la structure brute, illisible pour qui n'a pas écrit le schéma.
      const premier = corpsErreur.detail[0] as { msg?: string; loc?: unknown[] };
      // ⚠️ Pas 97 : « Value error, » est l'enrobage de pydantic autour d'une phrase écrite
      // par le domaine (un validateur de modèle). Le backend l'ôte déjà de ses propres refus
      // (`message_lisible`) ; les refus de validation de requête arrivaient avec. Le chemin
      // (« body → conditions → 1 ») reste : il dit quelle ligne d'un formulaire est en cause.
      const message = (premier?.msg ?? "").replace(/^Value error, /, "");
      if (message) detail = `${message} (${(premier.loc ?? []).join(" → ")})`;
    }
  } catch {
    /* le corps n'est pas du JSON : on garde le statut */
  }
  return detail;
}

export async function appeler<T>(chemin: string, options: Options = {}): Promise<T> {
  const { authentifie = false, methode = "GET", corps, formulaire, cache, accepter = [] } = options;

  const entetes: Record<string, string> = { Accept: "application/json" };
  if (corps !== undefined) entetes["Content-Type"] = "application/json";
  if (authentifie) Object.assign(entetes, await enteteSession());

  let reponse: Response;
  try {
    reponse = await fetch(`${BASE_API}${chemin}`, {
      method: methode,
      headers: entetes,
      body: formulaire ?? (corps === undefined ? undefined : JSON.stringify(corps)),
      ...(cache === undefined
        ? { cache: "no-store" as const }
        : { next: { revalidate: cache } }),
    });
  } catch {
    throw new ErreurApi(
      `Le backend est injoignable sur ${BASE_API}. ` +
        "Vérifier qu'il est démarré : uvicorn app.main:app --reload",
      null,
    );
  }

  if (reponse.status === 204) return undefined as T;

  if (!reponse.ok && !accepter.includes(reponse.status)) {
    throw new ErreurApi(await motifDErreur(reponse), reponse.status);
  }

  return (await reponse.json()) as T;
}

// ── Contexte D · Conformité ──────────────────────────────────────────────────

export type Fondement = { texte: string; source: string };

export type ConsequenceFiscale = {
  tva_deductible: boolean | null;
  charge_deductible: boolean | null;
  poste_reintegration: string | null;
  rectification_requise: boolean;
  verification_requise: boolean;
};

export type SeveriteApi = "BLOQUANT" | "MAJEUR" | "AVERTISSEMENT" | "INFORMATION";

export type Constat = {
  code_regle: string;
  libelle: string;
  severite: SeveriteApi;
  categorie: string;
  fondement: Fondement;
  message: string;
  remediation: string;
  consequence: ConsequenceFiscale;
  enjeu: string | null;
  regle_a_valider: boolean;
};

export type ParametreEmploye = {
  code: string;
  libelle: string;
  valeur: string | number | boolean;
  unite: string;
  applicable_du: string;
  statut: string;
  fondement: Fondement;
  note: string | null;
};

/**
 * Un constat que le moteur a produit et qu'un écart effectif neutralise (pas 92).
 *
 * Ni motif ni auteur : l'adhérent lit aussi ce rapport. Le détail vit dans l'écart,
 * rendu au seul cabinet (`ReponseControle.ecarts`).
 */
export type ConstatEcarte = { constat: Constat; identifiant_ecart: string };

export type RapportConformite = {
  reference_document: string;
  date_operation: string;
  /** Les constats qui comptent : ceux qu'aucun écart effectif ne neutralise. */
  constats: Constat[];
  /** Pas 92 : sortis de tout calcul, toujours lisibles. */
  constats_ecartes: ConstatEcarte[];
  regles_appliquees: number;
  regles_en_echec: { code_regle: string; motif: string }[];
  parametres_employes: ParametreEmploye[];
};

export type Verdict = {
  glyphe: string;
  titre: string;
  detail: string;
  jeton_fond: string;
  comptabilisation_interdite: boolean;
  avertissement_validation: string | null;
};

export type LigneFacture = {
  designation: string;
  quantite: string | null;
  prix_unitaire_ht: string | null;
  montant_ht: string;
  taux_tva: string | null;
};

export type Partie = {
  denomination: string | null;
  niu: string | null;
  /** `null` = vérification DGI indisponible. Distinct de `false`, qui vaut « radié ». */
  niu_actif: boolean | null;
  rccm: string | null;
  regime: "REEL" | "IGS" | "INCONNU";
  etranger: boolean;
};

export type FactureAControler = {
  document: { type: string; reference: string; date_emission: string; devise: string };
  emetteur: Partie;
  destinataire: Partie;
  montants: {
    total_ht: string;
    total_tva: string;
    total_ttc: string;
    somme_lignes_ht: string | null;
  };
  reglement: { mode: string; date_reglement: string | null };
  lignes: LigneFacture[];
  contexte: { doublons_potentiels: number; exercice_clos: boolean };
};

export type StatutEcart = "EN_ATTENTE" | "EFFECTIF" | "REFUSE" | "LEVE";

/** Une décision d'écart, avec toute son histoire (pas 92). */
export type EcartDeConstat = {
  identifiant: string;
  dossier: string;
  reference_document: string;
  code_regle: string;
  severite: SeveriteApi;
  empreinte: string;
  /** Pas 99 : l'enjeu du constat au moment de l'écart. `null` pour les écarts antérieurs. */
  enjeu: string | null;
  motif: string;
  propose_par: string;
  propose_le: string;
  second_regard_requis: boolean;
  statut: StatutEcart;
  tranche_par: string | null;
  tranche_le: string | null;
  motif_du_second_regard: string | null;
  leve_par: string | null;
  leve_le: string | null;
  motif_de_levee: string | null;
  /** Pas 118 : le document qui prouve ce que le motif affirme. */
  piece_appui: string | null;
  piece_appui_le: string | null;
  piece_appui_par: string | null;
};

/** Un écart, et ce qu'il produit aujourd'hui sur le rapport. */
export type EtatDUnEcart = {
  ecart: EcartDeConstat;
  applique: boolean;
  /** Pourquoi il ne s'applique pas (en attente, caduc, suspendu). `null` s'il s'applique. */
  raison: string | null;
};

export type ReponseControle = {
  facture: FactureAControler;
  verdict: Verdict;
  /** ⚠️ Pas 92 : le rapport **arbitré**, écarts effectifs appliqués. */
  rapport: RapportConformite;
  /** Vide pour qui n'est pas du cabinet : le motif d'un réviseur est une note interne. */
  ecarts: EtatDUnEcart[];
};

/**
 * ⚠️ LES TROIS APPELS DE CONFORMITÉ SONT AUTHENTIFIÉS, ET ILS NE L'ÉTAIENT PAS.
 *
 * `appeler` n'envoie l'en-tête de session que si on le lui demande : le défaut
 * est `authentifie: false`, parce que la vitrine consomme les mêmes fonctions.
 * Ces trois appels-ci l'omettaient, alors que les routes qu'ils visent exigent
 * `LIRE_PIECE` et une session ouverte.
 *
 * Le symptôme était trompeur au possible : la coquille se rendait normalement,
 * nom et rôle de l'utilisateur affichés en tête — puisque la page, elle, avait
 * bien sa session —, et seul le panneau de conformité annonçait « Session
 * absente, expirée ou révoquée ». On cherchait donc un problème de session là
 * où il n'y en avait aucun.
 *
 * Aucun test ne l'a vu : la suite unitaire interroge l'API directement, et les
 * parcours de recette lisent le HTML sans juger un panneau d'erreur rendu dans
 * une page qui répond 200. C'est la première capture d'écran du dossier de
 * démonstration qui a mis le nez dessus.
 */
const authentifie = { authentifie: true } as const;

/** Contrôle d'une facture du jeu de démonstration — § 13.5. */
export function controlerPieceDemonstration(reference: string) {
  return appeler<ReponseControle>(
    `/conformite/demonstration/${encodeURIComponent(reference)}`,
    authentifie,
  );
}

export function listerPiecesDemonstration() {
  return appeler<string[]>("/conformite/demonstration", authentifie);
}

/**
 * Contrôle de tout le flux entrant, en un appel.
 *
 * La boîte de réception affiche la pastille de conformité sur chaque ligne. La
 * peupler par appels unitaires coûterait un aller-retour par ligne — inacceptable
 * sur les connexions visées.
 */
export function controlerToutLeFlux() {
  return appeler<ReponseControle[]>("/conformite/demonstration/rapports", authentifie);
}

// ── Les fichiers ─────────────────────────────────────────────────────────────

/** Un fichier rendu par le backend, octets intacts. */
export type FichierTelecharge = { octets: Uint8Array; typeMime: string; nom: string };

/**
 * Récupère un fichier du backend **en octets**, sans le décoder (pas 85).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI PAS `appeler`
 *
 * `appeler` lit du JSON, donc du texte UTF-8. L'export vers Sage est en cp1252 : le
 * décoder puis le réencoder abîmerait chaque accent, et le client ne le verrait
 * qu'après l'import dans son logiciel. Le type annoncé (`text/csv; charset=cp1252`)
 * voyage avec les octets jusqu'au navigateur.
 *
 * ⚠️ L'OUTIL DE CONTRAT LE RECONNAÎT
 *
 * `outils/types-des-appels.mjs` relève `telecharger("/…")` comme un appel non typé :
 * la route est vérifiée, et la page qui l'atteint est créditée du geste.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function telecharger(chemin: string): Promise<FichierTelecharge> {
  let reponse: Response;
  try {
    reponse = await fetch(`${BASE_API}${chemin}`, { headers: await enteteSession(), cache: "no-store" });
  } catch {
    throw new ErreurApi(`Le backend est injoignable sur ${BASE_API}.`, null);
  }
  if (!reponse.ok) throw new ErreurApi(await motifDErreur(reponse), reponse.status);
  const disposition = reponse.headers.get("content-disposition") ?? "";
  return {
    octets: new Uint8Array(await reponse.arrayBuffer()),
    typeMime: reponse.headers.get("content-type") ?? "application/octet-stream",
    nom: /filename="([^"]+)"/.exec(disposition)?.[1] ?? "export",
  };
}
