"use client";

import { useActionState, useState } from "react";

import {
  abandonnerLeDossier,
  convertirLeDossier,
  franchirUneEtape,
  ouvrirUnDossierDeCreation,
  porterLesIdentifiants,
  recevoirUnePiece,
} from "@/app/lib/actions-creations";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * Les gestes du tunnel de création (pas 82).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'ÉCRAN PROPOSE, ET POURQUOI IL NE PROPOSE QUE ÇA
 *
 * Les étapes affichées sont celles que le backend dit **ouvertes** depuis l'étape
 * courante (`etapes_ouvertes`) : un cran en avant, et l'abandon. Afficher toutes les
 * étapes et laisser le backend refuser apprendrait à cliquer au hasard.
 *
 * Deux gestes irréversibles portent une case : l'abandon (un dossier abandonné ne se
 * rouvre pas) et la conversion (elle fait entrer l'entreprise au portefeuille).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
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

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>;
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  return null;
}

export function OuvertureDossier({
  formes,
  checklists,
}: {
  formes: readonly string[];
  /** Les pièces à réunir par forme, lues au backend : le fondateur sait quoi préparer avant d'ouvrir. */
  checklists: Record<string, { code: string; libelle: string; obligatoire: boolean }[]>;
}) {
  const [etat, ouvrir, enCours] = useActionState(ouvrirUnDossierDeCreation, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [forme, setForme] = useState(formes[0] ?? "SARL");
  if (!ouvert) {
    return (
      <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Ouvrir un dossier de création
        </button>
        <Retour etat={etat} />
      </div>
    );
  }
  const pieces = checklists[forme] ?? [];
  return (
    <form action={ouvrir} style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
      <label style={etiquette}>Prénom du fondateur<input name="prenom" required style={champ} /></label>
      <label style={etiquette}>Nom<input name="nom" required style={champ} /></label>
      <label style={etiquette}>Courriel<input name="courriel" type="email" required style={champ} /></label>
      <label style={etiquette}>Téléphone<input name="telephone" required style={champ} placeholder="+237…" /></label>
      <label style={etiquette}>Pièce d&rsquo;identité<input name="piece_identite" style={champ} placeholder="CNI 1234567890" /></label>
      <label style={etiquette}>Dénomination souhaitée<input name="denomination" required style={champ} /></label>
      <label style={etiquette}>
        Forme juridique
        <select name="forme" value={forme} onChange={(e) => setForme(e.target.value)} style={champ}>
          {formes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>Activité<input name="activite" required style={champ} /></label>
      <label style={etiquette}>Siège<input name="siege" required style={champ} placeholder="Douala, Akwa" /></label>
      <label style={etiquette}>Capital (FCFA)<input name="capital" inputMode="numeric" style={champ} /></label>
      <div style={{ gridColumn: "1 / -1" }}>
        <p style={{ ...etiquette, margin: "4px 0" }}>Pièces à réunir pour une {forme}</p>
        <ul style={{ margin: 0, paddingLeft: 18, font: "400 12.5px/1.6 var(--police-texte)" }}>
          {pieces.map((p) => (
            <li key={p.code}>
              {p.libelle}
              {!p.obligatoire && <span style={{ color: "var(--ink-500)" }}> (d&rsquo;usage)</span>}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Ouvrir le dossier"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Fermer
        </button>
        <Retour etat={etat} />
      </div>
    </form>
  );
}

export function FranchirEtape({ reference, vers, libelle }: { reference: string; vers: string; libelle: string }) {
  const [etat, franchir, enCours] = useActionState(franchirUneEtape, ETAT_ACTE_INITIAL);
  return (
    <form action={franchir} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="vers" value={vers} />
      <input name="commentaire" placeholder="Commentaire (facultatif)" style={{ ...champ, display: "inline-block", width: 220, marginTop: 0 }} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : `Passer à « ${libelle} »`}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function RecevoirPiece({ reference, code }: { reference: string; code: string }) {
  const [etat, recevoir, enCours] = useActionState(recevoirUnePiece, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={recevoir} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="code" value={code} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Marquer reçue"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function Identifiants({ reference }: { reference: string }) {
  const [etat, porter, enCours] = useActionState(porterLesIdentifiants, ETAT_ACTE_INITIAL);
  const ligne = (nom: string, libelle: string, cleDate: string) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 8 }}>
      <label style={etiquette}>{libelle}<input name={nom} style={champ} /></label>
      <label style={etiquette}>Obtenu le<input type="date" name={cleDate} style={champ} /></label>
    </div>
  );
  return (
    <form action={porter} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="reference" value={reference} />
      {ligne("rccm", "RCCM", "rccm_obtenu_le")}
      {ligne("niu", "NIU", "niu_obtenu_le")}
      {ligne("patente", "Patente", "patente_obtenue_le")}
      {ligne("cnps", "N° CNPS", "cnps_obtenue_le")}
      <p style={note}>Chaque identifiant va avec sa date : elle mesure le délai tenu par le guichet.</p>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Enregistrer les identifiants"}
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}

export function Abandon({ reference }: { reference: string }) {
  const [etat, abandonner, enCours] = useActionState(abandonnerLeDossier, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <Retour etat={etat} />;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        Abandonner le dossier
      </button>
    );
  }
  return (
    <form action={abandonner} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 460 }}>
      <input type="hidden" name="reference" value={reference} />
      <textarea name="motif" required minLength={10} rows={2} placeholder="Le fondateur renonce : financement non obtenu…" style={{ ...champ, resize: "vertical" }} />
      <label style={{ ...note, display: "flex", gap: 6 }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>Un dossier abandonné ne se rouvre pas. S&rsquo;il revient, on en ouvre un nouveau.</span>
      </label>
      <span style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>{enCours ? "…" : "Abandonner"}</button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>Annuler</button>
      </span>
      <Retour etat={etat} />
    </form>
  );
}

export function Conversion({ reference }: { reference: string }) {
  const [etat, convertir, enCours] = useActionState(convertirLeDossier, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={convertir} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 460 }}>
      <input type="hidden" name="reference" value={reference} />
      <label style={etiquette}>
        Régime d&rsquo;entrée
        <select name="regime" required defaultValue="" style={champ}>
          <option value="" disabled>Choisir</option>
          <option value="IGS">Impôt libératoire (IGS)</option>
          <option value="REEL">Réel</option>
        </select>
      </label>
      <p style={note}>
        Choisi, jamais déduit : une entreprise qui vient de naître n&rsquo;a aucun chiffre d&rsquo;affaires. Le fondateur
        peut opter pour le réel dès l&rsquo;origine s&rsquo;il facturera de la TVA.
      </p>
      <label style={etiquette}>
        Centre des impôts
        <select name="centre" required defaultValue="" style={champ}>
          <option value="" disabled>Choisir</option>
          <option value="CDI">Centre divisionnaire des impôts (CDI)</option>
          <option value="CIME">Centre des impôts des moyennes entreprises (CIME)</option>
          <option value="DGE">Direction des grandes entreprises (DGE)</option>
        </select>
      </label>
      <label style={{ ...note, display: "flex", gap: 6 }}>
        <input type="checkbox" name="adherent" value="oui" defaultChecked />
        <span>Adhérente du centre de gestion agréé dès sa création</span>
      </label>
      <label style={{ ...note, display: "flex", gap: 6 }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>L&rsquo;entreprise entre au portefeuille, et le dossier de création se ferme.</span>
      </label>
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>{enCours ? "…" : "Convertir en entreprise"}</button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}
