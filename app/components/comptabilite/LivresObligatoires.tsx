"use client";

import { useActionState, useEffect } from "react";

import { editerUnLivre } from "@/app/lib/actions-echange";
import { ETAT_EXPORT_INITIAL } from "@/app/lib/saisie-echange";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

const LIVRES = [
  { code: "journal", libelle: "Livre-journal" },
  { code: "grand-livre", libelle: "Grand livre" },
  { code: "balance", libelle: "Balance générale" },
] as const;

/**
 * Les trois livres obligatoires, en PDF, sur la période filtrée (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'Acte uniforme OHADA relatif au droit comptable (art. 19) exige le livre-journal, le
 * grand livre et la balance générale ; un contrôleur les demande arrêtés à une date. Les
 * écritures validées seules, et les chiffres de l'écran : le PDF met en page la même
 * projection, il ne recalcule rien.
 *
 * ⚠️ La balance cumule depuis l'ouverture de l'exercice et s'arrête à « au » ; le grand
 * livre d'une période porte le solde reporté de chaque compte. Le texte le dit, pour que
 * personne ne s'étonne qu'une balance « d'août » porte l'apport de janvier.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function LivresObligatoires({
  dossier,
  exercice,
  du,
  au,
}: {
  dossier: string;
  exercice: string;
  du?: string;
  au?: string;
}) {
  const [etat, editer, enCours] = useActionState(editerUnLivre, ETAT_EXPORT_INITIAL);

  useEffect(() => {
    if (etat.fichier) declencherTelechargement(etat.fichier);
  }, [etat.fichier]);

  const fr = (iso: string) => iso.split("-").reverse().join("/");
  const periode =
    du || au
      ? `du ${du ? fr(du) : "début de l'exercice"} au ${au ? fr(au) : "dernier jour saisi"}`
      : "exercice entier";
  return (
    <form action={editer} className="livres-obligatoires">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="exercice" value={exercice} />
      <input type="hidden" name="du" value={du ?? ""} />
      <input type="hidden" name="au" value={au ?? ""} />
      <p className="livres-obligatoires__intro">
        <strong>Livres obligatoires</strong> · {periode} · écritures validées seules. La balance
        cumule depuis l&rsquo;ouverture ; le grand livre porte le solde reporté.
      </p>
      <div className="livres-obligatoires__gestes">
        {LIVRES.map((l) => (
          <button key={l.code} type="submit" name="livre" value={l.code} className="bouton-discret" disabled={enCours}>
            {l.libelle} (PDF)
          </button>
        ))}
      </div>
      {etat.fichier && (
        <p role="status" className="livres-obligatoires__fait">
          {etat.fichier.nom} téléchargé.
        </p>
      )}
      {etat.echec && (
        <p role="alert" className="livres-obligatoires__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
