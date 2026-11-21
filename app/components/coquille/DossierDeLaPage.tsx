"use client";

import { useEffect } from "react";

import { useDossier } from "./Coquille";

/**
 * Une page qui montre un seul dossier le dit au sélecteur (9 novembre 2026).
 *
 * Sans `?dossier=` dans l'adresse, ces écrans prennent le premier du portefeuille ;
 * le sélecteur affichait pourtant « Tous les dossiers ». Il montre maintenant le
 * dossier réellement à l'écran. Ne rend rien.
 */
export function DossierDeLaPage({ niu }: { niu: string }) {
  const { declarerDossierAffiche } = useDossier();
  useEffect(() => {
    declarerDossierAffiche(niu);
    return () => declarerDossierAffiche(null);
  }, [niu, declarerDossierAffiche]);
  return null;
}
