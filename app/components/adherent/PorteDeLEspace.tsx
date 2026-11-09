"use client";

import type { ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";

/** Ce que l'espace doit dire de l'accès du client, lu par la coquille. */
export type AvisDAcces = {
  etat: "AVERTI" | "SUSPENDU";
  /** Le jour de la suspension, déjà mis en forme. */
  le: string;
  /** Ce qui reste dû, déjà mis en forme. */
  du: string;
};

const PAGE_DES_HONORAIRES = "/mon-espace/honoraires";

/**
 * L'avertissement, puis la suspension de l'espace (réunion du 4 novembre 2026, demandes 14 et 18).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVERTI : un bandeau au-dessus de chaque page, avec la date et le montant.
 *
 * SUSPENDU : seule la page Honoraires s'affiche, pour lire ce qui est dû et le régler. Les
 * autres pages montrent l'avis à leur place.
 *
 * ⚠️ CE N'EST PAS LA GARDE. Le serveur refuse lui-même (423) tout le reste de l'espace : ce
 * composant n'évite qu'une page d'erreurs incompréhensibles.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function PorteDeLEspace({ avis, children }: { avis: AvisDAcces | null; children: ReactNode }) {
  const chemin = usePathname();
  if (avis === null) return <>{children}</>;
  const surLesHonoraires = chemin.startsWith(PAGE_DES_HONORAIRES);

  if (avis.etat === "AVERTI") {
    return (
      <>
        <p className="honoraires__alerte acces-client__avis" data-ton="attention" role="status">
          <strong>Votre espace sera suspendu le {avis.le}.</strong> {avis.du} d&rsquo;honoraires restent dus.
          Réglez-les avant cette date pour garder l&rsquo;accès à votre espace.{" "}
          {!surLesHonoraires && <Link href={PAGE_DES_HONORAIRES}>Régler mes honoraires</Link>}
        </p>
        {children}
      </>
    );
  }

  if (surLesHonoraires) {
    return (
      <>
        <p className="honoraires__alerte acces-client__avis" role="alert">
          <strong>Votre espace est suspendu depuis le {avis.le}.</strong> Il se rouvre dès le règlement de vos
          honoraires dus ({avis.du}).
        </p>
        {children}
      </>
    );
  }
  return (
    <main className="adherent">
      <div className="honoraires__alerte acces-client__suspendu" role="alert">
        <h1 className="adherent__nom">Votre espace est suspendu</h1>
        <p>
          Depuis le {avis.le}, {avis.du} d&rsquo;honoraires restent impayés. Le cabinet continue de suivre
          votre dossier, mais l&rsquo;accès à votre espace ne se rouvre qu&rsquo;après règlement.
        </p>
        <p>
          <Link href={PAGE_DES_HONORAIRES}>Voir et régler mes honoraires</Link>
        </p>
      </div>
    </main>
  );
}
