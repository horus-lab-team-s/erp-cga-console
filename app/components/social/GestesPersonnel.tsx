"use client";

import { useActionState, useRef, useState } from "react";

import { cloreUnContrat, embaucherUnSalarie, ouvrirUnContrat } from "@/app/lib/actions-social";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const champ: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 3,
  padding: "5px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};
const etiquette: React.CSSProperties = { font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" };
const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const grille: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
  padding: "12px 16px",
};

/** Les champs d'un contrat, partagés par l'embauche et l'ouverture d'un nouveau contrat. */
function ChampsDuContrat({ aujourdhui }: { aujourdhui: string }) {
  return (
    <>
      <label style={etiquette}>
        Contrat
        <select name="type_contrat" required defaultValue="CDI" style={champ}>
          <option value="CDI">CDI</option>
          <option value="CDD">CDD</option>
          <option value="APPRENTISSAGE">Apprentissage</option>
          <option value="OCCASIONNEL">Occasionnel</option>
        </select>
      </label>
      <label style={etiquette}>
        Début
        <input type="date" name="debut" required defaultValue={aujourdhui} style={champ} />
      </label>
      <label style={etiquette}>
        Fin exclue (CDD)
        <input type="date" name="fin" style={champ} />
      </label>
      <label style={etiquette}>
        Salaire de base (FCFA)
        <input name="salaire_base" required inputMode="numeric" style={champ} />
      </label>
      <label style={etiquette}>
        Primes mensuelles
        <input name="primes" inputMode="numeric" defaultValue="0" style={champ} />
      </label>
      <label style={etiquette}>
        Poste
        <input name="poste" style={champ} />
      </label>
    </>
  );
}

/**
 * Embaucher : inscrire le salarié et ouvrir son premier contrat (pas 89).
 *
 * ⚠️ Le matricule est choisi par le cabinet, et il ne se réattribue pas : le backend
 * refuse un matricule déjà porté, dans ce dossier ou dans un autre. Avant le pas 89, il
 * écrasait le salarié qui le portait, fût-il employé par un autre adhérent.
 */
export function EmbaucheSalarie({ dossier, aujourdhui }: { dossier: string; aujourdhui: string }) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, embaucher, enCours] = useActionState(async (p: typeof ETAT_ACTE_INITIAL, d: FormData) => {
    const r = await embaucherUnSalarie(p, d);
    if (r.fait) formulaire.current?.reset();
    return r;
  }, ETAT_ACTE_INITIAL);
  if (!ouvert) {
    return (
      <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Embaucher un salarié
        </button>
        {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
      </div>
    );
  }
  return (
    <form ref={formulaire} action={embaucher} style={grille}>
      <input type="hidden" name="dossier" value={dossier} />
      <label style={etiquette}>
        Matricule
        <input name="matricule" required style={champ} />
      </label>
      <label style={etiquette}>
        Prénom
        <input name="prenom" required style={champ} />
      </label>
      <label style={etiquette}>
        Nom
        <input name="nom" required style={champ} />
      </label>
      <label style={etiquette}>
        N° CNPS (s&rsquo;il existe)
        <input name="matricule_cnps" style={champ} />
      </label>
      <label style={etiquette}>
        Date de naissance
        <input type="date" name="date_naissance" style={champ} />
      </label>
      <label style={etiquette}>
        Enfants à charge
        <input name="enfants_a_charge" inputMode="numeric" defaultValue="0" style={champ} />
      </label>
      <ChampsDuContrat aujourdhui={aujourdhui} />
      <p style={{ ...note, gridColumn: "1 / -1" }}>
        Le numéro CNPS se déclare plus tard : c&rsquo;est la déclaration qui le fait attribuer. Le salarié entre dans la
        déclaration de chaque mois où son contrat court au moins un jour.
      </p>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Embaucher"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Fermer
        </button>
        {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
        {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
      </div>
    </form>
  );
}

/**
 * Changer le contrat d'un salarié : le clore, puis en ouvrir un nouveau (pas 89).
 *
 * ⚠️ Deux gestes, jamais une modification. Écraser le salaire du contrat en vigueur
 * recalculerait les paies passées au nouveau salaire. Le backend refuse deux contrats qui
 * se chevauchent : on clôt d'abord, à la date du changement (exclue).
 */
export function ContratDuSalarie({
  dossier,
  matricule,
  enPoste,
  aujourdhui,
}: {
  dossier: string;
  matricule: string;
  enPoste: boolean;
  aujourdhui: string;
}) {
  const [geste, setGeste] = useState<null | "clore" | "ouvrir">(null);
  const [cloture, clore, enCloture] = useActionState(cloreUnContrat, ETAT_ACTE_INITIAL);
  const [ouverture, ouvrir, enOuverture] = useActionState(ouvrirUnContrat, ETAT_ACTE_INITIAL);
  const fait = cloture.fait ?? ouverture.fait;
  if (geste === null) {
    return (
      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {enPoste && (
          <button type="button" className="bouton-discret" onClick={() => setGeste("clore")}>
            Clore
          </button>
        )}
        <button type="button" className="bouton-discret" onClick={() => setGeste("ouvrir")}>
          Nouveau contrat
        </button>
        {fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{fait}</span>}
      </span>
    );
  }
  if (geste === "clore") {
    return (
      <form action={async (d) => { await clore(d); setGeste(null); }} style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap" }}>
        <input type="hidden" name="dossier" value={dossier} />
        <input type="hidden" name="matricule" value={matricule} />
        <label style={etiquette}>
          Ne court plus à compter du
          <input type="date" name="le" required defaultValue={aujourdhui} style={champ} />
        </label>
        <button type="submit" className="bouton-discret" disabled={enCloture}>
          {enCloture ? "…" : "Clore le contrat"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setGeste(null)}>
          Annuler
        </button>
        {cloture.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{cloture.echec}</span>}
      </form>
    );
  }
  return (
    <form action={async (d) => { await ouvrir(d); }} style={{ ...grille, padding: "8px 0" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="matricule" value={matricule} />
      <ChampsDuContrat aujourdhui={aujourdhui} />
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enOuverture}>
          {enOuverture ? "…" : "Ouvrir le contrat"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setGeste(null)}>
          Fermer
        </button>
        {ouverture.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{ouverture.echec}</span>}
        {ouverture.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{ouverture.fait}</span>}
      </div>
    </form>
  );
}
