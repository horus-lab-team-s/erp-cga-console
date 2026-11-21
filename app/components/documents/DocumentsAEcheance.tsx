"use client";

import { useActionState, useState } from "react";

import { enregistrerUnDocument } from "@/app/lib/actions-documents-a-echeance";
import {
  tonDeLEcheance,
  type CatalogueDesDocuments,
  type DocumentsDuDossier,
} from "@/app/lib/documents-a-echeance-etats";
import { dateCourte } from "@/app/lib/formats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les documents à échéance d'un dossier (lot 4, 9 novembre 2026) : ceux en vigueur, leur
 * échéance en couleur, et l'enregistrement d'une nouvelle attestation.
 *
 * ⚠️ LA DURÉE VIENT DU CATALOGUE DU CABINET, sourcé (référentiel). Une sorte sans durée
 * établie demande la date d'expiration portée sur le document : rien n'est inventé ici.
 */
export function DocumentsAEcheance({
  niu,
  documents,
  catalogue,
  peutEnregistrer,
}: {
  niu: string;
  documents: DocumentsDuDossier;
  catalogue: CatalogueDesDocuments;
  peutEnregistrer: boolean;
}) {
  const [etat, enregistrer, enCours] = useActionState(enregistrerUnDocument, ETAT_ACTE_INITIAL);
  const [code, setCode] = useState(catalogue.documents[0]?.code ?? "");
  const sorte = catalogue.documents.find((d) => d.code === code);

  return (
    <div className="echeances">
      {documents.en_vigueur.length === 0 ? (
        <p className="echeances__note">Aucun document à échéance enregistré.</p>
      ) : (
        <ul className="echeances__liste">
          {documents.en_vigueur.map(({ document, jours_restants, expire }) => (
            <li key={document.identifiant} className="echeances__ligne">
              <span className="echeances__pastille" data-ton={tonDeLEcheance(jours_restants)}>
                {expire ? "Expiré" : jours_restants === 0 ? "Aujourd'hui" : `J-${jours_restants}`}
              </span>
              <span>
                <strong>{document.libelle}</strong>
                {document.reference ? ` · ${document.reference}` : ""}
                <span className="echeances__note">
                  {" "}
                  · délivré le {dateCourte(document.delivre_le)}, {expire ? "expiré" : "expire"} le{" "}
                  {dateCourte(document.expire_le)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {documents.historique.length > 0 && (
        <details className="echeances__historique">
          <summary>Documents précédents ({documents.historique.length})</summary>
          <ul className="echeances__liste">
            {documents.historique.map((d) => (
              <li key={d.identifiant} className="echeances__note">
                {d.libelle} · du {dateCourte(d.delivre_le)} au {dateCourte(d.expire_le)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {peutEnregistrer && catalogue.documents.length > 0 && (
        <form action={enregistrer} className="echeances__formulaire">
          <input type="hidden" name="niu" value={niu} />
          <label>
            Document
            <select name="code" value={code} onChange={(e) => setCode(e.target.value)}>
              {catalogue.documents.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.libelle}
                </option>
              ))}
            </select>
          </label>
          <label>
            Délivré le
            <input type="date" name="delivre_le" required />
          </label>
          <label>
            Expire le{sorte?.validite_mois ? ` (vide : ${sorte.validite_mois} mois après)` : " (date portée sur le document)"}
            <input type="date" name="expire_le" required={!sorte?.validite_mois} />
          </label>
          <label>
            Référence (facultatif)
            <input name="reference" maxLength={120} />
          </label>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Enregistrer"}
          </button>
          {sorte && (
            <p className="echeances__source">
              {sorte.validite_mois ? `Validité : ${sorte.validite_mois} mois` : "Validité non établie"}
              {sorte.statut === "A_VALIDER" ? " · à valider par le cabinet" : ""}
              {sorte.fondement ? ` · ${sorte.fondement}` : ""}
            </p>
          )}
          {etat.echec && (
            <p role="alert" className="echeances__echec">
              {etat.echec}
            </p>
          )}
          {etat.fait && (
            <p role="status" className="echeances__fait">
              {etat.fait}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
