"use client";

import { useActionState, useRef, useState } from "react";

import { corrigerEcriture, saisirEcriture } from "@/app/lib/actions-comptabilite";
import type { Compte, Ecriture, Journal } from "@/app/lib/comptabilite";
// ⚠️ Les valeurs viennent de `saisie.ts` et les types de `comptabilite.ts` : les
// types s'effacent à la compilation, les valeurs non. Prendre la constante dans
// `comptabilite.ts` embarquerait `next/headers` dans le paquet du navigateur.
import { ETAT_SAISIE_INITIAL, LIGNES_OFFERTES } from "@/app/lib/saisie";
import { PaletteDeComptes, type EntreeDePalette } from "./PaletteDeComptes";

/**
 * La saisie d'une écriture comptable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IL FONCTIONNE SANS JAVASCRIPT, ET C'EST LA CONTRAINTE QUI A DICTÉ SA FORME
 *
 * `action={...}` sur un `<form>` : la soumission est un POST ordinaire tant que
 * le script n'a pas pris la main. D'où huit lignes offertes d'emblée plutôt qu'un
 * bouton « ajouter une ligne », et un `<datalist>` plutôt qu'une liste déroulante
 * pilotée par le clavier. Sur les connexions visées, c'est la différence entre
 * « je saisis » et « la page ne fait rien ».
 *
 * LE TOTAL S'AFFICHE EN DIRECT, MAIS N'AUTORISE RIEN
 *
 * Le compteur débit/crédit est une **commodité**, pas un contrôle : il évite
 * l'aller-retour sur une écriture qu'on voit déséquilibrée. L'équilibre reste
 * jugé par le backend, qui est le seul dont le verdict engage. Le bouton
 * d'enregistrement n'est donc jamais désactivé par ce compteur : un formulaire
 * qui se bloque tout seul, sur une addition faite dans le navigateur, refuserait
 * un jour une écriture juste — et le comptable n'aurait aucun recours.
 *
 * ⚠️ POURQUOI PAS D'ÉQUILIBRAGE AUTOMATIQUE DE LA DERNIÈRE LIGNE
 *
 * C'est le confort qu'on attend d'un logiciel comptable, et il est écarté ici :
 * complété d'office, le montant de contrepartie n'est plus relu, et une erreur
 * de saisie sur les lignes précédentes se solde par une écriture équilibrée et
 * fausse. Équilibrée et fausse est le pire des deux mondes, parce que plus aucun
 * contrôle ne la rattrape.
 *
 * ⚠️ LE MÊME FORMULAIRE CORRIGE UN BROUILLON (pas 72)
 *
 * Avec `ecriture`, il se présente prérempli, à son numéro, et envoie une
 * correction. Le journal s'affiche sans se choisir : il fait partie de la clé, et
 * changer de journal retirerait un numéro d'une séquence pour en prendre un dans
 * une autre. Un seul formulaire pour les deux gestes : deux formulaires finiraient
 * par ne plus accepter la même écriture.
 *
 * PAS 110 : DUPLIQUER, ET LA PALETTE F2
 *
 * Avec `modele`, le formulaire saisit une **nouvelle** écriture préremplie d'une autre (journal,
 * libellé, lignes), datée d'aujourd'hui et **sans pièce** : une pièce justifie une écriture, pas
 * deux, et la reprendre en double ferait comptabiliser deux fois la même facture.
 * F2 sur un champ « Compte » ouvre la palette ; `comptesUtilises` (du backend) passent en tête.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FormulaireEcriture({
  dossier,
  exercice,
  journaux,
  comptes,
  aujourdHui,
  ecriture,
  modele,
  comptesUtilises,
}: {
  dossier: string;
  exercice: string;
  journaux: Journal[];
  comptes: Compte[];
  aujourdHui: string;
  /** Présente : le formulaire corrige ce brouillon au lieu d'en saisir un nouveau. */
  ecriture?: Ecriture;
  /** Pas 110 : une écriture à dupliquer dans une nouvelle saisie. Ignorée en correction. */
  modele?: Ecriture;
  /** Pas 110 : les comptes du dossier, du plus au moins employé, pour la palette F2. */
  comptesUtilises?: { compte: string; lignes: number }[];
}) {
  const source = ecriture ?? modele;
  const [palette, setPalette] = useState<number | null>(null);
  const champsCompte = useRef<(HTMLInputElement | null)[]>([]);
  const intitules = new Map(comptes.map((c) => [c.numero, c.intitule]));
  const utilises = new Set((comptesUtilises ?? []).map((u) => u.compte));
  const entreesDePalette: EntreeDePalette[] = [
    ...(comptesUtilises ?? []).map((u) => ({ numero: u.compte, intitule: intitules.get(u.compte) ?? "", lignes: u.lignes })),
    ...comptes.filter((c) => !utilises.has(c.numero)).map((c) => ({ numero: c.numero, intitule: c.intitule, lignes: null })),
  ];
  const [etat, envoyer, enCours] = useActionState(
    ecriture ? corrigerEcriture : saisirEcriture,
    ETAT_SAISIE_INITIAL,
  );
  // ⚠️ Un identifiant par formulaire : la saisie et une correction ouvertes sur la même
  // page partageraient sinon le même `datalist`, et HTML exige des identifiants uniques.
  const idPlan = ecriture ? `plan-comptable-${ecriture.journal}-${ecriture.numero}` : "plan-comptable";
  // Autant de lignes que le brouillon en compte, et jamais moins que les huit offertes.
  const offertes = Math.max(LIGNES_OFFERTES, source?.lignes.length ?? 0);
  const [lignes, setLignes] = useState(() =>
    Array.from({ length: offertes }, (_, rang) => {
      const existante = source?.lignes[rang];
      return {
        compte: existante?.compte ?? "",
        libelle: existante?.libelle ?? "",
        // `string` et non l'union : le `<select>` rend une chaîne, et c'est l'action serveur
        // qui la ramène à DEBIT ou CREDIT.
        sens: (existante?.sens ?? "DEBIT") as string,
        montant: existante ? String(existante.montant) : "",
      };
    }),
  );

  const totaux = lignes.reduce(
    (cumul, ligne) => {
      const montant = Number(ligne.montant.replace(/\s/g, "").replace(",", ".")) || 0;
      return ligne.sens === "CREDIT"
        ? { ...cumul, credit: cumul.credit + montant }
        : { ...cumul, debit: cumul.debit + montant };
    },
    { debit: 0, credit: 0 },
  );
  const ecart = totaux.debit - totaux.credit;

  return (
    <form action={envoyer} className="saisie">
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="exercice" value={exercice} />
      <input type="hidden" name="lignes_offertes" value={offertes} />
      {ecriture && (
        <input type="hidden" name="cle" value={`${ecriture.exercice}/${ecriture.journal}/${ecriture.numero}`} />
      )}

      {etat.echec && (
        <p className="saisie__echec" role="alert">
          {etat.echec}
        </p>
      )}
      {etat.enregistree && ecriture && (
        <p className="saisie__succes" role="status">
          <strong>
            Brouillon {etat.enregistree.journal} n° {etat.enregistree.numero} corrigé.
          </strong>{" "}
          Il garde son numéro et reste à valider.
        </p>
      )}
      {modele && !ecriture && !etat.enregistree && (
        <p className="saisie__succes" role="status">
          Dupliquée de {modele.journal} n° {modele.numero} : vérifiez la date, et renseignez la pièce, qui n&rsquo;est pas reprise.
        </p>
      )}
      {etat.enregistree && !ecriture && (
        <p className="saisie__succes" role="status">
          <strong>
            Écriture {etat.enregistree.journal} n° {etat.enregistree.numero} enregistrée en
            brouillon.
          </strong>{" "}
          Elle figure ci-dessous et reste modifiable tant qu&rsquo;elle n&rsquo;est pas
          validée. Une écriture validée ne se corrige plus que par contre-passation.
        </p>
      )}

      <div className="saisie__entete">
        {ecriture ? (
          <label className="champ">
            <span>Journal</span>
            <input type="text" value={`${ecriture.journal} n° ${ecriture.numero}`} readOnly />
          </label>
        ) : (
          <label className="champ">
            <span>Journal</span>
            <select name="journal" defaultValue={modele?.journal ?? journaux[0]?.code ?? ""} required>
              {journaux.map((journal) => (
                <option key={journal.code} value={journal.code}>
                  {journal.code} · {journal.intitule}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="champ">
          <span>Date de l&rsquo;opération</span>
          <input
            type="date"
            name="date_operation"
            defaultValue={ecriture?.date_operation ?? aujourdHui}
            required
          />
        </label>

        <label className="champ champ--large">
          <span>Libellé</span>
          <input
            type="text"
            name="libelle"
            placeholder="Facture ALPHA n° F-2026-0912"
            maxLength={200}
            defaultValue={source?.libelle}
            required
          />
        </label>

        <label className="champ">
          <span>Pièce justificative</span>
          <input
            type="text"
            name="piece_justificative"
            placeholder="PJ-2026-0912"
            defaultValue={ecriture?.piece_justificative ?? undefined}
          />
        </label>
      </div>

      {/* Un `datalist` plutôt qu'un `select` : le plan compte des centaines de
          comptes, et un comptable tape « 601 » plus vite qu'il ne déroule. La
          liste reste ouverte à la frappe libre, et le backend refuse tout compte
          absent du plan — c'est lui qui garde la porte, pas ce champ. */}
      <datalist id={idPlan}>
        {comptes.map((compte) => (
          <option key={compte.numero} value={compte.numero}>
            {compte.intitule}
          </option>
        ))}
      </datalist>

      <table className="saisie__lignes">
        <thead>
          <tr>
            <th style={{ width: "13%" }}>Compte</th>
            <th>Libellé de la ligne</th>
            <th style={{ width: "12%" }}>Sens</th>
            <th style={{ width: "18%" }} className="aDroite">
              Montant
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, rang) => (
            <tr key={rang}>
              <td style={{ position: "relative" }}>
                <input
                  ref={(element) => {
                    champsCompte.current[rang] = element;
                  }}
                  type="text"
                  name={`compte-${rang}`}
                  defaultValue={ligne.compte}
                  list={idPlan}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={rang === 0 ? "601 · F2" : ""}
                  title="F2 : palette des comptes"
                  onKeyDown={(evenement) => {
                    if (evenement.key === "F2") {
                      evenement.preventDefault();
                      setPalette(rang);
                    }
                  }}
                />
                {palette === rang && (
                  <PaletteDeComptes
                    entrees={entreesDePalette}
                    onChoisir={(numero) => {
                      const champ = champsCompte.current[rang];
                      if (champ) champ.value = numero;
                      setPalette(null);
                      champsCompte.current[rang]?.focus();
                    }}
                    onFermer={() => {
                      setPalette(null);
                      champsCompte.current[rang]?.focus();
                    }}
                  />
                )}
              </td>
              <td>
                <input
                  type="text"
                  name={`libelle-${rang}`}
                  defaultValue={ligne.libelle}
                  maxLength={200}
                  placeholder={rang === 0 ? "Achat de marchandises" : ""}
                />
              </td>
              <td>
                <select
                  name={`sens-${rang}`}
                  value={ligne.sens}
                  onChange={(evenement) =>
                    setLignes((precedent) =>
                      precedent.map((l, i) =>
                        i === rang ? { ...l, sens: evenement.target.value } : l,
                      ),
                    )
                  }
                >
                  <option value="DEBIT">Débit</option>
                  <option value="CREDIT">Crédit</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  name={`montant-${rang}`}
                  inputMode="decimal"
                  className="aDroite"
                  value={ligne.montant}
                  onChange={(evenement) =>
                    setLignes((precedent) =>
                      precedent.map((l, i) =>
                        i === rang ? { ...l, montant: evenement.target.value } : l,
                      ),
                    )
                  }
                  placeholder={rang === 0 ? "1 000 000" : ""}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="saisie__pied">
        <div className="saisie__totaux" aria-live="polite">
          <span>
            Débit <strong>{totaux.debit.toLocaleString("fr-FR")}</strong>
          </span>
          <span>
            Crédit <strong>{totaux.credit.toLocaleString("fr-FR")}</strong>
          </span>
          <span className={ecart === 0 ? "saisie__ecart--nul" : "saisie__ecart"}>
            {ecart === 0
              ? "équilibrée"
              : `écart ${Math.abs(ecart).toLocaleString("fr-FR")} au ${
                  ecart > 0 ? "débit" : "crédit"
                }`}
          </span>
        </div>
        <button type="submit" className="bouton-primaire" disabled={enCours}>
          {enCours ? "Enregistrement…" : ecriture ? "Enregistrer la correction" : "Enregistrer en brouillon"}
        </button>
      </div>
    </form>
  );
}
