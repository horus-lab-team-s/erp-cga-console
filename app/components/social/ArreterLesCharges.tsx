"use client";

import { useActionState, useState } from "react";

import { arreterLesCharges } from "@/app/lib/actions-arrete-des-charges";
import { RUBRIQUES, type ChargesDuMois, type RubriqueSociale } from "@/app/lib/arrete-des-charges-etats";
import { montantFcfa } from "@/app/lib/formats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const entier = (texte: string) => String(Math.round(Number(texte) || 0));

/**
 * Proposer, corriger, arrêter (18 octobre 2026, point 8).
 *
 * Chaque rubrique montre ce que la paie propose ; le champ se corrige. Un montant qui
 * s'écarte de la proposition demande un motif : dans un an, « pourquoi la CNPS de
 * septembre n'est pas celle des bulletins » doit avoir une réponse écrite.
 */
export function ArreterLesCharges({
  entreprise,
  annee,
  mois,
  charges,
}: {
  entreprise: string;
  annee: number;
  mois: number;
  charges: ChargesDuMois;
}) {
  const [etat, arreter, enCours] = useActionState(arreterLesCharges, ETAT_ACTE_INITIAL);
  const depart = charges.arrete?.montants ?? charges.proposition;
  const [valeurs, setValeurs] = useState<Record<RubriqueSociale, string>>(
    Object.fromEntries(RUBRIQUES.map(({ code }) => [code, entier(depart[code] ?? "0")])) as Record<RubriqueSociale, string>,
  );
  const ecarts = RUBRIQUES.filter(({ code }) => valeurs[code] !== entier(charges.proposition[code] ?? "0"));

  return (
    <form action={arreter} className="arrete-charges">
      <input type="hidden" name="entreprise" value={entreprise} />
      <input type="hidden" name="annee" value={annee} />
      <input type="hidden" name="mois" value={mois} />
      <p className="arrete-charges__etat">
        {charges.arrete
          ? `Arrêté le ${charges.arrete.arrete_le.slice(0, 10).split("-").reverse().join("/")}${charges.arrete.motif ? ` · « ${charges.arrete.motif} »` : ""}`
          : "Non arrêté : les montants ci-dessous sont la proposition de la paie."}
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Rubrique</th>
            <th scope="col">Proposé</th>
            <th scope="col">Arrêté</th>
          </tr>
        </thead>
        <tbody>
          {RUBRIQUES.map(({ code, libelle }) => (
            <tr key={code} data-ecart={valeurs[code] !== entier(charges.proposition[code] ?? "0")}>
              <th scope="row">{libelle}</th>
              <td className="tabulaire">{montantFcfa(charges.proposition[code] ?? "0")}</td>
              <td>
                <input
                  name={code}
                  inputMode="numeric"
                  aria-label={`${libelle} : montant arrêté`}
                  value={valeurs[code]}
                  onChange={(e) => setValeurs((v) => ({ ...v, [code]: e.target.value.replace(/[^\d]/g, "") }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ecarts.length > 0 && (
        <label className="arrete-charges__motif">
          Motif de l&rsquo;écart ({ecarts.map((r) => r.code).join(", ")})
          <input name="motif" required minLength={10} maxLength={500} />
        </label>
      )}
      <button type="submit" className="bouton-primaire" disabled={enCours}>
        {enCours ? "…" : charges.arrete ? "Arrêter à nouveau" : "Arrêter les charges du mois"}
      </button>
      {etat.echec && (
        <p role="alert" className="arrete-charges__retour" data-ton="echec">
          {etat.echec}
        </p>
      )}
      {etat.fait && (
        <p role="status" className="arrete-charges__retour" data-ton="fait">
          {etat.fait}
        </p>
      )}
    </form>
  );
}
