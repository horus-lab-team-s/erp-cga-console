"use client";

import { useActionState } from "react";

import { constaterUnDepot } from "@/app/lib/actions-obligations";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

export type ObligationAConstater = { valeur: string; libelle: string };

/**
 * Consigner l'accusé d'une obligation déposée hors de la plateforme.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA LISTE EST UN AFFICHAGE, PAS UNE RÈGLE
 *
 * La page propose les obligations hors TVA non déposées dont la période a commencé.
 * Ce filtre sert à ne pas noyer le choix sous les échéances de décembre ; il ne
 * décide rien. Un dépôt daté avant la fin de sa période, ou dans l'avenir, est
 * refusé par le backend, et sa phrase s'affiche.
 *
 * L'heure saisie est celle de Douala, telle que l'accusé la porte ; l'action la
 * convertit.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ConstatDepot({
  dossier,
  obligations,
}: {
  dossier: string;
  obligations: ObligationAConstater[];
}) {
  const [etat, envoyer, enCours] = useActionState(constaterUnDepot, ETAT_ACTE_INITIAL);
  const champ: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 2,
    padding: "5px 8px",
    border: "1px solid var(--line-200)",
    borderRadius: "var(--rayon-petit)",
    font: "400 13px/1.4 var(--police-texte)",
  };
  const etiquette: React.CSSProperties = {
    font: "600 12px/1.4 var(--police-texte)",
    color: "var(--ink-500)",
  };
  const note: React.CSSProperties = {
    margin: 0,
    font: "400 12.5px/1.5 var(--police-texte)",
    color: "var(--ink-500)",
  };

  return (
    <form
      action={envoyer}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
        padding: "12px 16px",
      }}
    >
      <input type="hidden" name="dossier" value={dossier} />
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Obligation déposée
        <select name="obligation" required style={champ} defaultValue="">
          <option value="" disabled>
            Choisir dans l&rsquo;échéancier
          </option>
          {obligations.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>
        Numéro de l&rsquo;accusé
        <input name="numero" required maxLength={120} style={champ} />
      </label>
      <label style={etiquette}>
        Déposé le (heure de Douala)
        <input type="datetime-local" name="depose_le" required style={champ} />
      </label>
      <label style={etiquette}>
        Montant constaté (FCFA, facultatif)
        <input name="montant_constate" inputMode="numeric" style={champ} />
      </label>
      {/* Pas 113 : la quittance envoyée par l'adhérent (« preuve de paiement reçue ») se joint ici. */}
      <label style={etiquette}>
        Pièce jointe (facultative)
        <input name="piece_jointe" maxLength={80} placeholder="PJ-2026-0042" style={champ} />
      </label>
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Précision (facultative)
        <input name="precision" maxLength={500} style={champ} />
      </label>
      <p style={{ ...note, gridColumn: "1 / -1" }}>
        Aucun bordereau n&rsquo;est confronté à cet accusé : le constat prouve ce que vous
        déclarez, pas ce que le guichet a reçu. Le guichet (DGI ou CNPS) est celui que le
        catalogue attribue à l&rsquo;obligation.
      </p>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Consigner le dépôt"}
        </button>
        {etat.echec && (
          <span role="alert" style={{ ...note, color: "var(--danger)" }}>
            {etat.echec}
          </span>
        )}
        {etat.fait && (
          <span role="status" style={{ ...note, color: "var(--success)" }}>
            {etat.fait}
          </span>
        )}
      </div>
    </form>
  );
}
