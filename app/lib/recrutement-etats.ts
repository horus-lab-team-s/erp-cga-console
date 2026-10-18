/**
 * Les offres de poste du cabinet (16 octobre 2026), côté affichage. Module sans dépendance
 * serveur : les composants client l'importent.
 *
 * `enBlocs` est le pendant exact de `vitrine/domaine/texte_riche.py` au backend : l'aperçu
 * du mini-éditeur montre ce que le site affichera. Les mêmes cas sont testés des deux côtés.
 */

export type EtatOffre = "BROUILLON" | "PUBLIEE" | "CLOSE";
export type TypeDeContrat = "CDI" | "CDD" | "STAGE" | "PRESTATION";

export type OffreDePoste = {
  identifiant: string;
  intitule: string;
  lieu: string;
  type_de_contrat: TypeDeContrat;
  description: string;
  qualifications: string;
  date_limite: string | null;
  etat: EtatOffre;
  creee_le: string;
  publiee_le: string | null;
  close_le: string | null;
  /** 18 octobre 2026 : l'image de l'offre, si elle en a une. */
  image_empreinte?: string | null;
};

export type OffreDuCabinet = { offre: OffreDePoste; candidatures: number };

export type Candidature = {
  identifiant: string;
  offre: string;
  nom: string;
  telephone: string;
  courriel: string | null;
  message: string;
  cv_nom: string;
  recue_le: string;
  // 18 octobre 2026 (point 25) : l'état, les décisions et les réponses.
  etat: EtatCandidature;
  decisions: { etat: EtatCandidature; par: string; le: string; note: string | null }[];
  reponses: { objet: string; corps: string; source: string; par: string; le: string; envoyee: boolean }[];
};

export type EtatCandidature = "RECUE" | "PRESELECTIONNEE" | "ENTRETIEN" | "RETENUE" | "NON_RETENUE";

export const LIBELLES_ETAT_CANDIDATURE: Record<EtatCandidature, string> = {
  RECUE: "Reçue",
  PRESELECTIONNEE: "Présélectionnée",
  ENTRETIEN: "Entretien",
  RETENUE: "Retenue",
  NON_RETENUE: "Non retenue",
};

/** La réponse proposée : le texte type du cabinet, ou celui de l'agent, à relire. */
export type ReponseProposee = { objet: string; corps: string; source: "MODELE" | "AGENT"; courriel: string | null };

export const LIBELLES_CONTRAT: Record<TypeDeContrat, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  PRESTATION: "Prestation",
};

export const LIBELLES_ETAT_OFFRE: Record<EtatOffre, string> = {
  BROUILLON: "Brouillon",
  PUBLIEE: "Publiée",
  CLOSE: "Close",
};

export type Segment = { texte: string; gras: boolean; italique: boolean };
export type BlocDeTexte =
  | { type: "intertitre"; texte: string }
  | { type: "paragraphe"; segments: Segment[] }
  | { type: "liste"; points: Segment[][] };

const TITRE = /^#{1,6}\s+(.*)$/;
const POINT = /^(?:[-•]|\d+[.)])\s+(.*)$/;
const EMPHASE = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g;

function segments(ligne: string): Segment[] {
  const sortie: Segment[] = [];
  let position = 0;
  for (const m of ligne.matchAll(EMPHASE)) {
    const debut = m.index ?? 0;
    if (debut > position) sortie.push({ texte: ligne.slice(position, debut), gras: false, italique: false });
    if (m[1] !== undefined) sortie.push({ texte: m[1], gras: true, italique: false });
    else sortie.push({ texte: m[2] ?? m[3] ?? "", gras: false, italique: true });
    position = debut + m[0].length;
  }
  if (position < ligne.length) sortie.push({ texte: ligne.slice(position), gras: false, italique: false });
  return sortie;
}

export function enBlocs(texte: string): BlocDeTexte[] {
  const blocs: BlocDeTexte[] = [];
  const paragraphe: string[] = [];
  const points: Segment[][] = [];
  const clore = () => {
    if (paragraphe.length) {
      blocs.push({ type: "paragraphe", segments: segments(paragraphe.join(" ")) });
      paragraphe.length = 0;
    }
    if (points.length) {
      blocs.push({ type: "liste", points: [...points] });
      points.length = 0;
    }
  };
  for (const brute of texte.replace(/\r\n/g, "\n").split("\n")) {
    const ligne = brute.trim();
    if (!ligne) {
      clore();
      continue;
    }
    const titre = TITRE.exec(ligne);
    const point = POINT.exec(ligne);
    if (titre && titre[1].trim()) {
      clore();
      blocs.push({ type: "intertitre", texte: titre[1].trim().replace(/^\*+|\*+$/g, "").trim() });
    } else if (point && point[1].trim()) {
      if (paragraphe.length) clore();
      points.push(segments(point[1].trim()));
    } else {
      if (points.length) clore();
      paragraphe.push(ligne);
    }
  }
  clore();
  return blocs;
}
