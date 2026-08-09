/**
 * Client du backend de conformité.
 *
 * Contrairement aux autres écrans, E02 ne s'alimente pas de données figées : il
 * appelle le vrai moteur de règles. Un constat affiché ici a été produit par
 * l'évaluation d'un prédicat sur le référentiel daté — c'est ce qui permet de
 * recetter le moteur en même temps que l'écran.
 */

export const BASE_API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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

export type RapportConformite = {
  reference_document: string;
  date_operation: string;
  constats: Constat[];
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
  document: {
    type: string;
    reference: string;
    date_emission: string;
    devise: string;
  };
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

export type ReponseControle = {
  facture: FactureAControler;
  verdict: Verdict;
  rapport: RapportConformite;
};

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

async function appeler<T>(chemin: string): Promise<T> {
  let reponse: Response;
  try {
    // `no-store` : un rapport de conformité doit refléter le référentiel courant.
    // Servir une version en cache ferait afficher un verdict périmé après une
    // modification de règle par le fiscaliste.
    reponse = await fetch(`${BASE_API}${chemin}`, { cache: "no-store" });
  } catch {
    throw new ErreurApi(
      `Le service de conformité est injoignable sur ${BASE_API}. ` +
        "Vérifier qu'il est démarré : uvicorn app.main:app --reload",
      null,
    );
  }

  if (!reponse.ok) {
    let detail = `${reponse.status} ${reponse.statusText}`;
    try {
      const corps = (await reponse.json()) as { detail?: string };
      if (corps.detail) detail = corps.detail;
    } catch {
      /* le corps n'est pas du JSON : on garde le statut */
    }
    throw new ErreurApi(detail, reponse.status);
  }

  return (await reponse.json()) as T;
}

/** Contrôle d'une facture du jeu de démonstration — § 13.5. */
export function controlerPieceDemonstration(reference: string) {
  return appeler<ReponseControle>(
    `/conformite/demonstration/${encodeURIComponent(reference)}`,
  );
}

export function listerPiecesDemonstration() {
  return appeler<string[]>("/conformite/demonstration");
}
