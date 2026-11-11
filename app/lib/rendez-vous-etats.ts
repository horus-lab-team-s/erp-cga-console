/**
 * Les formes des rendez-vous de création (9 novembre 2026). Sans import : les composants
 * côté navigateur les importent.
 */

export type ModeRendezVous = "PRESENTIEL" | "EN_LIGNE";
export type EtatRendezVous = "PREVU" | "HONORE" | "MANQUE" | "ANNULE";

export type PlageHoraire = { jour: number; debut: string; fin: string };

export type AgendaDeCreation = {
  plages: PlageHoraire[];
  duree_minutes: number;
  modes: ModeRendezVous[];
  creneaux_fermes: string[];
  jours_fermes: string[];
  delai_minimal_heures: number;
  horizon_jours: number;
  fixe_par: string;
  fixe_le: string;
};

export type CreneauxProposes = { duree_minutes: number; modes: ModeRendezVous[]; creneaux: string[] };

export type RendezVousDuCabinet = {
  rendez_vous: {
    identifiant: string;
    dossier: string;
    mode: ModeRendezVous;
    debut: string;
    fin: string;
    etat: EtatRendezVous;
    lien: string | null;
  };
  client: string;
  telephone: string;
  courriel: string | null;
  service: string;
};

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

export const LIBELLES_ETAT_RDV: Record<EtatRendezVous, string> = {
  PREVU: "Prévu",
  HONORE: "Honoré",
  MANQUE: "Manqué",
  ANNULE: "Annulé",
};

/** « mardi 10 novembre, 9 h 00 », à partir d'une heure de Douala sans fuseau. */
export function heureLisible(iso: string): string {
  const [jour, heure] = iso.split("T");
  const date = new Date(`${jour}T12:00:00`);
  const nomDuJour = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return `${nomDuJour}, ${heure.slice(0, 5).replace(":", " h ")}`;
}

/** « 09:00-12:00, 14:00-16:00 » → les plages de ce jour. Lève sur une saisie illisible. */
export function plagesDuJour(jour: number, saisie: string): PlageHoraire[] {
  return saisie
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((morceau) => {
      const m = /^(\d{1,2})[:h](\d{2})\s*-\s*(\d{1,2})[:h](\d{2})$/.exec(morceau);
      if (!m) throw new Error(`« ${morceau} » : écrire par exemple 09:00-12:00.`);
      const deux = (n: string) => n.padStart(2, "0");
      return { jour, debut: `${deux(m[1])}:${m[2]}`, fin: `${deux(m[3])}:${m[4]}` };
    });
}

/** Les plages d'un jour, telles que le formulaire les écrit. */
export function saisieDuJour(plages: PlageHoraire[], jour: number): string {
  return plages
    .filter((p) => p.jour === jour)
    .map((p) => `${p.debut.slice(0, 5)}-${p.fin.slice(0, 5)}`)
    .join(", ");
}
