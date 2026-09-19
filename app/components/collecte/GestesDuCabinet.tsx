"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { classerUnePiece, lireUnePiece, recevoirUnePieceAuCabinet, recupererLeDocument, type EtatDocument } from "@/app/lib/actions-collecte";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

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

/**
 * Enregistrer une pièce reçue au cabinet : guichet, courriel, WhatsApp (pas 88).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ REMPLACE UN BOUTON QUI NE FAISAIT RIEN
 *
 * « Importer des pièces » figurait sur la boîte de réception sans action. Il ouvre
 * désormais ce formulaire, replié par défaut pour ne pas pousser la liste hors de l'écran.
 *
 * ⚠️ LE CANAL EST DEMANDÉ, JAMAIS SUPPOSÉ
 *
 * Les délais de collecte se mesurent par canal : une pièce reçue par WhatsApp enregistrée
 * comme « déposée au cabinet » fausserait la mesure qui dit à l'adhérent quel canal lui
 * coûte le plus de retard.
 *
 * Le document est obligatoire, et contrôlé par le backend comme celui d'un adhérent : type
 * réel lu dans les octets, 20 Mo au plus, empreinte recalculée.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ImportAuCabinet({
  dossiers,
  aujourdhui,
}: {
  dossiers: { niu: string; denomination: string }[];
  aujourdhui: string;
}) {
  const formulaire = useRef<HTMLFormElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, recevoir, enCours] = useActionState(async (precedent: typeof ETAT_ACTE_INITIAL, donnees: FormData) => {
    const resultat = await recevoirUnePieceAuCabinet(precedent, donnees);
    if (resultat.fait) formulaire.current?.reset();
    return resultat;
  }, ETAT_ACTE_INITIAL);

  if (!ouvert) {
    return (
      <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
        {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
        <button type="button" className="action-principale" onClick={() => setOuvert(true)}>
          Importer des pièces
        </button>
      </span>
    );
  }
  return (
    <form
      ref={formulaire}
      action={recevoir}
      style={{
        flexBasis: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 10,
        padding: "12px 14px",
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: "var(--surface)",
      }}
    >
      <label style={{ ...etiquette, gridColumn: "span 2" }}>
        Dossier
        <select name="dossier" required defaultValue="" style={champ}>
          <option value="" disabled>
            Choisir
          </option>
          {dossiers.map((d) => (
            <option key={d.niu} value={d.niu}>
              {d.denomination} · {d.niu}
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>
        Reçue
        <select name="canal" required defaultValue="DEPOT_CABINET" style={champ}>
          <option value="DEPOT_CABINET">au guichet du cabinet</option>
          <option value="COURRIEL">par courriel</option>
          <option value="WHATSAPP">par WhatsApp</option>
        </select>
      </label>
      <label style={etiquette}>
        Déposée le
        <input type="date" name="depose_le" required defaultValue={aujourdhui} max={aujourdhui} style={champ} />
      </label>
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Document (PDF, JPEG, PNG, TIFF ; 20 Mo au plus)
        <input type="file" name="fichier" required accept="image/jpeg,image/png,image/tiff,application/pdf" style={champ} />
      </label>
      <label style={etiquette}>
        Nature
        <select name="type" defaultValue="INDETERMINE" style={champ}>
          <option value="INDETERMINE">À identifier</option>
          <option value="FACTURE_ACHAT">Facture d&rsquo;achat</option>
          <option value="FACTURE_VENTE">Facture de vente</option>
          <option value="RECU">Reçu</option>
          <option value="RELEVE_BANCAIRE">Relevé bancaire</option>
          <option value="RELEVE_MOBILE_MONEY">Relevé Mobile Money</option>
          <option value="BULLETIN_PAIE">Bulletin de paie</option>
          <option value="QUITTANCE_IMPOT">Quittance d&rsquo;impôt</option>
          <option value="CONTRAT">Contrat</option>
          <option value="AUTRE">Autre</option>
        </select>
      </label>
      <label style={etiquette}>
        Émetteur
        <input name="emetteur" autoComplete="off" style={champ} />
      </label>
      <label style={etiquette}>
        Numéro du document
        <input name="reference_document" autoComplete="off" style={champ} />
      </label>
      <label style={etiquette}>
        Date du document
        <input type="date" name="date_document" style={champ} />
      </label>
      <label style={etiquette}>
        Montant TTC
        <input name="montant_ttc" inputMode="decimal" style={champ} />
      </label>
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Commentaire
        <input name="commentaire" maxLength={500} style={champ} />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Enregistrer la pièce"}
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

const DOCUMENT_INITIAL: EtatDocument = { echec: null, fichier: null };

/**
 * Télécharger le document scanné d'une pièce (pas 88).
 *
 * ⚠️ Téléchargé, jamais affiché dans la page : le backend le rend en pièce jointe avec
 * `nosniff`, pour qu'un fichier venu de l'extérieur ne s'exécute pas dans le domaine du
 * cabinet. Une pièce saisie sans document le dit, en clair.
 */
export function DocumentDeLaPiece({ identifiant, nom }: { identifiant: string; nom: string | null }) {
  const [etat, recuperer, enCours] = useActionState(recupererLeDocument, DOCUMENT_INITIAL);
  useEffect(() => {
    if (etat.fichier) declencherTelechargement(etat.fichier);
  }, [etat.fichier]);
  return (
    <form action={recuperer} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : `Télécharger ${nom ?? "le document"}`}
      </button>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}

/**
 * Classer sans écriture une pièce lue (pas 107). Le motif reste dans le champ si le backend
 * refuse : il est contrôlé (leçon du pas 100).
 */
export function ClasserLaPiece({ identifiant }: { identifiant: string }) {
  const [etat, classer, enCours] = useActionState(classerUnePiece, ETAT_ACTE_INITIAL);
  const [motif, setMotif] = useState("");
  if (etat.fait) return <p role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</p>;
  return (
    <form action={classer} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <label style={{ ...etiquette, display: "grid", gap: 4, flex: "1 1 260px" }}>
        Motif du classement
        <input name="motif" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={500} placeholder="Doublon de PJ-2026-0001, relevé rapproché…" style={champ} />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Classer sans écriture"}
      </button>
      {etat.echec && <span role="alert" style={{ ...note, flexBasis: "100%", color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}

/**
 * Identifier une pièce reçue et la passer à LUE (pas 91).
 *
 * ⚠️ Le document se télécharge à côté : on identifie en le lisant, pas de mémoire. Les
 * valeurs déjà déclarées par l'adhérent sont préremplies ; un champ vidé n'efface rien.
 */
export function LectureDePiece({
  identifiant,
  nomFichier,
  connu,
}: {
  identifiant: string;
  nomFichier: string | null;
  connu: { type: string; reference_document: string | null; date_document: string | null; montant_ttc: number | null; emetteur: string | null };
}) {
  const [etat, lire, enCours] = useActionState(lireUnePiece, ETAT_ACTE_INITIAL);
  if (etat.fait) return <p role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <DocumentDeLaPiece identifiant={identifiant} nom={nomFichier} />
      <form action={lire} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignItems: "end" }}>
        <input type="hidden" name="identifiant" value={identifiant} />
        <label style={etiquette}>
          Nature
          <select name="type" defaultValue={connu.type === "INDETERMINE" ? "" : connu.type} style={champ}>
            <option value="">À choisir</option>
            <option value="FACTURE_ACHAT">Facture d&rsquo;achat</option>
            <option value="FACTURE_VENTE">Facture de vente</option>
            <option value="RECU">Reçu</option>
            <option value="RELEVE_BANCAIRE">Relevé bancaire</option>
            <option value="RELEVE_MOBILE_MONEY">Relevé Mobile Money</option>
            <option value="BULLETIN_PAIE">Bulletin de paie</option>
            <option value="QUITTANCE_IMPOT">Quittance d&rsquo;impôt</option>
            <option value="CONTRAT">Contrat</option>
            <option value="AUTRE">Autre</option>
          </select>
        </label>
        <label style={etiquette}>
          Numéro
          <input name="reference_document" defaultValue={connu.reference_document ?? ""} style={champ} />
        </label>
        <label style={etiquette}>
          Date du document
          <input type="date" name="date_document" defaultValue={connu.date_document ?? ""} style={champ} />
        </label>
        <label style={etiquette}>
          Montant TTC
          <input name="montant_ttc" inputMode="decimal" defaultValue={connu.montant_ttc ?? ""} style={champ} />
        </label>
        <label style={etiquette}>
          Émetteur
          <input name="emetteur" defaultValue={connu.emetteur ?? ""} style={champ} />
        </label>
        <div>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Identifier et marquer lue"}
          </button>
        </div>
        {etat.echec && <span role="alert" style={{ ...note, gridColumn: "1 / -1", color: "var(--danger)" }}>{etat.echec}</span>}
      </form>
    </div>
  );
}
