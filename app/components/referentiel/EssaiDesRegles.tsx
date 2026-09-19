"use client";

import { useActionState } from "react";

import { eprouverSurUneFacture, type EtatEssai } from "@/app/lib/actions-regles";

const INITIAL: EtatEssai = { echec: null, reponse: null };
const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };

/**
 * Éprouver le catalogue sur une facture modifiée à la main (pas 90).
 *
 * ⚠️ Le point de départ est une vraie facture de démonstration, déjà au bon format : écrire
 * une facture de zéro ferait échouer l'essai sur la forme, et l'on n'apprendrait rien des
 * règles. Le verdict et chaque constat s'affichent avec le code de la règle qui l'a produit.
 */
export function EssaiDesRegles({ factureDeDepart, aujourdhui }: { factureDeDepart: string; aujourdhui: string }) {
  const [etat, eprouver, enCours] = useActionState(eprouverSurUneFacture, INITIAL);
  return (
    <form action={eprouver} style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={note}>
        Modifiez la facture (mode de règlement, montants, NIU du fournisseur) puis contrôlez : le rapport dit quelles règles
        réagissent. Rien n&rsquo;est enregistré.
      </p>
      <textarea
        name="facture"
        defaultValue={factureDeDepart}
        rows={14}
        spellCheck={false}
        style={{ width: "100%", boxSizing: "border-box", font: "400 12px/1.45 var(--police-mono, monospace)", padding: 8 }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ font: "600 12px/1.4 var(--police-texte)" }}>
          Règles en vigueur au <input type="date" name="a_la_date" defaultValue={aujourdhui} />
        </label>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Contrôler"}
        </button>
        {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
      </div>
      {etat.reponse && (
        <div role="status" style={{ font: "400 13px/1.6 var(--police-texte)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {etat.reponse.verdict.titre} · {etat.reponse.verdict.detail}
          </p>
          {etat.reponse.rapport.constats.length === 0 ? (
            <p style={note}>Aucune règle n&rsquo;a réagi.</p>
          ) : (
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {etat.reponse.rapport.constats.map((c) => (
                <li key={`${c.code_regle}-${c.message}`}>
                  <strong>{c.code_regle}</strong> ({c.severite.toLowerCase()}) : {c.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
