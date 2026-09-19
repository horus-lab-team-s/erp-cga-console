"use client";

import { useActionState, useState } from "react";

import { contrepasserEcriture, signalerAuReviseur } from "@/app/lib/actions-comptabilite";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les gestes de la fiche d'une écriture (pas 110). Composant client : ni `api.ts` ni
 * `fiche-ecriture.ts` ici. Les champs sont contrôlés : un refus ne vide pas ce qui a été écrit.
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.45 var(--police-texte)",
};

type Ids = { dossier: string; exercice: string; journal: string; numero: number };

function Retour({ etat }: { etat: { echec: string | null; fait: string | null } }) {
  if (etat.echec) return <p role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</p>;
  if (etat.fait) return <p role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</p>;
  return null;
}

export function SignalerAuReviseur({ ids }: { ids: Ids }) {
  const [etat, envoyer, enCours] = useActionState(signalerAuReviseur, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState("");
  if (!ouvert) {
    return (
      <button type="button" className="action-secondaire" onClick={() => setOuvert(true)}>
        Signaler au réviseur
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "grid", gap: 6, flexBasis: "100%" }}>
      <input type="hidden" name="dossier" value={ids.dossier} />
      <input type="hidden" name="exercice" value={ids.exercice} />
      <input type="hidden" name="journal" value={ids.journal} />
      <input type="hidden" name="numero" value={ids.numero} />
      <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
        Ce que le réviseur doit regarder
        <textarea name="message" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...champ, resize: "vertical" }} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Envoyer le signalement"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      <Retour etat={etat} />
    </form>
  );
}

/**
 * Créer la contre-passation dont la page vient de montrer l'aperçu. La date part telle que
 * l'aperçu l'a éprouvée : la changer se fait en haut de la page, qui recalcule l'aperçu.
 */
export function CreerLaContrepassation({ ids, dateOperation }: { ids: Ids; dateOperation: string }) {
  const [etat, envoyer, enCours] = useActionState(contrepasserEcriture, ETAT_ACTE_INITIAL);
  const [motif, setMotif] = useState("");
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={envoyer} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="dossier" value={ids.dossier} />
      <input type="hidden" name="cle" value={`${ids.exercice}/${ids.journal}/${ids.numero}`} />
      <input type="hidden" name="date_operation" value={dateOperation} />
      <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
        Motif, obligatoire
        <textarea
          name="motif"
          required
          rows={2}
          maxLength={200}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Erreur d'imputation : la facture est réglée en espèces au-delà du seuil."
          style={{ ...champ, resize: "vertical" }}
        />
      </label>
      <p style={note}>Contre-passation journalisée : auteur, date et motif visibles au grand livre.</p>
      <div>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Créer la contre-passation"}
        </button>
      </div>
      <Retour etat={etat} />
    </form>
  );
}
