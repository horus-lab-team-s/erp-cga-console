import Link from "next/link";

/**
 * Le dossier choisi au sélecteur filtre cette liste (9 novembre 2026).
 *
 * ⚠️ Un filtre invisible fait croire à des données manquantes : « où sont passés mes
 * quarante dossiers ? ». Le bandeau dit lequel est retenu et ramène à la liste entière.
 */
export function BandeauDuFiltre({ denomination, chemin }: { denomination: string; chemin: string }) {
  return (
    <p className="bandeau-filtre" role="status">
      <span>
        Filtré sur <strong>{denomination}</strong>
      </span>
      <Link href={chemin}>Voir tout le portefeuille</Link>
    </p>
  );
}

/** Le NIU demandé, s'il fait partie des dossiers visibles ; sinon aucun filtre. */
export function dossierFiltre<T extends { niu: string }>(demande: string | undefined, dossiers: T[]): T | null {
  return (demande && dossiers.find((d) => d.niu === demande)) || null;
}
