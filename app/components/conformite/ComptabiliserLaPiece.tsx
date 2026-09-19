"use client";

import { useActionState } from "react";

import { enregistrerLEcritureDeLaPiece, proposerLEcritureDeLaPiece } from "@/app/lib/actions-comptabilite";
import { ETAT_PROPOSITION_INITIAL } from "@/app/lib/saisie";
import { Link } from "@/i18n/navigation";

/**
 * Comptabiliser une pièce contrôlée : proposer, relire, enregistrer en brouillon (pas 73).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE BOUTON EXISTAIT, ET NE FAISAIT RIEN
 *
 * « Valider et comptabiliser » figurait au pied de l'écran E02 depuis sa création,
 * `type="button"` sans aucune action. La route qui propose l'écriture d'une facture
 * contrôlée existait aussi, sans écran. Le lien entre le verdict et l'imputation
 * reposait sur la mémoire du comptable.
 *
 * ⚠️ DEUX TEMPS, ET LE LIBELLÉ DIT CE QUI SE PASSE
 *
 *   1. « Proposer l'écriture » : rien n'est écrit. Les lignes s'affichent, avec ce
 *      que le portefeuille a rectifié (un régime déclaré à tort, par exemple).
 *   2. « Enregistrer en brouillon » : l'écriture entre au journal, en brouillon.
 *      Elle se relit et se valide sur l'écran de saisie, comme toute écriture.
 *
 * Le bouton ne dit plus « valider » : il ne valide rien. Un libellé qui promet plus
 * que le geste est la faute que ce projet corrige depuis le pas 71.
 *
 * Le navigateur n'envoie que la référence de la pièce : voir l'action serveur.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ComptabiliserLaPiece({
  reference,
  avecConsequence,
}: {
  reference: string;
  /** Un constat majeur : la comptabilisation emporte une conséquence fiscale. */
  avecConsequence: boolean;
}) {
  const [propose, proposer, enProposition] = useActionState(proposerLEcritureDeLaPiece, ETAT_PROPOSITION_INITIAL);
  const [enregistre, enregistrer, enEnregistrement] = useActionState(
    enregistrerLEcritureDeLaPiece,
    ETAT_PROPOSITION_INITIAL,
  );
  const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };

  if (enregistre.enregistree && enregistre.dossier) {
    const e = enregistre.enregistree;
    return (
      <p role="status" style={{ ...note, color: "var(--ink-900)" }}>
        <strong>
          Écriture {e.journal} n° {e.numero} enregistrée en brouillon.
        </strong>{" "}
        Elle se relit et se valide sur{" "}
        <Link href={`/comptabilite/saisie?dossier=${enregistre.dossier}&exercice=${e.exercice}&journal=${e.journal}`}>
          l&rsquo;écran de saisie
        </Link>
        .
      </p>
    );
  }

  const proposition = propose.proposition;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexBasis: "100%" }}>
      {!proposition && (
        <form action={proposer} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="reference" value={reference} />
          <button type="submit" className="action-principale" disabled={enProposition}>
            {enProposition
              ? "…"
              : avecConsequence
                ? "Proposer l’écriture, conséquence fiscale comprise"
                : "Proposer l’écriture"}
          </button>
          <span style={note}>Rien n&rsquo;est écrit à cette étape.</span>
        </form>
      )}
      {propose.echec && (
        <p role="alert" style={{ ...note, color: "var(--danger)" }}>
          {propose.echec}
        </p>
      )}
      {proposition && (
        <>
          {proposition.rectifications.map((r) => (
            <p key={r} role="note" style={{ ...note, color: "var(--ink-900)" }}>
              △ {r}
            </p>
          ))}
          {!proposition.comptabilisable || !proposition.saisie ? (
            <p role="alert" style={{ ...note, color: "var(--danger)" }}>
              {proposition.empechements.join(" ") || "Pièce non comptabilisable."}
            </p>
          ) : (
            <>
              <p style={note}>
                {proposition.saisie.journal} n° {proposition.numero_pressenti} pressenti (le numéro est attribué à
                l&rsquo;enregistrement) · {proposition.saisie.date_operation} · {proposition.saisie.libelle}
              </p>
              <table style={{ borderCollapse: "collapse", font: "400 12.5px/1.5 var(--police-texte)", width: "100%" }}>
                <thead>
                  <tr style={{ color: "var(--ink-500)", textAlign: "left" }}>
                    <th style={{ padding: "2px 6px" }}>Compte</th>
                    <th style={{ padding: "2px 6px" }}>Libellé</th>
                    <th style={{ padding: "2px 6px", textAlign: "right" }}>Débit</th>
                    <th style={{ padding: "2px 6px", textAlign: "right" }}>Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {proposition.saisie.lignes.map((l, rang) => (
                    <tr key={rang} style={{ borderTop: "1px solid var(--line-100)" }}>
                      <td className="tabulaire" style={{ padding: "2px 6px" }}>
                        {l.compte}
                      </td>
                      <td style={{ padding: "2px 6px" }}>
                        {l.libelle}
                        {/* ⚠️ Une TVA rejetée garde sa ligne de TVA, marquée non déductible :
                            l'imputation finale est laissée au cabinet (consequences_fiscales.py),
                            et la déclaration de TVA lit la marque. Sans cette mention, le
                            comptable lirait une TVA récupérable que le moteur vient de refuser. */}
                        {nonDeductible(l.attribut_fiscal) && (
                          <span style={{ display: "block", color: "var(--danger)", fontSize: 11.5 }}>
                            TVA non déductible ({nonDeductible(l.attribut_fiscal)})
                          </span>
                        )}
                      </td>
                      <td className="tabulaire" style={{ padding: "2px 6px", textAlign: "right" }}>
                        {l.sens === "DEBIT" ? Number(l.montant).toLocaleString("fr-FR") : ""}
                      </td>
                      <td className="tabulaire" style={{ padding: "2px 6px", textAlign: "right" }}>
                        {l.sens === "CREDIT" ? Number(l.montant).toLocaleString("fr-FR") : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <form action={enregistrer} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input type="hidden" name="reference" value={reference} />
                <button type="submit" className="action-principale" disabled={enEnregistrement}>
                  {enEnregistrement ? "…" : "Enregistrer en brouillon"}
                </button>
                <span style={note}>Le brouillon se valide ensuite sur l&rsquo;écran de saisie.</span>
              </form>
              {enregistre.echec && (
                <p role="alert" style={{ ...note, color: "var(--danger)" }}>
                  {enregistre.echec}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Le code de la règle qui rend cette ligne non déductible, ou `null`. */
function nonDeductible(attribut: unknown): string | null {
  if (!attribut || typeof attribut !== "object") return null;
  const a = attribut as { tva_deductible?: boolean; code_regle_origine?: string | null };
  return a.tva_deductible === false ? (a.code_regle_origine ?? "règle de conformité") : null;
}
