"use client";

import { useActionState, useEffect, useState } from "react";

import {
  declarerUnePieceSansObjet,
  retirerUnePieceDsf,
  telechargerUnePieceDsf,
  verserUnePieceDsf,
} from "@/app/lib/actions-dsf";
import { LIBELLES_ETAT_PIECE, type PieceLue, type PiecesDeLaDsf } from "@/app/lib/pieces-dsf-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { ETAT_EXPORT_INITIAL } from "@/app/lib/saisie-echange";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

/**
 * Les pièces à joindre à la DSF (15 octobre 2026), selon le tableau de correspondance du guide
 * de la DGI. Le portail garde « Soumettre » inactif tant qu'il en manque une : la liste le dit
 * avant le dépôt, avec la page où chaque pièce se joint.
 */
export function PiecesDsf({
  dossier,
  exercice,
  etat,
  peutPreparer,
}: {
  dossier: string;
  exercice: string;
  etat: PiecesDeLaDsf;
  peutPreparer: boolean;
}) {
  return (
    <section className="pieces-dsf" aria-label="Pièces à joindre à la DSF">
      <p className="dsf__note">
        <strong>Pièces à joindre</strong> · DSF {etat.systeme === "NORMAL" ? "Normal" : "SMT"}, guide de la DGI.{" "}
        {etat.complet ? (
          <span className="pieces-dsf__complet">Toutes les pièces sont prêtes.</span>
        ) : (
          <span className="pieces-dsf__manque">
            {etat.a_fournir} pièce{etat.a_fournir > 1 ? "s" : ""} à fournir : le portail ne laissera pas soumettre sans
            elle{etat.a_fournir > 1 ? "s" : ""}.
          </span>
        )}
      </p>
      <ol className="pieces-dsf__liste">
        {etat.pieces.map((p) => (
          <Piece key={p.numero} dossier={dossier} exercice={exercice} piece={p} peutPreparer={peutPreparer} />
        ))}
      </ol>
    </section>
  );
}

function Piece({
  dossier,
  exercice,
  piece,
  peutPreparer,
}: {
  dossier: string;
  exercice: string;
  piece: PieceLue;
  peutPreparer: boolean;
}) {
  const [export_, telecharger, enTelechargement] = useActionState(telechargerUnePieceDsf, ETAT_EXPORT_INITIAL);
  const [versement, verser, enVersement] = useActionState(verserUnePieceDsf, ETAT_ACTE_INITIAL);
  const [neant, declarer, enDeclaration] = useActionState(declarerUnePieceSansObjet, ETAT_ACTE_INITIAL);
  const [retrait, retirer, enRetrait] = useActionState(retirerUnePieceDsf, ETAT_ACTE_INITIAL);
  const [sansObjet, setSansObjet] = useState(false);
  useEffect(() => {
    if (export_.fichier) declencherTelechargement(export_.fichier);
  }, [export_.fichier]);
  const caches = (
    <>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="exercice" value={exercice} />
      <input type="hidden" name="numero" value={piece.numero} />
    </>
  );
  const retour = [export_.echec, versement.echec, neant.echec, retrait.echec].find(Boolean);

  return (
    <li className="pieces-dsf__piece" data-etat={piece.etat}>
      <div className="pieces-dsf__entete">
        <span className="pieces-dsf__numero tabulaire">{piece.numero}</span>
        <span className="pieces-dsf__libelle">
          {piece.libelle}
          <small> · {piece.page}</small>
        </span>
        <span className="pieces-dsf__etat">{LIBELLES_ETAT_PIECE[piece.etat]}</span>
      </div>
      {piece.etat === "JOINTE" && piece.nom_du_fichier && <p className="pieces-dsf__detail">{piece.nom_du_fichier}</p>}
      {piece.etat === "NEANT" && piece.motif && <p className="pieces-dsf__detail">« {piece.motif} »</p>}
      <div className="pieces-dsf__gestes">
        {(piece.etat === "PRODUITE" || piece.etat === "JOINTE") && (
          <form action={telecharger}>
            {caches}
            <input type="hidden" name="produite" value={piece.produite ?? ""} />
            <button type="submit" className="bouton-discret" disabled={enTelechargement}>
              Télécharger
            </button>
          </form>
        )}
        {peutPreparer && piece.etat === "A_FOURNIR" && (
          <>
            <form action={verser} className="pieces-dsf__verser">
              {caches}
              <input type="file" name="fichier" accept="application/pdf,image/jpeg,image/png,image/tiff" required />
              <button type="submit" className="bouton-discret" disabled={enVersement}>
                {enVersement ? "Envoi…" : "Verser"}
              </button>
            </form>
            {sansObjet ? (
              <form action={declarer} className="pieces-dsf__verser">
                {caches}
                <input
                  name="motif"
                  minLength={15}
                  maxLength={500}
                  required
                  placeholder="Pourquoi elle est sans objet"
                />
                <button type="submit" className="bouton-discret" disabled={enDeclaration}>
                  Confirmer
                </button>
              </form>
            ) : (
              <button type="button" className="bouton-discret" onClick={() => setSansObjet(true)}>
                Sans objet
              </button>
            )}
          </>
        )}
        {peutPreparer && (piece.etat === "JOINTE" || piece.etat === "NEANT") && (
          <form action={retirer}>
            {caches}
            <button type="submit" className="bouton-discret" disabled={enRetrait}>
              Remettre à fournir
            </button>
          </form>
        )}
      </div>
      {retour && (
        <p role="alert" className="pieces-dsf__echec">
          {retour}
        </p>
      )}
    </li>
  );
}
