"use client";

import { useActionState } from "react";

import {
  chiffrerLeDossier,
  confirmerLEncaissement,
  demanderLeReglement,
  emettreLaProforma,
  enregistrerLaQualification,
  transmettreLaProforma,
  type EtatChiffrage,
  type EtatEmission,
} from "@/app/lib/actions-acquisition";
import type { Question } from "@/app/lib/console-acquisition";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

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

/** La valeur déjà enregistrée, remise sous la forme qu'attend le champ. */
function valeurInitiale(question: Question, brute: string | undefined): string {
  if (brute === undefined) return "";
  if (question.type === "BOOLEEN") return brute === "True" ? "oui" : brute === "False" ? "non" : "";
  if (question.type === "LISTE") {
    // Le backend rend la liste comme Python l'écrit : « ['a', 'b'] ».
    return brute.replace(/^\[|\]$/g, "").split(",").map((m) => m.trim().replace(/^'|'$/g, "")).filter(Boolean).join(", ");
  }
  return brute;
}

function Champ({ question, valeur }: { question: Question; valeur: string }) {
  const nom = `q_${question.code}`;
  if (question.type === "ENUM" && question.valeurs) {
    return (
      <select name={nom} defaultValue={valeur} style={champ}>
        <option value="">—</option>
        {question.valeurs.map((v) => (
          <option key={v} value={v}>
            {v.replaceAll("_", " ").toLowerCase()}
          </option>
        ))}
      </select>
    );
  }
  if (question.type === "BOOLEEN") {
    return (
      <select name={nom} defaultValue={valeur} style={champ}>
        <option value="">sans réponse</option>
        <option value="oui">oui</option>
        <option value="non">non</option>
      </select>
    );
  }
  return (
    <input
      name={nom}
      defaultValue={valeur}
      inputMode={question.type === "ENTIER" || question.type === "DECIMAL" ? "numeric" : undefined}
      placeholder={question.type === "LISTE" ? "séparées par des virgules" : question.unite ?? undefined}
      style={champ}
    />
  );
}

/**
 * La qualification, engendrée depuis le questionnaire du référentiel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ C'EST LE QUESTIONNAIRE QUI COMMANDE L'ÉCRAN
 *
 * Aucune question n'est écrite ici : le libellé, le type, les valeurs admises,
 * l'unité, l'aide et le caractère obligatoire viennent du référentiel. Ajouter une
 * question au questionnaire l'ajoute à l'écran, sans développeur.
 *
 * Les valeurs saisies partent en texte ; le backend les convertit au type de la
 * question et refuse, en nommant la question, ce qui ne s'y convertit pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Qualification({
  reference,
  questions,
  faits,
  manquantes,
  modifiable,
}: {
  reference: string;
  questions: Question[];
  faits: Record<string, string>;
  manquantes: string[];
  modifiable: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerLaQualification, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ padding: "12px 16px" }}>
      <input type="hidden" name="reference" value={reference} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {questions.map((q) => (
          <label key={q.code} style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
            {q.libelle}
            {q.obligatoire ? " *" : ""}
            {manquantes.includes(q.code) && (
              <span style={{ color: "var(--warning)", fontWeight: 400 }}> · manquante</span>
            )}
            <Champ question={q} valeur={valeurInitiale(q, faits[q.code])} />
            {q.aide && <span style={{ ...note, display: "block", marginTop: 2, fontWeight: 400 }}>{q.aide}</span>}
          </label>
        ))}
      </div>
      <label style={{ display: "block", marginTop: 12, font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
        Note d&rsquo;échange (n&rsquo;entre pas dans le prix)
        <textarea name="note" rows={2} style={{ ...champ, resize: "vertical" }} />
      </label>
      {modifiable && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Enregistrer les réponses"}
          </button>
          {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
          {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
        </div>
      )}
    </form>
  );
}

const CHIFFRAGE_INITIAL: EtatChiffrage = { echec: null, proposition: null };

function francs(valeur: string): string {
  return `${Number(valeur).toLocaleString("fr-FR")} FCFA`;
}

/**
 * Le chiffrage : un intervalle, jamais un prix, sur les réponses enregistrées.
 *
 * ⚠️ Les ajustements écartés faute de réponse sont montrés comme des questions à
 * poser (pas 66) : une remise ou une majoration ne se fonde pas sur ce qu'on ignore.
 */
export function Chiffrage({ reference }: { reference: string }) {
  const [etat, chiffrer, enCours] = useActionState(chiffrerLeDossier, CHIFFRAGE_INITIAL);
  const p = etat.proposition;
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <form action={chiffrer} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <input type="hidden" name="reference" value={reference} />
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Score de charge (déclaré)
          <input name="score_charge" inputMode="numeric" defaultValue="0" style={{ ...champ, width: 120 }} />
        </label>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Calculer l’intervalle"}
        </button>
      </form>
      <p style={note}>
        Le score de charge n&rsquo;est pas encore mesuré pour un prospect : il est déclaré, et
        conservé avec les faits de la proforma (question ouverte Q21).
      </p>
      {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</p>}
      {p && (
        <div>
          <p style={{ margin: 0, font: "600 15px/1.5 var(--police-texte)" }}>
            {francs(p.plancher)} · <span style={{ color: "var(--brand-indigo-700)" }}>{francs(p.reference)}</span> ·{" "}
            {francs(p.plafond)}
          </p>
          <p style={note}>
            Plancher, référence et plafond · barème {p.version_bareme} · base {francs(p.base)}
          </p>
          {p.lignes.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {p.lignes.map((l) => (
                <li key={l.code} style={{ ...note, color: "var(--ink-700)" }} title={l.fondement}>
                  {l.libelle} : {Number(l.montant) > 0 ? "+" : ""}
                  {francs(l.montant)} ({l.code})
                </li>
              ))}
            </ul>
          )}
          {p.echecs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ ...note, color: "var(--warning)", fontWeight: 600 }}>À vérifier avant d&rsquo;arrêter un prix :</p>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {p.echecs.map((e) => (
                  <li key={e} style={note}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMISSION_INITIALE: EtatEmission = { echec: null, proforma: null, lien: null };

/**
 * Arrêter le montant et émettre la proforma (pas 67).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE LIEN NE S'AFFICHE QU'UNE FOIS
 *
 * Le backend ne rend le lien d'acceptation qu'à l'émission : le remettre à chaque
 * lecture multiplierait les chemins par lesquels un engagement peut fuiter. L'écran
 * le montre donc une fois, avec la consigne de l'envoyer maintenant, puis propose de
 * noter la transmission, qui arme la relance.
 *
 * ⚠️ LA SÉPARATION DES TÂCHES EST DITE, PAS LAISSÉE CROIRE
 *
 * Le compte qui chiffre engage aussi le cabinet (pas 63) : l'écran l'affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EmissionProforma({ reference, referenceProposee }: { reference: string; referenceProposee: string | null }) {
  const [etat, emettre, enCours] = useActionState(emettreLaProforma, EMISSION_INITIALE);
  const [transmis, transmettre, transmissionEnCours] = useActionState(transmettreLaProforma, ETAT_ACTE_INITIAL);
  const p = etat.proforma;

  if (p) {
    return (
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, font: "600 14px/1.5 var(--police-texte)" }}>
          {p.numero} · {francs(p.montant)}
        </p>
        {p.plancher && p.plafond && (
          <p style={note}>
            Intervalle recalculé : {francs(p.plancher)} à {francs(p.plafond)}, référence {francs(p.reference ?? "0")}.
          </p>
        )}
        {!p.separation_respectee && (
          <p style={{ ...note, color: "var(--warning)" }}>
            Chiffrée et engagée par le même compte : aucune validation par un second collaborateur.
          </p>
        )}
        {etat.lien && (
          <div style={{ padding: "8px 10px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }}>
            <p style={{ ...note, color: "var(--ink-900)", fontWeight: 600 }}>
              Lien à envoyer au client maintenant : il ne sera plus affiché.
            </p>
            <p style={{ margin: "4px 0 0", font: "400 12px/1.4 var(--police-mono)", wordBreak: "break-all" }}>{etat.lien}</p>
          </div>
        )}
        {transmis.fait ? (
          <span role="status" style={{ ...note, color: "var(--success)" }}>{transmis.fait}</span>
        ) : (
          <form action={transmettre}>
            <input type="hidden" name="numero" value={p.numero} />
            <button type="submit" className="bouton-discret" disabled={transmissionEnCours}>
              {transmissionEnCours ? "…" : "J’ai envoyé le lien au client"}
            </button>
            {transmis.echec && <span role="alert" style={{ ...note, color: "var(--danger)", marginLeft: 8 }}>{transmis.echec}</span>}
          </form>
        )}
      </div>
    );
  }

  return (
    <form action={emettre} style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="reference" value={reference} />
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
        Montant arrêté (FCFA)
        <input name="montant" inputMode="numeric" required defaultValue={referenceProposee ?? ""} style={{ ...champ, width: 160 }} />
      </label>
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)", flex: "1 1 240px" }}>
        Motif (obligatoire hors de l&rsquo;intervalle)
        <input name="motif" maxLength={500} style={champ} />
      </label>
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
        Score de charge
        <input name="score_charge" inputMode="numeric" defaultValue="0" style={{ ...champ, width: 100 }} />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Émettre la proforma"}
      </button>
      {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)", flexBasis: "100%" }}>{etat.echec}</p>}
    </form>
  );
}

/**
 * Faire régler une proforma acceptée (pas 68).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX CHEMINS, UN SEUL ESPACE
 *
 *   par téléphone        la demande part, le client valide son code, l'opérateur
 *                        notifie, et l'espace s'ouvre sans humain
 *   espèces, virement    un collaborateur constate le règlement et le confirme
 *
 * ⚠️ L'ADRESSE RETENUE NE SE CHANGE PAS
 *
 * La première demande la retient, et c'est elle qu'on annonce au client. Elle
 * s'affiche alors en lecture seule : la confirmation manuelle ne peut plus ouvrir
 * l'espace ailleurs (le backend le refuserait, pas 68).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Reglement({
  numero,
  montant,
  telephone,
  slugRetenu,
}: {
  numero: string;
  montant: string;
  telephone: string;
  slugRetenu: string | null;
}) {
  const [demande, demander, demandeEnCours] = useActionState(demanderLeReglement, ETAT_ACTE_INITIAL);
  const [encaisse, confirmer, confirmationEnCours] = useActionState(confirmerLEncaissement, ETAT_ACTE_INITIAL);
  const champSlug = slugRetenu ? (
    <>
      <input type="hidden" name="slug" value={slugRetenu} />
      <span style={{ display: "block", marginTop: 3, font: "500 13px/1.4 var(--police-mono)" }}>{slugRetenu}</span>
    </>
  ) : (
    <input name="slug" required minLength={3} maxLength={40} placeholder="station-bonaberi" style={{ ...champ, width: 220 }} />
  );
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, font: "600 14px/1.5 var(--police-texte)" }}>
        {numero} · {francs(montant)} à régler
      </p>

      <form action={demander} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <input type="hidden" name="numero" value={numero} />
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Adresse de l&rsquo;espace{slugRetenu ? " (retenue)" : ""}
          {champSlug}
        </label>
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Téléphone à débiter
          <input name="telephone" defaultValue={telephone} style={{ ...champ, width: 170 }} />
        </label>
        <button type="submit" className="bouton-discret" disabled={demandeEnCours}>
          {demandeEnCours ? "…" : "Demander le paiement par téléphone"}
        </button>
        {demande.echec && <p role="alert" style={{ ...note, color: "var(--danger)", flexBasis: "100%" }}>{demande.echec}</p>}
        {demande.fait && <p role="status" style={{ ...note, color: "var(--success)", flexBasis: "100%" }}>{demande.fait}</p>}
      </form>

      <form action={confirmer} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid var(--line-100)", paddingTop: 12 }}>
        <input type="hidden" name="numero" value={numero} />
        <p style={{ ...note, flexBasis: "100%" }}>Règlement reçu autrement (espèces au guichet, virement) :</p>
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Adresse de l&rsquo;espace{slugRetenu ? " (retenue)" : ""}
          {champSlug}
        </label>
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Référence du reçu ou du virement
          <input name="reference_externe" maxLength={120} style={{ ...champ, width: 220 }} />
        </label>
        <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start", flexBasis: "100%" }}>
          <input type="checkbox" name="rapproche" value="oui" required />
          <span>J&rsquo;ai constaté le règlement de {francs(montant)}. La confirmation ouvre l&rsquo;espace du client.</span>
        </label>
        <button type="submit" className="bouton-discret" disabled={confirmationEnCours}>
          {confirmationEnCours ? "…" : "Confirmer le règlement"}
        </button>
        {encaisse.echec && <p role="alert" style={{ ...note, color: "var(--danger)", flexBasis: "100%" }}>{encaisse.echec}</p>}
        {encaisse.fait && <p role="status" style={{ ...note, color: "var(--success)", flexBasis: "100%" }}>{encaisse.fait}</p>}
      </form>
    </div>
  );
}
