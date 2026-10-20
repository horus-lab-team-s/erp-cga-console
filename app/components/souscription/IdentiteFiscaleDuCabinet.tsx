"use client";

import { useActionState, useState } from "react";

import { saisirLIdentiteFiscale } from "@/app/lib/actions-facturation";
import { LIBELLES_REGIME_TVA, type IdentiteLue, type RegimeTvaDuCabinet } from "@/app/lib/facturation-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "5px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

/**
 * L'identité fiscale du cabinet, que la facture définitive porte (18 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * « Donner la possibilité de saisir cela plus tard. » Chaque champ peut rester vide ; on
 * enregistre ce qu'on a, et l'écran dit ce qui manque encore. Tant qu'il manque une
 * mention, aucune facture ne s'émet et l'adhérent ne voit pas le lien : la note
 * d'honoraires reste son document.
 *
 * ⚠️ Corriger une mention ne réécrit pas les factures déjà émises : chacune garde
 * l'identité du jour de son émission.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function IdentiteFiscaleDuCabinet({ lue }: { lue: IdentiteLue }) {
  const [etat, saisir, enCours] = useActionState(saisirLIdentiteFiscale, ETAT_ACTE_INITIAL);
  const i = lue.identite;
  const [regime, setRegime] = useState<RegimeTvaDuCabinet | "">(i.regime_tva ?? "");
  return (
    <form action={saisir} style={{ display: "grid", gap: 10, padding: "12px 14px" }}>
      <p style={note}>
        {lue.complete
          ? "L'identité est complète : la facture définitive s'émet pour chaque échéance réglée."
          : `Il manque encore ${lue.manques.join(", ")}. Enregistrez ce que vous avez : le reste se saisit plus tard.`}
      </p>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={note}>
          NIU du cabinet
          <input name="niu" defaultValue={i.niu ?? ""} maxLength={14} placeholder="M012345678901X" style={champ} />
        </label>
        <label style={note}>
          Numéro RCCM
          <input name="rccm" defaultValue={i.rccm ?? ""} maxLength={60} placeholder="RC/DLA/2019/B/0421" style={champ} />
        </label>
        <label style={note}>
          Régime de TVA
          <select
            name="regime_tva"
            value={regime}
            onChange={(e) => setRegime(e.target.value as RegimeTvaDuCabinet | "")}
            style={champ}
          >
            <option value="">Pas encore connu</option>
            {(Object.keys(LIBELLES_REGIME_TVA) as RegimeTvaDuCabinet[]).map((r) => (
              <option key={r} value={r}>
                {LIBELLES_REGIME_TVA[r]}
              </option>
            ))}
          </select>
        </label>
        {regime === "ASSUJETTI" && (
          <>
            <label style={note}>
              Taux de TVA (%)
              <input name="taux_tva" inputMode="decimal" defaultValue={i.taux_tva ?? ""} placeholder="19,25" style={champ} />
            </label>
            <label style={note}>
              Les honoraires convenus s&rsquo;entendent
              <select name="montants_convenus" defaultValue={i.montants_convenus ?? ""} style={champ}>
                <option value="">À préciser</option>
                <option value="HT">hors taxes (la TVA s&rsquo;ajoute)</option>
                <option value="TTC">toutes taxes comprises (la TVA s&rsquo;en extrait)</option>
              </select>
            </label>
          </>
        )}
        {regime === "EXONERE" && (
          <label style={note}>
            Texte qui fonde l&rsquo;exonération
            <input name="fondement_exoneration" defaultValue={i.fondement_exoneration ?? ""} maxLength={300} style={champ} />
          </label>
        )}
      </div>
      <div>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Enregistrer"}
        </button>
      </div>
      {etat.echec && (
        <p role="alert" style={{ ...note, color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
      {etat.fait && (
        <p role="status" style={{ ...note, color: "var(--success)" }}>
          {etat.fait}
        </p>
      )}
    </form>
  );
}
