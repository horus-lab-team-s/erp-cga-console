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
}: {
  nom: NomIcone;
  taille?: number;
  epaisseur?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      fill="none"
      stroke="currentColor"
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
