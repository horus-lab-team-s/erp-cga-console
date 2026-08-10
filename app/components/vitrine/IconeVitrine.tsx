import { ICONES_VITRINE, type NomIcone } from "@/app/lib/icones-vitrine";

/**
 * Icône linéaire de la vitrine — tracés repris à l'identique des maquettes.
 *
 * Toujours `aria-hidden` : une icône n'informe jamais seule, un libellé
 * l'accompagne systématiquement (§ 9).
 */
export function IconeVitrine({
  nom,
  taille = 18,
  epaisseur = 1.7,
  plein = false,
}: {
  nom: NomIcone;
  taille?: number;
  epaisseur?: number;
  /** Les logos de marque se reconnaissent à leur silhouette : ils se remplissent. */
  plein?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      fill={plein ? "currentColor" : "none"}
      stroke={plein ? "none" : "currentColor"}
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONES_VITRINE[nom]} />
    </svg>
  );
}
