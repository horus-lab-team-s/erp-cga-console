"use client";

import { useActionState, useEffect, useRef } from "react";

import { verserMaPieceDsf } from "@/app/lib/actions-ma-dsf";
import { LIBELLES_DE_MA_PIECE, type MaPieceDsf as Piece } from "@/app/lib/ma-dsf-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { ChampFichier } from "@/app/components/ChampFichier";

/**
 * Une pièce de la DSF, et le moyen de la verser (18 octobre 2026, point 24).
 *
 * L'adhérent verse ce qui est à fournir, ou remplace ce qu'il a versé lui-même tant que la
 * déclaration n'est pas déposée. Déclarer une pièce sans objet reste un jugement du cabinet.
 */
export function MaPieceDsf({ dossier, exercice, piece }: { dossier: string; exercice: string; piece: Piece }) {
  const [etat, agir, enCours] = useActionState(verserMaPieceDsf, ETAT_ACTE_INITIAL);
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (etat.fait) formulaire.current?.reset();
  }, [etat]);
  return (
    <li className="adherent__piece" data-statut={piece.etat}>
      <span className="adherent__piece-tete">
        <strong>{piece.libelle}</strong>
        <span className="adherent__piece-etat" data-attente={piece.etat === "A_FOURNIR" ? "true" : undefined}>
          {LIBELLES_DE_MA_PIECE[piece.etat]}
        </span>
      </span>
      {piece.nom_du_fichier && <span className="adherent__piece-detail">{piece.nom_du_fichier}</span>}
      {/* Revue du 18 octobre 2026 : chaque formulaire ouvert faisait une page de 7 000 px
          sur téléphone. Il s'ouvre à la demande, et reste ouvert après un retour. */}
      {piece.versable && (
        <details className="adherent__ma-piece" open={Boolean(etat.echec || etat.fait) || undefined}>
          <summary>{piece.etat === "JOINTE" ? "Remplacer le fichier" : "Envoyer ce document"}</summary>
        <form ref={formulaire} action={agir} className="adherent__depot" aria-label={`Verser : ${piece.libelle}`}>
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="exercice" value={exercice} />
          <input type="hidden" name="numero" value={piece.numero} />
          <ChampFichier
            name="fichier"
            accept="application/pdf,image/jpeg,image/png,image/tiff"
            required
            className="adherent__file"
          />
          <small>PDF ou photo, 15 Mo au plus, comme sur le portail de la DGI.</small>
          <button type="submit" className="adherent__depot-envoyer" disabled={enCours}>
            {enCours ? "Envoi…" : piece.etat === "JOINTE" ? "Remplacer le fichier" : "Envoyer la pièce"}
          </button>
          {(etat.echec || etat.fait) && (
            <p className="adherent__depot-retour" data-ton={etat.echec ? "echec" : "fait"} role="status">
              {etat.echec ?? etat.fait}
            </p>
          )}
        </form>
        </details>
      )}
    </li>
  );
}
