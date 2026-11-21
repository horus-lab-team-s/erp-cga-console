"use client";

import { useActionState, useState } from "react";

import { enregistrerLeGroupeDeRisque } from "@/app/lib/actions-social";
import { dateCourte } from "@/app/lib/formats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import type { GroupeDuDossier } from "@/app/lib/social";

/**
 * Le groupe de risque professionnel notifié par la CNPS (16 octobre 2026). Il fixe le taux
 * de la cotisation accidents du travail et ne se déduit pas de l'activité : il s'enregistre
 * une fois, depuis la notification, et chaque bulletin l'applique. Tant qu'il manque, le
 * groupe A, le plus bas, est supposé, et l'écran le dit.
 */
export function GroupeDeRisque({
  dossier,
  etat,
  peutEnregistrer,
  aujourdhui,
}: {
  dossier: string;
  etat: GroupeDuDossier;
  peutEnregistrer: boolean;
  aujourdhui: string;
}) {
  const [retour, envoyer, enEnvoi] = useActionState(enregistrerLeGroupeDeRisque, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const connu = etat.groupe !== null;

  return (
    <div className={`groupe-risque${connu ? "" : " groupe-risque--suppose"}`} role="status">
      <p className="groupe-risque__etat">
        {connu ? (
          <>
            <strong>Groupe de risque CNPS : {etat.groupe}</strong>
            {etat.notifie_le && <> · notifié le {dateCourte(etat.notifie_le)}</>}
          </>
        ) : (
          <>
            <strong>Groupe de risque CNPS non renseigné.</strong> Le groupe A (risque faible) est supposé
            pour la cotisation accidents du travail : enregistrez celui de la notification de la CNPS.
          </>
        )}
        {peutEnregistrer && !ouvert && (
          <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
            {connu ? "Modifier" : "Enregistrer le groupe"}
          </button>
        )}
      </p>
      {peutEnregistrer && ouvert && (
        <form action={envoyer} className="groupe-risque__formulaire">
          <input type="hidden" name="dossier" value={dossier} />
          <label>
            Groupe notifié
            <select name="groupe" defaultValue={etat.groupe ?? ""} required>
              <option value="" disabled>
                Choisir
              </option>
              <option value="A">A · risque faible</option>
              <option value="B">B · risque moyen</option>
              <option value="C">C · risque élevé</option>
            </select>
          </label>
          <label>
            Date de la notification
            <input type="date" name="notifie_le" defaultValue={etat.notifie_le ?? ""} max={aujourdhui} required />
          </label>
          <button type="submit" className="bouton-discret" disabled={enEnvoi}>
            {enEnvoi ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
            Fermer
          </button>
        </form>
      )}
      {retour.fait && <p className="groupe-risque__retour">{retour.fait}</p>}
      {retour.echec && (
        <p role="alert" className="groupe-risque__echec">
          {retour.echec}
        </p>
      )}
    </div>
  );
}
