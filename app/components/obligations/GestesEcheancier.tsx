"use client";

import { useActionState } from "react";

import { constaterLeDepotTva, simulerUnePenalite, type EtatPenalite } from "@/app/lib/actions-obligations";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

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
const etiquette: React.CSSProperties = { font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-500)" };
const note: React.CSSProperties = { margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const grille: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
  padding: "12px 16px",
};

function francs(valeur: string): string {
  return `${Number(valeur).toLocaleString("fr-FR")} FCFA`;
}

const PENALITE_INITIALE: EtatPenalite = { echec: null, penalite: null };

/**
 * Estimer la pénalité d'une obligation en retard (pas 87).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE CHIFFRE N'APPARAÎT JAMAIS SANS SA SOURCE
 *
 * Les deux taux, leur texte et leur statut sont affichés sous le total. Avant le pas 87,
 * la route appliquait un taux fixe de 10 % écrit en dur au lieu des 25 % validés : un
 * chiffre sans source aurait caché l'écart. L'écran n'envoie aucun taux.
 *
 * Le montant dû est saisi : l'échéancier ne connaît un montant que quand la déclaration
 * est préparée, et une pénalité sur un montant inventé n'aurait aucun sens.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SimulateurPenalite({
  echeances,
  aujourdhui,
}: {
  echeances: { valeur: string; libelle: string; montant: string | null }[];
  aujourdhui: string;
}) {
  const [etat, simuler, enCours] = useActionState(simulerUnePenalite, PENALITE_INITIALE);
  const p = etat.penalite;
  return (
    <form action={simuler} style={grille}>
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Obligation en retard
        <select name="echeance" required style={champ} defaultValue={echeances[0]?.valeur}>
          {echeances.map((e) => (
            <option key={`${e.valeur}-${e.libelle}`} value={e.valeur}>
              {e.libelle}
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>
        Montant dû (FCFA)
        <input name="montant_du" required inputMode="numeric" defaultValue={echeances[0]?.montant ?? ""} style={champ} />
      </label>
      <label style={etiquette}>
        Dépôt prévu le
        <input type="date" name="a_la_date" required defaultValue={aujourdhui} style={champ} />
      </label>
      <div style={{ alignSelf: "end" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Estimer"}
        </button>
      </div>
      {etat.echec && (
        <p role="alert" style={{ ...note, gridColumn: "1 / -1", color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
      {p && (
        <div role="status" style={{ gridColumn: "1 / -1", font: "400 13px/1.6 var(--police-texte)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {p.mois_de_retard === 0
              ? "Aucune pénalité à cette date."
              : `${francs(p.total)} de pénalités (${p.jours_de_retard} jours, ${p.mois_de_retard} mois entamés) : ${francs(p.a_regler)} à régler.`}
          </p>
          {p.mois_de_retard > 0 && (
            <ul style={{ ...note, margin: "4px 0 0", paddingLeft: 18 }}>
              <li>
                Pénalité fixe {francs(p.penalite_fixe)} : {String(p.taux_fixe.valeur)} % ({p.taux_fixe.statut.toLowerCase().replace("_", " ")}) · {p.taux_fixe.fondement.texte}
              </li>
              <li>
                Majoration {francs(p.majoration_mensuelle)} : {String(p.taux_mensuel.valeur)} % par mois ({p.taux_mensuel.statut.toLowerCase().replace("_", " ")}) · {p.taux_mensuel.fondement.texte}
              </li>
            </ul>
          )}
          <p style={{ ...note, marginTop: 4 }}>
            Estimation prudente : chaque mois entamé compte, en attendant que le fiscaliste confirme le décompte.
          </p>
        </div>
      )}
    </form>
  );
}

/**
 * Consigner l'accusé du dépôt de TVA de la période affichée (pas 87).
 *
 * L'heure saisie est celle de Douala, telle que l'accusé la porte ; l'action la convertit.
 */
export function ConstatDepotTva({ dossier, debut, fin, montant }: { dossier: string; debut: string; fin: string; montant: string | null }) {
  const [etat, envoyer, enCours] = useActionState(constaterLeDepotTva, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return (
      <p role="status" style={{ ...note, padding: "12px 16px", color: "var(--success)" }}>
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={envoyer} style={grille}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="periode_debut" value={debut} />
      <input type="hidden" name="periode_fin" value={fin} />
      <label style={etiquette}>
        Numéro de l&rsquo;accusé DGI
        <input name="numero" required maxLength={120} style={champ} />
      </label>
      <label style={etiquette}>
        Déposé le (heure de Douala)
        <input type="datetime-local" name="depose_le" required style={champ} />
      </label>
      <label style={etiquette}>
        Montant constaté (FCFA)
        <input name="montant_constate" inputMode="numeric" defaultValue={montant ?? ""} style={champ} />
      </label>
      <label style={etiquette}>
        Pièce jointe (référence)
        <input name="piece_jointe" maxLength={200} style={champ} />
      </label>
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Précision (facultative)
        <input name="precision" maxLength={500} style={champ} />
      </label>
      <p style={{ ...note, gridColumn: "1 / -1" }}>
        L&rsquo;accusé est confronté au bordereau préparé : même référence et même empreinte. S&rsquo;il a été obtenu
        avant une correction des écritures, il est refusé. Sans pièce jointe, il est marqué non vérifiable.
      </p>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Consigner le dépôt de TVA"}
        </button>
        {etat.echec && (
          <span role="alert" style={{ ...note, color: "var(--danger)" }}>
            {etat.echec}
          </span>
        )}
      </div>
    </form>
  );
}
