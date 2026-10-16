"use client";

import { useActionState, useEffect } from "react";

import { telechargerLeFormatDgi } from "@/app/lib/actions-dsf";
import type { FormatDgi } from "@/app/lib/dsf";
import { montantFcfa } from "@/app/lib/formats";
import { ETAT_EXPORT_INITIAL } from "@/app/lib/saisie-echange";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

/**
 * La DSF au format DGI (15 octobre 2026) : le modèle Excel officiel, rempli, à téléverser
 * sur le portail de télédéclaration (guide utilisateur DSF 2025, § 9).
 *
 * ⚠️ Ce qui bloque se lit AVANT de télécharger : un compte sans ligne officielle ou un
 * bilan déséquilibré, et le portail rejetterait le fichier. Les avertissements (un
 * amortissement non ventilé…) n'empêchent pas, mais se corrigent de préférence avant.
 */
export function DsfFormatDgi({ dossier, exercice, etat }: { dossier: string; exercice: string; etat: FormatDgi }) {
  const [export_, telecharger, enCours] = useActionState(telechargerLeFormatDgi, ETAT_EXPORT_INITIAL);
  useEffect(() => {
    if (export_.fichier) declencherTelechargement(export_.fichier);
  }, [export_.fichier]);

  return (
    <form action={telecharger} className="dsf__format-dgi">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="exercice" value={exercice} />
      <p className="dsf__note">
        <strong>Format DGI</strong> · le modèle Excel officiel de la DSF Normal, bilan et compte de résultat remplis aux
        codes REF{etat.avec_exercice_precedent ? ", avec la colonne N-1" : ""}. Il se téléverse tel quel sur le portail,
        sous son nom : <span className="tabulaire">{etat.nom_du_fichier}</span>. Les fiches R1 à R3 reprennent la fiche
        signalétique validée ; les notes se complètent sur le portail.
      </p>
      {etat.pret ? (
        <p className="dsf__note">
          Total du bilan {montantFcfa(etat.total_bilan)} · résultat net {montantFcfa(etat.resultat)}.
        </p>
      ) : (
        <ul className="dsf__obstacles" role="alert">
          {etat.obstacles.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      )}
      {etat.avertissements.length > 0 && (
        <ul className="dsf__avertissements">
          {etat.avertissements.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <button type="submit" className="bouton-discret" disabled={!etat.pret || enCours}>
        {enCours ? "…" : "Télécharger la DSF au format DGI (Excel)"}
      </button>
      {export_.fichier && <p role="status">{export_.fichier.nom} téléchargé.</p>}
      {export_.echec && <p role="alert">{export_.echec}</p>}
    </form>
  );
}
