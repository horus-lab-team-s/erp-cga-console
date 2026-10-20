/**
 * Le registre des immobilisations, côté navigateur (17 octobre 2026) : ce qu'un composant
 * client peut importer sans tirer le serveur. Les catégories sont les comptes de classe 2
 * du plan du cabinet ; le terrain ne s'amortit pas.
 */

export const CATEGORIES = [
  {
    compte: "21",
    libelle: "Immobilisations incorporelles",
    amortissable: true,
  },
  { compte: "22", libelle: "Terrains", amortissable: false },
  {
    compte: "23",
    libelle: "Bâtiments, installations techniques et agencements",
    amortissable: true,
  },
  {
    compte: "24",
    libelle: "Matériel, mobilier et actifs biologiques",
    amortissable: true,
  },
] as const;

export type Immobilisation = {
  dossier: string;
  code: string;
  libelle: string;
  categorie: "21" | "22" | "23" | "24";
  valeur_origine: string;
  mise_en_service: string;
  duree_annees: number | null;
  fournisseur: string | null;
  piece: string | null;
  sortie_le: string | null;
  motif_sortie: string | null;
  dotations_passees: string[];
};

export type LigneDuTableau = {
  compte: string;
  libelle: string;
  brut_ouverture: string;
  acquisitions: string;
  sorties: string;
  brut_cloture: string;
  amortissements_ouverture: string;
  dotations: string;
  amortissements_sortis: string;
  amortissements_cloture: string;
  valeur_nette_cloture: string;
};

export type BienDuTableau = {
  code: string;
  libelle: string;
  compte: string;
  mise_en_service: string;
  duree_annees: number | null;
  valeur_origine: string;
  dotation: string;
  cumul_cloture: string;
  valeur_nette_cloture: string;
  sortie_le: string | null;
};

export type TableauEtDotation = {
  tableau: {
    dossier: string;
    exercice: string;
    ouverture: string;
    cloture: string;
    lignes: LigneDuTableau[];
    total: LigneDuTableau;
    biens: BienDuTableau[];
  };
  ecriture_de_dotation: string | null;
  controle: {
    brut_registre: string;
    brut_balance: string;
    amortissements_registre: string;
    amortissements_balance: string;
    concorde: boolean;
  };
};
