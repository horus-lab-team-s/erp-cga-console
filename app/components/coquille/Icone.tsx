import { ICONES } from "../../lib/navigation";

/**
 * Icône linéaire à trait fin, jeu unique — § 10.7.
 *
 * `currentColor` partout : l'icône hérite de la couleur de son contexte, ce qui
 * évite d'avoir à décliner un jeu par fond. Toujours `aria-hidden` — une icône ne
 * porte jamais seule l'information, un libellé l'accompagne systématiquement.
 */
export function Icone({
  nom,
  taille = 20,
}: {
  nom: keyof typeof ICONES | string;
  taille?: number;
}) {
  const trace = ICONES[nom];
  if (!trace) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={trace} />
    </svg>
  );
}
