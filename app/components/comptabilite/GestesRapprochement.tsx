"use client";

import { useActionState, useState } from "react";

import {
  abandonnerLeReleve,
  dissocierLaLigne,
  importerUnReleve,
  justifierLaLigne,
  rapprocherLaLigne,
  validerLeRapprochement,
} from "@/app/lib/actions-rapprochement";
import { NATURES_DE_JUSTIFICATION } from "@/app/lib/libelles-rapprochement";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les gestes du rapprochement bancaire (pas 101).
 *
 * ⚠️ Composant client : il n'importe ni `rapprochement.ts` ni `api.ts` (qui tirent
 * `next/headers`). Les données arrivent en props simples.
 *
 * ⚠️ Les champs saisis sont contrôlés : React réinitialise un formulaire soumis par action,
 * et un refus (relevé qui ne tombe pas juste, motif trop court) ne doit pas effacer ce que
 * le comptable vient de recopier du relevé. Leçon du pas 100.
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};
const etiquette: React.CSSProperties = { display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" };

function Echec({ texte }: { texte: string | null }) {
  return texte ? <p role="alert" style={{ ...note, color: "var(--danger)" }}>{texte}</p> : null;
}

function Fait({ texte }: { texte: string | null }) {
  return texte ? <p role="status" style={{ ...note, color: "var(--success)" }}>{texte}</p> : null;
}

export function ImporterUnReleve({
  dossier,
  journaux,
  profils,
  du,
  au,
}: {
  dossier: string;
  journaux: { code: string; intitule: string }[];
  profils: { code: string; libelle: string }[];
  du: string;
  au: string;
}) {
  const [etat, envoyer, enCours] = useActionState(importerUnReleve, ETAT_ACTE_INITIAL);
  const [valeurs, setValeurs] = useState({ journal: journaux[0]?.code ?? "BQ", du, au, solde_initial: "", solde_final: "", profil: profils[0]?.code ?? "" });
  const changer = (cle: keyof typeof valeurs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValeurs((v) => ({ ...v, [cle]: e.target.value }));
  if (profils.length === 0) {
    return (
      <p style={{ ...note, padding: "10px 16px" }}>
        Aucun format de relevé n&rsquo;est déclaré au référentiel (<code>rapprochement/releves/</code>) : l&rsquo;import de
        fichier est fermé.
      </p>
    );
  }
  return (
    <form action={envoyer} style={{ display: "grid", gap: 10, padding: "12px 16px" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <label style={etiquette}>
          Compte
          <select name="journal" value={valeurs.journal} onChange={changer("journal")} style={champ}>
            {journaux.map((j) => (
              <option key={j.code} value={j.code}>
                {j.code} · {j.intitule}
              </option>
            ))}
          </select>
        </label>
        <label style={etiquette}>
          Du
          <input type="date" name="du" required value={valeurs.du} onChange={changer("du")} style={champ} />
        </label>
        <label style={etiquette}>
          Au
          <input type="date" name="au" required value={valeurs.au} onChange={changer("au")} style={champ} />
        </label>
        <label style={etiquette}>
          Solde initial du relevé
          <input name="solde_initial" required inputMode="numeric" placeholder="0" value={valeurs.solde_initial} onChange={changer("solde_initial")} style={champ} />
        </label>
        <label style={etiquette}>
          Solde final du relevé
          <input name="solde_final" required inputMode="numeric" placeholder="18 420 500" value={valeurs.solde_final} onChange={changer("solde_final")} style={champ} />
        </label>
        <label style={etiquette}>
          Format
          <select name="profil" value={valeurs.profil} onChange={changer("profil")} style={champ}>
            {profils.map((p) => (
              <option key={p.code} value={p.code}>
                {p.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={etiquette}>
        Fichier du relevé (CSV)
        <input type="file" name="fichier" required accept=".csv,text/csv,text/plain" />
      </label>
      <p style={note}>
        Soldes signés du point de vue de l&rsquo;entreprise : négatif si le compte est à découvert. Le relevé est refusé
        s&rsquo;il ne tombe pas juste, pour ne pas chercher dans la comptabilité une erreur qui est dans le fichier.
      </p>
      <div>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "Import…" : "Importer et rapprocher"}
        </button>
      </div>
      <Echec texte={etat.echec} />
    </form>
  );
}

type Designation = { dossier: string; identifiant: string; rang: number };

function Caches({ d }: { d: Designation }) {
  return (
    <>
      <input type="hidden" name="dossier" value={d.dossier} />
      <input type="hidden" name="identifiant" value={d.identifiant} />
      <input type="hidden" name="rang" value={d.rang} />
    </>
  );
}

export function RapprocherCetteEcriture({ d, ecriture, ligne }: { d: Designation; ecriture: string; ligne: number }) {
  const [etat, envoyer, enCours] = useActionState(rapprocherLaLigne, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "grid", gap: 4, justifyItems: "end" }}>
      <Caches d={d} />
      <input type="hidden" name="ecriture" value={ecriture} />
      <input type="hidden" name="ligne" value={ligne} />
      <button type="submit" className="action-secondaire" disabled={enCours} aria-label={`Rapprocher de ${ecriture}`}>
        {enCours ? "…" : "Rapprocher"}
      </button>
      <Echec texte={etat.echec} />
    </form>
  );
}

export function DissocierLaLigne({ d }: { d: Designation }) {
  const [etat, envoyer, enCours] = useActionState(dissocierLaLigne, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "inline-grid", gap: 4 }}>
      <Caches d={d} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Défaire le rapprochement"}
      </button>
      <Echec texte={etat.echec} />
    </form>
  );
}

export function JustifierLaLigne({ d, sansProposition }: { d: Designation; sansProposition: boolean }) {
  const [etat, envoyer, enCours] = useActionState(justifierLaLigne, ETAT_ACTE_INITIAL);
  // Sans écriture possible, le cas le plus probable est l'absence de pièce : c'est la
  // règle du contrôle en amont, proposée d'abord.
  const [nature, setNature] = useState(sansProposition ? "PIECE_DEMANDEE" : "ECRITURE_A_VENIR");
  const [motif, setMotif] = useState("");
  const aide = NATURES_DE_JUSTIFICATION.find((n) => n.valeur === nature)?.aide;
  return (
    <form action={envoyer} style={{ display: "grid", gap: 8 }}>
      <Caches d={d} />
      <label style={etiquette}>
        Expliquer la ligne
        <select name="nature" value={nature} onChange={(e) => setNature(e.target.value)} style={champ}>
          {NATURES_DE_JUSTIFICATION.map((n) => (
            <option key={n.valeur} value={n.valeur}>
              {n.libelle}
            </option>
          ))}
        </select>
      </label>
      {aide && <p style={note}>{aide}</p>}
      <input
        name="motif"
        required
        minLength={10}
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Ce que la révision doit savoir de cette ligne"
        aria-label="Motif de la justification"
        style={champ}
      />
      <div>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Justifier"}
        </button>
      </div>
      <Echec texte={etat.echec} />
      <Fait texte={etat.fait} />
    </form>
  );
}

export function ArreterLeRapprochement({ dossier, identifiant, pret }: { dossier: string; identifiant: string; pret: boolean }) {
  const [etat, envoyer, enCours] = useActionState(validerLeRapprochement, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "grid", gap: 4, justifyItems: "start" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <button type="submit" className="action-principale" disabled={enCours} title={pret ? undefined : "Des lignes restent à traiter, ou un écart demeure : le backend dira lequel."}>
        {enCours ? "…" : "Valider le rapprochement"}
      </button>
      <Echec texte={etat.echec} />
    </form>
  );
}

export function AbandonnerLeReleve({ dossier, identifiant }: { dossier: string; identifiant: string }) {
  const [etat, envoyer, enCours] = useActionState(abandonnerLeReleve, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Abandonner ce relevé
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="identifiant" value={identifiant} />
      <input
        name="motif"
        required
        minLength={10}
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Pourquoi (mauvais compte, mauvais mois…)"
        aria-label="Motif de l'abandon"
        style={{ ...champ, minWidth: 240, flex: 1 }}
      />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Abandonner"}
      </button>
      <Echec texte={etat.echec} />
    </form>
  );
}
