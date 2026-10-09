"use client";

import { useActionState, useState } from "react";

import { fixerUnTarif } from "@/app/lib/actions-souscription";
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
 * Fixer le prix d'une prestation, ou d'une de ses tranches : le geste du gérant.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE GESTE ENGAGE LE CABINET ENVERS CHAQUE CLIENT QUI PAIERA CE PRIX
 *
 * D'où la case qui dit ce qu'il fait, le motif obligatoire, et la date d'effet qui
 * commence au plus tôt aujourd'hui : un prix ne se fixe pas dans le passé, sinon un
 * devis déjà remis à un client changerait de montant. Corriger un prix, c'est en
 * fixer un nouveau à partir d'une date.
 *
 * ⚠️ L'AUTEUR N'EST PAS UN CHAMP : le backend le prend de la session et l'inscrit au
 * journal. On ne fait pas porter un prix à un collègue.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FixerUnTarif({
  service,
  formule,
  intitule,
  montantActuel,
  aujourdhui,
  dejaFixe,
}: {
  service: string;
  formule: string | null;
  intitule: string;
  montantActuel: string | null;
  aujourdhui: string;
  dejaFixe: boolean;
}) {
  const [etat, fixer, enCours] = useActionState(fixerUnTarif, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        {dejaFixe ? "Changer ce prix" : "Fixer ce prix"}
      </button>
    );
  }
  return (
    <form action={fixer} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260, paddingBlock: 6 }}>
      <input type="hidden" name="service" value={service} />
      <input type="hidden" name="formule" value={formule ?? ""} />
      <label style={note}>
        Montant en FCFA
        <input
          name="montant"
          required
          inputMode="numeric"
          defaultValue={montantActuel ? String(Math.round(Number(montantActuel))) : ""}
          style={champ}
        />
      </label>
      <label style={note}>
        À partir du
        <input name="a_partir_du" type="date" required min={aujourdhui} defaultValue={aujourdhui} style={champ} />
      </label>
      <label style={note}>
        Motif
        <input
          name="motif"
          required
          minLength={3}
          placeholder="Barème 2026 arrêté par la gérance, révision annuelle…"
          style={champ}
        />
      </label>
      <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>
          {intitule} sera facturé à ce prix sur tout devis établi à partir de cette date, et payable en ligne. Mon nom sera
          inscrit au journal.
        </span>
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Fixer le prix"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}
