"use client";

import { useEffect, useState } from "react";

import { listerLaFile } from "@/app/lib/file-hors-ligne";

/**
 * « Hors ligne · 2 envois en attente » (pas 115, maquette « Espace adhérent », vue F, état hors ligne).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * La file des dépôts sans réseau existe depuis le pas 96, mais elle ne se voyait qu'en bas de la
 * page, sous le formulaire. La maquette la met en tête : « Vous pouvez continuer à photographier vos
 * factures : elles partiront dès le retour du réseau. Rien ne se perd. »
 *
 * Rien n'est affiché quand tout va bien (en ligne, file vide) : un bandeau permanent « tout va bien »
 * est un bandeau qu'on cesse de lire. La file est relue au retour du réseau et toutes les 20 secondes,
 * le temps que le dépôt de la page la vide.
 *
 * ⚠️ Ce que ce pas ne fait pas : garder lisibles, sans réseau, les documents et les montants déjà
 * consultés (vue F, note 1). Il faudrait un service de mise en cache des pages, qui n'existe pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EtatHorsLigne({ dossier }: { dossier: string }) {
  const [enLigne, setEnLigne] = useState(true);
  const [enAttente, setEnAttente] = useState(0);
  useEffect(() => {
    let actif = true;
    const relire = async () => {
      setEnLigne(navigator.onLine);
      try {
        const file = await listerLaFile();
        if (actif) setEnAttente(file.filter((d) => d.dossier === dossier && d.refus === null).length);
      } catch {
        // IndexedDB indisponible (navigation privée) : pas de file, rien à annoncer.
      }
    };
    void relire();
    const minuterie = window.setInterval(relire, 20000);
    // ⚠️ Au retour du réseau, le dépôt de la page rejoue la file au même moment : relu tout de
    // suite, le bandeau annonçait encore « 1 envoi en attente » pendant vingt secondes alors que
    // l'envoi était parti (vu à l'essai réel du pas 115). Il relit aussi 3 et 10 secondes après.
    const differes: number[] = [];
    const auRetour = () => {
      void relire();
      differes.push(window.setTimeout(relire, 3000), window.setTimeout(relire, 10000));
    };
    window.addEventListener("online", auRetour);
    window.addEventListener("offline", relire);
    return () => {
      actif = false;
      window.clearInterval(minuterie);
      differes.forEach((d) => window.clearTimeout(d));
      window.removeEventListener("online", auRetour);
      window.removeEventListener("offline", relire);
    };
  }, [dossier]);

  if (enLigne && enAttente === 0) return null;
  return (
    <p className="adherent__hors-ligne" role="status">
      <strong>
        {enLigne ? "De retour en ligne" : "Hors ligne"}
        {enAttente > 0 && ` · ${enAttente} envoi${enAttente > 1 ? "s" : ""} en attente`}
      </strong>
      <span>
        {enLigne
          ? "Vos envois en attente partent maintenant."
          : "Vous pouvez continuer à photographier vos factures : elles partiront dès le retour du réseau. Rien ne se perd."}
      </span>
    </p>
  );
}
