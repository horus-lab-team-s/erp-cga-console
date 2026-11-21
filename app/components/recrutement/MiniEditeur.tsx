"use client";

import { useRef, useState } from "react";

import { enBlocs } from "@/app/lib/recrutement-etats";
import { TexteRiche } from "./TexteRiche";

/**
 * Le mini-éditeur des offres de poste (16 octobre 2026) : gras, italique, titre, liste.
 * Il écrit un Markdown réduit que le site affiche en blocs ; « Aperçu » montre ce que le
 * candidat lira, du même découpage que le backend.
 */
export function MiniEditeur({
  nom,
  libelle,
  valeurInitiale = "",
  lignes = 8,
  requis = false,
  maximum,
}: {
  nom: string;
  libelle: string;
  valeurInitiale?: string;
  lignes?: number;
  requis?: boolean;
  maximum?: number;
}) {
  const [texte, setTexte] = useState(valeurInitiale);
  const [apercu, setApercu] = useState(false);
  const zone = useRef<HTMLTextAreaElement>(null);

  const entourer = (marque: string) => {
    const z = zone.current;
    if (!z) return;
    const { selectionStart: debut, selectionEnd: fin } = z;
    const choisi = texte.slice(debut, fin) || "texte";
    const nouveau = texte.slice(0, debut) + marque + choisi + marque + texte.slice(fin);
    setTexte(nouveau);
    requestAnimationFrame(() => {
      z.focus();
      z.setSelectionRange(debut + marque.length, debut + marque.length + choisi.length);
    });
  };

  const prefixer = (prefixe: string) => {
    const z = zone.current;
    if (!z) return;
    const debutLigne = texte.lastIndexOf("\n", z.selectionStart - 1) + 1;
    const finSel = z.selectionEnd;
    const bloc = texte.slice(debutLigne, finSel) || "";
    const prefixees = bloc
      .split("\n")
      .map((l) => (l.startsWith(prefixe) ? l : prefixe + l))
      .join("\n");
    setTexte(texte.slice(0, debutLigne) + prefixees + texte.slice(finSel));
    requestAnimationFrame(() => z.focus());
  };

  return (
    <div className="mini-editeur">
      <div className="mini-editeur__barre" role="toolbar" aria-label={`Mise en forme : ${libelle}`}>
        <span className="mini-editeur__libelle">{libelle}</span>
        <button type="button" onClick={() => entourer("**")} aria-label="Gras" title="Gras">
          <strong>G</strong>
        </button>
        <button type="button" onClick={() => entourer("*")} aria-label="Italique" title="Italique">
          <em>I</em>
        </button>
        <button type="button" onClick={() => prefixer("### ")} aria-label="Titre" title="Titre">
          T
        </button>
        <button type="button" onClick={() => prefixer("- ")} aria-label="Liste" title="Liste à puces">
          •
        </button>
        <button type="button" className="mini-editeur__apercu" aria-pressed={apercu} onClick={() => setApercu(!apercu)}>
          {apercu ? "Modifier" : "Aperçu"}
        </button>
      </div>
      <textarea
        ref={zone}
        name={nom}
        aria-label={libelle}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={lignes}
        required={requis}
        maxLength={maximum}
        hidden={apercu}
      />
      {apercu && (
        <div className="mini-editeur__rendu" aria-label={`Aperçu : ${libelle}`}>
          <TexteRiche blocs={enBlocs(texte)} />
        </div>
      )}
    </div>
  );
}
