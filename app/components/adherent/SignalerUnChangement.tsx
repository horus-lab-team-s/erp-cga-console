"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { signalerUnChangement } from "@/app/lib/actions-portefeuille";
import type { MonEntreprise } from "@/app/lib/espace-adherent";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * « Signaler un changement » (pas 114, maquette « Espace adhérent », vue E).
 *
 * La nature choisie montre son aide (« une nouvelle adresse peut changer votre centre des impôts »),
 * venue du référentiel. Le choix est un état contrôlé, et le formulaire se vide après un envoi réussi.
 */
export function SignalerUnChangement({ dossier, natures }: { dossier: string; natures: MonEntreprise["natures"] }) {
  const [etat, agir, enCours] = useActionState(signalerUnChangement, ETAT_ACTE_INITIAL);
  const [nature, setNature] = useState(natures[0]?.nature ?? "AUTRE");
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (etat.fait) formulaire.current?.reset();
  }, [etat]);
  const aide = natures.find((n) => n.nature === nature)?.aide;
  return (
    <form ref={formulaire} action={agir} className="adherent__depot" aria-label="Signaler un changement">
      <input type="hidden" name="dossier" value={dossier} />
      <label>
        Ce qui change
        <select name="nature" value={nature} onChange={(e) => setNature(e.target.value as typeof nature)}>
          {natures.map((n) => (
            <option key={n.nature} value={n.nature}>
              {n.libelle}
            </option>
          ))}
        </select>
      </label>
      {aide && <small>{aide}</small>}
      <label>
        Le changement, en quelques mots
        <textarea name="message" rows={3} maxLength={1000} required />
      </label>
      <button type="submit" className="adherent__depot-envoyer" disabled={enCours}>
        {enCours ? "Envoi…" : "Signaler au cabinet"}
      </button>
      {(etat.echec || etat.fait) && (
        <p className="adherent__depot-retour" data-ton={etat.echec ? "echec" : "fait"} role="status">
          {etat.echec ?? etat.fait}
        </p>
      )}
    </form>
  );
}
