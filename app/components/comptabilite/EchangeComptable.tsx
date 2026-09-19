"use client";

import { useActionState, useEffect, useState } from "react";

import { exporterLesEcritures, reprendreUnFichier } from "@/app/lib/actions-echange";
import { ETAT_EXPORT_INITIAL, ETAT_REPRISE_INITIAL } from "@/app/lib/saisie-echange";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const etiquette: React.CSSProperties = { font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" };
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
const grille: React.CSSProperties = {
  padding: "12px 16px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  alignItems: "end",
};

type Profil = { code: string; libelle: string; encodage: string };

function ChoixCommuns({ exercice, profils }: { exercice: string; profils: Profil[] }) {
  return (
    <>
      <label style={etiquette}>
        Exercice
        <input name="exercice" required pattern="\d{4}" defaultValue={exercice} style={champ} />
      </label>
      <label style={etiquette}>
        Format
        <select name="profil" required defaultValue={profils[0]?.code} style={champ}>
          {profils.map((p) => (
            <option key={p.code} value={p.code}>
              {p.libelle} ({p.encodage})
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>
        Journal (facultatif)
        <input name="journal" placeholder="Tous" style={champ} />
      </label>
    </>
  );
}

/**
 * Exporter les écritures validées vers le logiciel du client (pas 85).
 *
 * ⚠️ Les octets arrivent en base64 et repartent tels quels dans un `Blob` typé avec le
 * jeu de caractères du profil : aucun décodage en texte, qui abîmerait les accents d'un
 * export cp1252.
 *
 * ⚠️ Le backend refuse le lot entier s'il contient un brouillon, en nommant les écritures :
 * l'écran affiche ce refus plutôt qu'un fichier incomplet.
 */
export function ExportDesEcritures({ entreprise, exercice, profils }: { entreprise: string; exercice: string; profils: Profil[] }) {
  const [etat, exporter, enCours] = useActionState(exporterLesEcritures, ETAT_EXPORT_INITIAL);

  useEffect(() => {
    if (etat.fichier) declencherTelechargement(etat.fichier);
  }, [etat.fichier]);

  return (
    <form action={exporter} style={grille}>
      <input type="hidden" name="entreprise" value={entreprise} />
      <ChoixCommuns exercice={exercice} profils={profils} />
      <div>
        <button type="submit" className="bouton-discret" disabled={enCours || profils.length === 0}>
          {enCours ? "…" : "Exporter"}
        </button>
      </div>
      {etat.fichier && (
        <p role="status" style={{ ...note, gridColumn: "1 / -1", color: "var(--success)" }}>
          {etat.fichier.nom} téléchargé.
        </p>
      )}
      {etat.echec && (
        <p role="alert" style={{ ...note, gridColumn: "1 / -1", color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
    </form>
  );
}

/**
 * Reprendre un fichier venu du logiciel précédent : contrôler, puis appliquer (pas 85).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ « APPLIQUER » N'APPARAÎT QU'APRÈS UN CONTRÔLE RECEVABLE, SUR LE MÊME FICHIER
 *
 * Changer de fichier, de format, d'exercice ou de journal efface le rapport : on
 * n'applique pas un fichier sur la foi du contrôle d'un autre. Le backend recontrôle
 * de toute façon.
 *
 * ⚠️ TOUTES LES ANOMALIES D'UN COUP, AVEC LEUR LIGNE DU FICHIER
 *
 * Un fichier de reprise se corrige une fois, dans le tableur : le numéro affiché est
 * celui de la ligne du fichier, en-tête compris.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function RepriseDUnFichier({ entreprise, exercice, profils }: { entreprise: string; exercice: string; profils: Profil[] }) {
  const [etat, envoyer, enCours] = useActionState(reprendreUnFichier, ETAT_REPRISE_INITIAL);
  // Le rapport affiché vaut pour la saisie à laquelle il répond ; toute modification l'invalide.
  const [version, setVersion] = useState(0);
  const [versionControlee, setVersionControlee] = useState(-1);
  const rapport = versionControlee === version ? etat.rapport : null;

  return (
    <form
      action={async (donnees) => {
        setVersionControlee(version);
        await envoyer(donnees);
      }}
      onChange={() => setVersion((v) => v + 1)}
      style={grille}
    >
      <input type="hidden" name="entreprise" value={entreprise} />
      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Fichier exporté par l&rsquo;autre logiciel
        <input name="fichier" type="file" accept=".csv,.txt,text/csv,text/plain" required style={champ} />
      </label>
      <ChoixCommuns exercice={exercice} profils={profils} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" name="appliquer" value="non" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Contrôler"}
        </button>
        {rapport && rapport.recevable && !rapport.applique && (
          <button type="submit" name="appliquer" value="oui" className="bouton-discret" disabled={enCours}>
            Appliquer : {rapport.ecritures_lues} écriture{rapport.ecritures_lues > 1 ? "s" : ""} en brouillon
          </button>
        )}
      </div>
      {etat.echec && versionControlee === version && (
        <p role="alert" style={{ ...note, gridColumn: "1 / -1", color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
      {rapport && (
        <div style={{ gridColumn: "1 / -1" }} role="status">
          {rapport.applique ? (
            <p style={{ ...note, color: "var(--success)" }}>
              Reprise appliquée : {rapport.cles_enregistrees.length} écriture(s) en brouillon, de{" "}
              {rapport.cles_enregistrees[0]} à {rapport.cles_enregistrees.at(-1)}. Elles se relisent et se valident dans la
              saisie.
            </p>
          ) : rapport.recevable ? (
            <p style={note}>
              Contrôle : {rapport.lignes_lues} lignes lues, {rapport.ecritures_lues} écriture(s) entreraient en brouillon.
              Rien n&rsquo;a été écrit. Un brouillon ne se supprime pas : vérifiez le dossier et l&rsquo;exercice avant
              d&rsquo;appliquer.
            </p>
          ) : (
            <>
              <p style={{ ...note, color: "var(--danger)" }}>
                {rapport.anomalies.length} anomalie(s) sur {rapport.lignes_lues} lignes lues : rien n&rsquo;entrera tant
                qu&rsquo;il en reste une.
              </p>
              <ul style={{ ...note, margin: "6px 0 0", paddingLeft: 18 }}>
                {rapport.anomalies.map((a, i) => (
                  <li key={`${a.ligne}-${i}`}>
                    Ligne {a.ligne} : {a.motif}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </form>
  );
}
