"use client";

import { useActionState } from "react";

import { MOTIFS_DE_PENALITE } from "@/app/components/acquisition/Versements";
import { infligerUnePenalite, leverUnePenalite } from "@/app/lib/actions-acquisition";
import type { PenaliteInfligee } from "@/app/lib/console-acquisition";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Lot 4 (9 novembre 2026) : les pénalités de retard d'un dossier.
 *
 * ⚠️ Le système signale le dépassement (vue « Retards ») ; un responsable décide. « Au
 * besoin », a dit la responsable : rien ne s'inflige seul. Une pénalité levée reste
 * listée, barrée, avec son motif.
 */
export function PenalitesDuDossier({
  reference,
  penalites,
  montantsParDefaut,
  peutInfliger,
  peutLever,
}: {
  reference: string;
  penalites: PenaliteInfligee[];
  montantsParDefaut: Record<string, string>;
  peutInfliger: boolean;
  peutLever: boolean;
}) {
  const libelle = (code: string) => MOTIFS_DE_PENALITE.find((m) => m.code === code)?.libelle ?? code;
  return (
    <div className="penalites">
      {penalites.length === 0 ? (
        <p className="versements__note">Aucune pénalité sur ce dossier.</p>
      ) : (
        <ul className="penalites__liste">
          {penalites.map((p) => (
            <li key={p.numero} className="penalites__ligne" data-levee={p.levee_le ? "oui" : undefined}>
              <strong>
                {libelle(p.motif)} · {montantFcfa(p.montant)}
              </strong>
              <span>
                le {dateCourte(p.infligee_le)} : {p.explication}
              </span>
              {p.levee_le ? (
                <em>
                  Levée le {dateCourte(p.levee_le)} : {p.motif_de_levee}
                </em>
              ) : (
                peutLever && <Levee reference={reference} numero={p.numero} />
              )}
            </li>
          ))}
        </ul>
      )}
      {peutInfliger && <Infliger reference={reference} montantsParDefaut={montantsParDefaut} />}
    </div>
  );
}

function Infliger({ reference, montantsParDefaut }: { reference: string; montantsParDefaut: Record<string, string> }) {
  const [etat, infliger, enCours] = useActionState(infligerUnePenalite, ETAT_ACTE_INITIAL);
  return (
    <form action={infliger} className="versements__regle">
      <input type="hidden" name="reference" value={reference} />
      <label>
        Motif
        <select name="motif" required defaultValue="RETARD_RETRAIT_ORIGINAUX">
          {MOTIFS_DE_PENALITE.map((m) => (
            <option key={m.code} value={m.code}>
              {m.libelle}
              {montantsParDefaut[m.code] ? ` (${montantFcfa(montantsParDefaut[m.code])} par défaut)` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Montant (FCFA, vide : le montant par défaut du motif)
        <input name="montant" type="number" min={1} step={1} />
      </label>
      <label>
        Explication, que le client lira (le délai, la date, le fait)
        <textarea name="explication" minLength={10} maxLength={500} required rows={2} />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Appliquer la pénalité"}
      </button>
      {etat.echec && (
        <p role="alert" className="versements__echec">
          {etat.echec}
        </p>
      )}
      {etat.fait && (
        <p role="status" className="versements__fait">
          {etat.fait}
        </p>
      )}
    </form>
  );
}

function Levee({ reference, numero }: { reference: string; numero: number }) {
  const [etat, lever, enCours] = useActionState(leverUnePenalite, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return (
      <p role="status" className="versements__fait">
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={lever} className="versements__constat">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="numero" value={numero} />
      <label>
        Motif de la levée
        <input name="motif" minLength={10} maxLength={500} required />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Lever"}
      </button>
      {etat.echec && (
        <p role="alert" className="versements__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
