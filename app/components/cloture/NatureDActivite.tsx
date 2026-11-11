"use client";

import { useActionState, useState } from "react";

import { fixerLaNatureDActivite } from "@/app/lib/actions-portefeuille";
import { LIBELLES_NATURE, SECTEURS_REEL_D_OFFICE, type NatureActivite } from "@/app/lib/nature-activite";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * La nature d'activité du dossier (15 octobre 2026) : elle fixe le seuil du régime du réel
 * (CGI art. 93 quater), et le régime fixe le système de la DSF (décret n° 2019/262).
 * Non renseignée, le seuil des activités commerciales (50 M) s'applique.
 */
export function NatureDActivite({
  dossier,
  nature,
  reelDOffice,
  modifiable,
}: {
  dossier: string;
  nature: NatureActivite | null | undefined;
  reelDOffice?: string | null;
  modifiable: boolean;
}) {
  const [etat, fixer, enCours] = useActionState(fixerLaNatureDActivite, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="nature-activite">
      <span>
        Nature d&rsquo;activité (CGI art. 93 quater) :{" "}
        <strong>{nature ? LIBELLES_NATURE[nature] : "non renseignée · seuil des activités commerciales (50 M FCFA) appliqué"}</strong>
        {reelDOffice && (
          <>
            {" "}
            · <strong>{SECTEURS_REEL_D_OFFICE[reelDOffice] ?? reelDOffice}</strong> : au réel quel que soit le chiffre
            d&rsquo;affaires
          </>
        )}
      </span>
      {modifiable && !ouvert && (
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          {nature ? "Modifier" : "Renseigner"}
        </button>
      )}
      {modifiable && ouvert && (
        <form action={fixer} className="nature-activite__formulaire">
          <input type="hidden" name="dossier" value={dossier} />
          <select name="nature" defaultValue={nature ?? ""} required aria-label="Nature d'activité">
            <option value="" disabled>
              Choisir…
            </option>
            {(Object.keys(LIBELLES_NATURE) as NatureActivite[]).map((n) => (
              <option key={n} value={n}>
                {LIBELLES_NATURE[n]}
              </option>
            ))}
          </select>
          <select name="reel_d_office" defaultValue={reelDOffice ?? ""} aria-label="Secteur au réel d'office">
            <option value="">Aucun secteur au réel d&rsquo;office</option>
            {Object.entries(SECTEURS_REEL_D_OFFICE).map(([code, libelle]) => (
              <option key={code} value={code}>
                {libelle}
              </option>
            ))}
          </select>
          <input
            name="justification"
            required
            minLength={30}
            placeholder="La pièce qui la fonde : statuts, RCCM, carte de contribuable…"
            aria-label="Justification"
          />
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Enregistrer"}
          </button>
        </form>
      )}
      {etat.fait && <p role="status">{etat.fait}</p>}
      {etat.echec && <p role="alert">{etat.echec}</p>}
    </div>
  );
}
