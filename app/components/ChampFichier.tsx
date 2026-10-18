"use client";

import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type Ref } from "react";

import { ApercuPdf } from "@/app/components/ApercuPdf";

/**
 * Un champ de fichier qui montre ce qu'on s'apprête à envoyer (18 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ : « lorsque je porte un document, je dois toujours avoir
 * l'aperçu de ce qui a été chargé, tant côté adhérent que côté administration ».
 * Jusqu'ici, le fichier choisi n'était qu'un nom : une photo floue, une mauvaise page
 * ou le mauvais PDF ne se voyaient qu'au cabinet, des jours plus tard.
 *
 * ⚠️ RIEN NE QUITTE LE NAVIGATEUR. L'aperçu se dessine depuis le fichier local (adresse
 * locale pour une image, pdf.js pour un PDF) ; l'envoi reste celui du formulaire, par le
 * `name` du champ, inchangé. Le TIFF, qu'aucun navigateur courant n'affiche, se décrit
 * par son nom et sa taille.
 *
 * Le champ suit aussi un fichier posé par programme (la photo prise sur téléphone) : il
 * suffit que l'appelant émette un évènement `change`. Il se vide quand le formulaire est
 * réinitialisé.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ChampFichier({
  ref,
  onChange,
  ...attributs
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { ref?: Ref<HTMLInputElement> }) {
  const champ = useRef<HTMLInputElement | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);

  useEffect(() => {
    const formulaire = champ.current?.form;
    if (!formulaire) return;
    const vider = () => setFichier(null);
    formulaire.addEventListener("reset", vider);
    return () => formulaire.removeEventListener("reset", vider);
  }, []);

  function relier(element: HTMLInputElement | null) {
    champ.current = element;
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  }

  function retirer() {
    if (champ.current) champ.current.value = "";
    setFichier(null);
  }

  return (
    <>
      <input
        {...attributs}
        ref={relier}
        type="file"
        onChange={(evenement) => {
          setFichier(evenement.target.files?.[0] ?? null);
          onChange?.(evenement);
        }}
      />
      {fichier && <ApercuAvantEnvoi fichier={fichier} retirer={retirer} />}
    </>
  );
}

function ApercuAvantEnvoi({ fichier, retirer }: { fichier: File; retirer: () => void }) {
  const estImage = fichier.type === "image/jpeg" || fichier.type === "image/png" || fichier.type === "image/webp";
  const estPdf = fichier.type === "application/pdf";
  // L'adresse locale, dérivée du fichier ; libérée quand il change.
  const adresse = useMemo(() => (estImage || estPdf ? URL.createObjectURL(fichier) : null), [fichier, estImage, estPdf]);
  useEffect(() => () => {
    if (adresse) URL.revokeObjectURL(adresse);
  }, [adresse]);
  // pdf.js lit des octets : le PDF se relit en base64, pour CE fichier seulement.
  const [lu, setLu] = useState<{ pour: File; base64: string } | null>(null);
  useEffect(() => {
    if (!estPdf) return;
    let abandonne = false;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const base64 = String(lecteur.result).split(",", 2)[1];
      if (!abandonne && base64) setLu({ pour: fichier, base64 });
    };
    lecteur.readAsDataURL(fichier);
    return () => {
      abandonne = true;
    };
  }, [fichier, estPdf]);
  const base64 = lu?.pour === fichier ? lu.base64 : null;

  return (
    // ⚠️ Souvent posé dans le `<label>` du champ : un clic sur l'aperçu rouvrirait le
    // sélecteur de fichier. Le bouton « Retirer » garde son effet.
    <figure className="apercu-envoi" aria-label={`Aperçu avant envoi : ${fichier.name}`} onClick={(e) => e.preventDefault()}>
      <figcaption className="apercu-envoi__legende">
        <span className="apercu-envoi__nom">{fichier.name}</span>
        <span className="apercu-envoi__taille">{taille(fichier.size)}</span>
        <button type="button" className="bouton-discret" onClick={retirer}>
          Retirer
        </button>
      </figcaption>
      <div className="apercu-envoi__cadre">
        {estImage && adresse ? (
          // eslint-disable-next-line @next/next/no-img-element -- une adresse locale, que l'optimiseur d'images ne peut pas traiter
          <img src={adresse} alt={`Aperçu de ${fichier.name}`} className="apercu-envoi__image" />
        ) : estPdf && base64 ? (
          <ApercuPdf base64={base64} libelle={fichier.name} adresse={adresse ?? undefined} />
        ) : estPdf ? (
          <p className="apercu-envoi__note">Préparation de l&rsquo;aperçu…</p>
        ) : (
          <p className="apercu-envoi__note">Ce format ne s&rsquo;affiche pas dans le navigateur ; le document partira tel quel.</p>
        )}
      </div>
    </figure>
  );
}

function taille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
