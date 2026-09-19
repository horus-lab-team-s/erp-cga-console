"use client";

import { useActionState, useMemo, useState } from "react";

import { Montant } from "@/app/components/Montant";
import { ecarterEnMasse, type EtatEcartEnMasse } from "@/app/lib/actions-conformite-revue";
import { soumettreSansReinitialiser } from "@/app/lib/soumission";

/**
 * Écarter des constats en masse (pas 103). Maquette « Parcours réviseur », vue B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'ÉCRAN ANNONCE AVANT QUE LE RÉVISEUR SIGNE
 *
 * L'enjeu fiscal levé, les dossiers touchés, les pièces qui redeviendraient comptabilisables,
 * et, si la politique l'exige, que rien ne sera levé avant le second regard. Écarter n'est pas
 * « fermer une alerte » : la décision engage la signature du centre.
 *
 * ⚠️ L'annonce est calculée ici, sur la sélection ; les conséquences **réelles** sont celles
 * que le backend rend après la décision, et l'écran les affiche à la place de l'annonce.
 *
 * ⚠️ Le motif détaillé n'est **jamais prérempli**, même quand un motif type est choisi : le
 * type accélère, le détail engage.
 *
 * Composant client : aucun import de module qui tire `api.ts` en valeur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Ligne = {
  piece: string;
  dossier: string;
  date: string;
  fournisseur: string | null;
  fournisseur_niu: string | null;
  verification_dgi: boolean | null;
  enjeu: string | null;
  selectionnable: boolean;
  raison: string | null;
};

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

function dateCourte(iso: string) {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

const INITIAL: EtatEcartEnMasse = { echec: null, consequences: null };

export function EcarterEnMasse({
  code,
  severite,
  secondRegard,
  motifMinimum,
  motifsTypes,
  lignes,
  noms,
}: {
  code: string;
  severite: string;
  secondRegard: boolean;
  motifMinimum: number;
  motifsTypes: { code: string; libelle: string }[];
  lignes: Ligne[];
  noms: Record<string, string>;
}) {
  const [etat, envoyer, enCours] = useActionState(ecarterEnMasse, INITIAL);
  const [choisies, setChoisies] = useState<Set<string>>(new Set());
  const [motifType, setMotifType] = useState("");
  const [motif, setMotif] = useState("");
  const possibles = lignes.filter((l) => l.selectionnable);
  const selection = useMemo(() => lignes.filter((l) => choisies.has(l.piece)), [lignes, choisies]);
  const enjeu = selection.reduce((t, l) => t + Number(l.enjeu ?? 0), 0);
  const dossiers = new Set(selection.map((l) => l.dossier));

  const basculer = (piece: string) =>
    setChoisies((c) => {
      const suivant = new Set(c);
      if (suivant.has(piece)) suivant.delete(piece);
      else suivant.add(piece);
      return suivant;
    });

  if (etat.consequences) {
    const c = etat.consequences;
    return (
      <div role="status" style={{ padding: "12px 16px", display: "grid", gap: 4, font: "400 13px/1.5 var(--police-texte)" }}>
        <strong style={{ color: "var(--success)" }}>
          {c.ecarts} constat{c.ecarts > 1 ? "s" : ""} écarté{c.ecarts > 1 ? "s" : ""} et journalisé{c.ecarts > 1 ? "s" : ""}.
        </strong>
        <span>
          {c.effectifs} effectif{c.effectifs > 1 ? "s" : ""}
          {c.en_attente > 0 && `, ${c.en_attente} en attente du second regard`} · enjeu fiscal levé :{" "}
          <Montant valeur={c.enjeu_leve} avecDevise /> · {c.dossiers.length} dossier{c.dossiers.length > 1 ? "s" : ""}
          {c.pieces_comptabilisables.length > 0 && ` · pièces redevenues comptabilisables : ${c.pieces_comptabilisables.join(", ")}`}
        </span>
        <span style={note}>Les comptables des dossiers concernés sont prévenus. Chaque écart se lève depuis sa pièce.</span>
      </div>
    );
  }

  return (
    // ⚠️ `minmax(0, 1fr)` et `minWidth: 0` (pas 103) : sans eux, la grille prend la largeur de son
    // contenu le plus long, et sur téléphone les montants et l'annonce débordaient du panneau.
    // ⚠️ Pas 108 : soumis sans réinitialisation. Avec `action`, un motif refusé décochait les pièces
    // à l'écran sans les retirer de l'envoi. Voir `lib/soumission.ts`.
    <form onSubmit={soumettreSansReinitialiser(envoyer)} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 0, minWidth: 0 }}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="motif_minimum" value={motifMinimum} />
      {selection.map((l) => (
        <input key={l.piece} type="hidden" name="pieces" value={l.piece} />
      ))}

      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 16px", borderBottom: "1px solid var(--line-100)", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", font: "600 12.5px/1.4 var(--police-texte)" }}>
          <input
            type="checkbox"
            disabled={possibles.length === 0}
            checked={possibles.length > 0 && selection.length === possibles.length}
            onChange={(e) => setChoisies(e.target.checked ? new Set(possibles.map((l) => l.piece)) : new Set())}
          />
          Tout choisir ({possibles.length} écartable{possibles.length > 1 ? "s" : ""})
        </label>
        <span style={note}>{selection.length} sélectionné{selection.length > 1 ? "s" : ""}</span>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {lignes.map((l) => (
          <li key={l.piece} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "9px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)", opacity: l.selectionnable ? 1 : 0.75, background: choisies.has(l.piece) ? "var(--brand-magenta-100)" : undefined }}>
            <input type="checkbox" aria-label={`Choisir ${l.piece}`} disabled={!l.selectionnable} checked={choisies.has(l.piece)} onChange={() => basculer(l.piece)} />
            <strong style={{ flex: "1 1 160px", minWidth: 0 }}>{noms[l.dossier] ?? l.dossier}</strong>
            <span style={{ flex: "1 1 160px", minWidth: 0, overflowWrap: "anywhere" }}>
              {l.fournisseur ?? "fournisseur inconnu"}
              <span style={{ color: "var(--ink-500)" }}> · {l.piece}</span>
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{l.enjeu ? <Montant valeur={l.enjeu} /> : "—"}</span>
            <span style={{ flexBasis: "100%", minWidth: 0, paddingLeft: 24, fontSize: 12, color: "var(--ink-500)", overflowWrap: "anywhere" }}>
              {dateCourte(l.date)} · vérification DGI :{" "}
              <span style={{ color: l.verification_dgi === false ? "var(--danger)" : l.verification_dgi ? "var(--success)" : "var(--ink-500)" }}>
                {l.verification_dgi === false ? "radié" : l.verification_dgi ? "actif" : "indisponible"}
              </span>
              {l.raison && <span style={{ color: "var(--warning)" }}> · {l.raison}</span>}
            </span>
          </li>
        ))}
      </ul>

      {selection.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10, padding: "14px 16px", borderTop: "1px solid var(--line-200)", background: "var(--surface)" }}>
          <strong style={{ font: "600 14px/1.4 var(--police-texte)" }}>
            Écarter {selection.length} constat{selection.length > 1 ? "s" : ""} {severite === "BLOQUANT" ? "bloquant" : severite.toLowerCase()}
            {selection.length > 1 ? "s" : ""}
          </strong>
          <p style={{ margin: 0, font: "400 13px/1.5 var(--police-texte)" }}>
            {secondRegard ? (
              <>Enjeu fiscal en jeu : <Montant valeur={enjeu} avecDevise />, levé seulement après le second regard d&rsquo;une autre personne.</>
            ) : (
              <>Enjeu fiscal levé : <Montant valeur={enjeu} avecDevise /></>
            )}{" "}
            · {dossiers.size} dossier{dossiers.size > 1 ? "s" : ""} concerné{dossiers.size > 1 ? "s" : ""}
            {severite === "BLOQUANT" && ` · jusqu'à ${selection.length} pièce${selection.length > 1 ? "s" : ""} redevenue${selection.length > 1 ? "s" : ""} comptabilisable${selection.length > 1 ? "s" : ""}`}
          </p>
          <p style={{ margin: 0, padding: "8px 10px", borderLeft: "3px solid var(--warning)", background: "var(--warning-100)", font: "400 12.5px/1.5 var(--police-texte)" }}>
            Vous engagez la signature du centre agréé. En cas de contrôle, ce motif sera opposé à l&rsquo;administration : il doit être
            vérifiable. Les propositions d&rsquo;écriture des pièces sont recalculées, et les comptables concernés prévenus.
          </p>
          {motifsTypes.length > 0 && (
            <label style={{ display: "grid", gap: 4, minWidth: 0, font: "600 12px/1.4 var(--police-texte)" }}>
              Motif type (facultatif)
              <select name="motif_type" value={motifType} onChange={(e) => setMotifType(e.target.value)} style={champ}>
                <option value="">Aucun</option>
                {motifsTypes.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.libelle}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label style={{ display: "grid", gap: 4, minWidth: 0, font: "600 12px/1.4 var(--police-texte)" }}>
            Motif détaillé, obligatoire
            <textarea
              name="motif"
              required
              minLength={motifMinimum}
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={`Ce qui a été vérifié, où, et quand (${motifMinimum} caractères au moins)`}
              style={{ ...champ, resize: "vertical" }}
            />
          </label>
          <div>
            <button type="submit" className="action-principale" disabled={enCours}>
              {enCours ? "…" : selection.length > 1 ? `Écarter les ${selection.length} constats et journaliser` : "Écarter le constat et journaliser"}
            </button>
          </div>
          {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</p>}
        </div>
      )}
    </form>
  );
}
