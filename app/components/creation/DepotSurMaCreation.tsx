"use client";

import { useActionState } from "react";

import { deposerSurMaCreation, type EtatDepotCreation } from "@/app/lib/actions-ma-creation";

const INITIAL: EtatDepotCreation = { echec: null, fait: null };

/**
 * Envoyer une pièce attendue, depuis son compte.
 *
 * ⚠️ Pensé pour un téléphone : `capture` n'est pas posé, et c'est voulu. Il
 * imposerait l'appareil photo à celle qui a déjà son document en PDF ; sans
 * lui, le téléphone propose les deux.
 */
export function DepotSurMaCreation({ reference, code, libelle }: { reference: string; code: string; libelle: string }) {
  const [etat, deposer, enCours] = useActionState(deposerSurMaCreation, INITIAL);

  if (etat.fait) {
    return (
      <span role="status" className="creation__recu">
        {etat.fait}
      </span>
    );
  }

  return (
    <form action={deposer} className="creation__depot">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="code" value={code} />
      <label className="creation__fichier">
        {/* Le libellé répété pour les lecteurs d'écran : « Choisir un fichier » seul,
            sur une liste de neuf lignes, ne dit pas laquelle. */}
        <span className="creation__invisible">Envoyer : {libelle}</span>
        <input type="file" name="fichier" required accept="image/jpeg,image/png,image/tiff,application/pdf" />
      </label>
      <button type="submit" className="creation__envoyer" disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer"}
      </button>
      {etat.echec && (
        <span role="alert" className="creation__echec">
          {etat.echec}
        </span>
      )}
    </form>
  );
}
