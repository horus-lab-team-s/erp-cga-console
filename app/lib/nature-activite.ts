/** Ce que le navigateur peut importer de la nature d'activité : type et libellés, sans appel réseau. */

/**
 * La nature d'activité au sens du CGI 2026, art. 93 quater (15 octobre 2026) : elle fixe le
 * seuil entre l'IGS et le régime du réel, donc le système de la DSF.
 */
export type NatureActivite = "COMMERCIALE" | "LIBERALE";

export const LIBELLES_NATURE: Record<NatureActivite, string> = {
  COMMERCIALE: "Commerciale, industrielle, artisanale ou agropastorale · réel dès 50 M FCFA",
  LIBERALE: "Profession libérale · réel dès 30 M FCFA",
};

/** Au réel « sans considération du chiffre d'affaires » (CGI art. 93 quater (2) b). */
export const SECTEURS_REEL_D_OFFICE: Record<string, string> = {
  PETROLIER: "Secteur pétrolier",
  MINIER: "Secteur minier",
  GAZIER: "Secteur gazier",
  CREDIT: "Crédit",
  MICROFINANCE: "Microfinance",
  ASSURANCE: "Assurance",
  TELEPHONIE_MOBILE: "Téléphonie mobile",
  AGREMENT_INVESTISSEMENT: "Agréé à l'ordonnance n° 2025/002 (investissement)",
  CHARGE_NOTARIALE: "Charge notariale",
  DEROGATION_DGI: "Dérogation du Directeur général des impôts",
};
