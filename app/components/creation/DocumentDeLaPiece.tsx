"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { ApercuPdf } from "@/app/components/ApercuPdf";

import { DOCUMENT_DE_CREATION_INITIAL, type EtatDocumentDeCreation } from "@/app/lib/document-de-creation";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

/**
 * Voir ou enregistrer le document d'une pièce de création (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ : « l'aperçu et le téléchargement des documents
 * déposés ». Jusque-là, rien ne s'ouvrait : la juriste voyait « reçue » sans
 * pouvoir lire la pièce.
 *
 * ⚠️ POURQUOI L'APERÇU EST SÛR ICI, ALORS QUE LES PIÈCES COMPTABLES SE TÉLÉCHARGENT
 *
 * Le type affiché n'est pas celui que déclare le fichier : il est lu dans ses
 * octets à l'arrivée, et seuls PDF, JPEG, PNG et TIFF entrent au magasin. Un
 * fichier HTML ou SVG ne peut donc pas se présenter comme une image. L'image
 * s'affiche par une adresse locale (une image n'exécute rien), le PDF par la
 * visionneuse du navigateur, qui tourne hors de la page. Le TIFF, qu'aucun
 * navigateur courant n'affiche, se télécharge.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const AFFICHABLES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function DocumentDeLaPiece({
  champs,
  libelle,
  lire,
  ouvrirDesLeDebut = false,
}: {
  /** Ce qui désigne le document pour l'action : `{ reference, code }` d'une pièce de création,
   *  `{ identifiant }` d'une pièce de la collecte (14 octobre 2026 : quittances et justificatifs). */
  champs: Record<string, string>;
  libelle: string;
  lire: (precedent: EtatDocumentDeCreation, donnees: FormData) => Promise<EtatDocumentDeCreation>;
  /** Ouvre l'aperçu dès l'affichage : la lecture d'une facture se fait le document sous les yeux. */
  ouvrirDesLeDebut?: boolean;
}) {
  const [etat, demander, enCours] = useActionState(lire, DOCUMENT_DE_CREATION_INITIAL);
  const [intention, setIntention] = useState<"voir" | "enregistrer">("voir");
  // L'aperçu fermé l'est pour CE fichier : un nouvel « Aperçu » le rouvre.
  const [fermePour, setFermePour] = useState<string | null>(null);
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ouvrirDesLeDebut) formulaire.current?.requestSubmit();
    // Une fois, à l'affichage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'adresse locale du fichier affichable, dérivée du fichier reçu ; libérée quand il change.
  const adresse = useMemo(() => {
    if (!etat.fichier || !AFFICHABLES.has(etat.fichier.typeMime)) return null;
    const octets = Uint8Array.from(atob(etat.fichier.base64), (c) => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([octets], { type: etat.fichier.typeMime }));
  }, [etat.fichier]);
  useEffect(() => () => {
    if (adresse) URL.revokeObjectURL(adresse);
  }, [adresse]);

  // « Télécharger », ou un format que le navigateur n'affiche pas : on l'enregistre.
  useEffect(() => {
    if (!etat.fichier) return;
    if (intention === "enregistrer" || !AFFICHABLES.has(etat.fichier.typeMime)) declencherTelechargement(etat.fichier);
    // ⚠️ Sur le fichier seul : changer d'intention ne doit pas réenregistrer le précédent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.fichier]);

  const ouvert = adresse !== null && intention === "voir" && fermePour !== adresse;
  const typeMime = etat.fichier?.typeMime ?? "";
  return (
    <div className="document-piece">
      <form ref={formulaire} action={demander} className="document-piece__gestes">
        {Object.entries(champs).map(([nom, valeur]) => (
          <input key={nom} type="hidden" name={nom} value={valeur} />
        ))}
        <button type="submit" className="bouton-discret" disabled={enCours} onClick={() => setIntention("voir")}>
          {enCours && intention === "voir" ? "…" : "Aperçu"}
          <span className="visuellement-cache"> : {libelle}</span>
        </button>
        <button type="submit" className="bouton-discret" disabled={enCours} onClick={() => setIntention("enregistrer")}>
          {enCours && intention === "enregistrer" ? "…" : "Télécharger"}
          <span className="visuellement-cache"> : {libelle}</span>
        </button>
        {etat.echec && (
          <span role="alert" className="document-piece__echec">
            {etat.echec}
          </span>
        )}
      </form>

      {ouvert && (
        <figure className="document-piece__apercu" aria-label={`Aperçu : ${libelle}`}>
          {typeMime === "application/pdf" ? (
            // 14 octobre 2026 : dessiné par pdf.js. `<object>` ne montrait rien : la politique
            // de contenu interdit les greffons (`object-src 'none'`), à raison.
            <ApercuPdf base64={etat.fichier!.base64} libelle={libelle} adresse={adresse} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- une adresse locale, que l'optimiseur d'images ne peut pas traiter
            <img src={adresse} alt={libelle} className="document-piece__image" />
          )}
          <figcaption>
            <button type="button" className="bouton-discret" onClick={() => setFermePour(adresse)}>
              Fermer l&rsquo;aperçu
            </button>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
