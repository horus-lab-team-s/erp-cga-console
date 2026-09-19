"use client";

import { useActionState, useState } from "react";

import { contrepasserEcriture, validerEcriture } from "@/app/lib/actions-comptabilite";
import type { Compte, Ecriture, Journal } from "@/app/lib/comptabilite";
import { FormulaireEcriture } from "./FormulaireEcriture";
import type { ExerciceDuDossier } from "@/app/lib/portefeuille";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les deux actes qui suivent la saisie : valider, contre-passer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ÉCRAN NE PROPOSE JAMAIS LES DEUX EN MÊME TEMPS
 *
 * Un brouillon se valide et ne se contre-passe pas ; une écriture validée se
 * contre-passe et ne se valide plus. Afficher les deux boutons et refuser l'un
 * des deux après le clic apprendrait à cliquer au hasard. Ce que l'écran montre
 * est exactement ce que le backend accepte.
 *
 * IL N'Y A PAS DE BOUTON « SUPPRIMER », ET IL N'Y EN AURA PAS
 *
 * Le port du registre ne déclare aucune méthode de suppression, délibérément. Un
 * brouillon faux se corrige avant validation ; une écriture validée s'annule par
 * son inverse. Une comptabilité d'où l'on peut retirer une ligne n'est pas une
 * comptabilité : c'est un tableur, et un vérificateur le voit au premier trou de
 * numérotation.
 *
 * ⚠️ UN EXERCICE CLOS NE REÇOIT PLUS AUCUN GESTE (pas 71)
 *
 * Une contre-passation après clôture modifiait la balance d'un exercice déjà
 * déclaré ; le backend la refuse désormais, et l'écran ne la propose plus. Il dit
 * à la place où la correction se fait. `exercice` à `null` (fiche illisible) laisse
 * les gestes : le backend reste juge, et masquer sur une lecture échouée ferait
 * croire à un exercice clos.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ActesEcriture({
  dossier,
  ecriture,
  exercice,
  aujourdhui,
  journaux,
  comptes,
}: {
  dossier: string;
  ecriture: Ecriture;
  exercice: ExerciceDuDossier | null;
  /** AAAA-MM-JJ. */
  aujourdhui: string;
  /** Pour la correction d'un brouillon, qui réemploie le formulaire de saisie. */
  journaux: Journal[];
  comptes: Compte[];
}) {
  const cle = `${ecriture.exercice}/${ecriture.journal}/${ecriture.numero}`;
  if (exercice?.clos) {
    return (
      <span style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
        {ecriture.etat === "BROUILLON"
          ? `Exercice ${exercice.libelle} clos : ce brouillon ne s’engage plus.`
          : `Exercice ${exercice.libelle} clos : corriger dans l’exercice ouvert.`}
      </span>
    );
  }
  if (ecriture.etat === "BROUILLON") {
    return (
      <Brouillon
        dossier={dossier}
        cle={cle}
        ecriture={ecriture}
        journaux={journaux}
        comptes={comptes}
        aujourdhui={aujourdhui}
      />
    );
  }
  // Le constat se date au plus tard à la clôture de l'exercice, et jamais avant
  // l'écriture d'origine. Aujourd'hui s'il tombe dans ces bornes.
  const plafond = exercice?.cloture;
  const jourPropose = plafond && aujourdhui > plafond ? plafond : aujourdhui;
  return (
    <Contrepassation
      dossier={dossier}
      cle={cle}
      jourPropose={jourPropose < ecriture.date_operation ? ecriture.date_operation : jourPropose}
      plancher={ecriture.date_operation}
      plafond={plafond}
    />
  );
}

/**
 * Un brouillon : le valider, ou le corriger (pas 72).
 *
 * ⚠️ Une contre-passation en brouillon ne se corrige pas : ses lignes sont l'inverse
 * exact de l'écriture annulée. Le bouton n'est pas proposé, et le backend refuse.
 */
function Brouillon({
  dossier,
  cle,
  ecriture,
  journaux,
  comptes,
  aujourdhui,
}: {
  dossier: string;
  cle: string;
  ecriture: Ecriture;
  journaux: Journal[];
  comptes: Compte[];
  aujourdhui: string;
}) {
  const [corriger, setCorriger] = useState(false);
  const corrigeable = ecriture.type !== "CONTREPASSATION";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!ecriture.piece_justificative && (
          <span style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
            sans pièce : à corriger avant de valider
          </span>
        )}
        {corrigeable && (
          <button type="button" className="bouton-discret" onClick={() => setCorriger((c) => !c)}>
            {corriger ? "Fermer" : "Corriger"}
          </button>
        )}
        <Validation dossier={dossier} cle={cle} />
      </div>
      {corriger && (
        <div style={{ alignSelf: "stretch", borderTop: "1px solid var(--line-100)", paddingTop: 8 }}>
          <FormulaireEcriture
            dossier={dossier}
            exercice={ecriture.exercice}
            journaux={journaux}
            comptes={comptes}
            aujourdHui={aujourdhui}
            ecriture={ecriture}
          />
        </div>
      )}
    </div>
  );
}

function Validation({ dossier, cle }: { dossier: string; cle: string }) {
  const [etat, envoyer, enCours] = useActionState(validerEcriture, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="cle" value={cle} />
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Valider"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

function Contrepassation({
  dossier,
  cle,
  jourPropose,
  plancher,
  plafond,
}: {
  dossier: string;
  cle: string;
  jourPropose: string;
  /** La date de l'écriture d'origine : on n'annule pas avant. */
  plancher: string;
  /** La clôture de l'exercice, quand la fiche l'a dite. */
  plafond: string | undefined;
}) {
  const [etat, envoyer, enCours] = useActionState(contrepasserEcriture, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);

  // Le motif se demande **avant** l'acte, jamais après : reconstitué plus tard,
  // il n'est plus un motif, c'est une justification.
  if (!ouvert) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Contre-passer
        </button>
        <Retour etat={etat} />
      </div>
    );
  }

  return (
    <form action={envoyer} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="cle" value={cle} />
      <input
        type="text"
        name="motif"
        placeholder="Motif : facture reçue en double…"
        required
        maxLength={200}
        style={{
          height: 28,
          minWidth: 220,
          padding: "0 8px",
          border: "1px solid var(--line-200)",
          borderRadius: "var(--rayon-petit)",
          font: "400 12px/1.4 var(--police-texte)",
        }}
      />
      <label style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
        constatée le{" "}
        <input
          type="date"
          name="date_operation"
          required
          defaultValue={jourPropose}
          min={plancher}
          max={plafond}
          style={{
            height: 28,
            padding: "0 6px",
            border: "1px solid var(--line-200)",
            borderRadius: "var(--rayon-petit)",
            font: "400 12px/1.4 var(--police-texte)",
          }}
        />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Enregistrer l'inverse"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

function Retour({ etat }: { etat: { echec: string | null; fait: string | null } }) {
  if (etat.echec) {
    return (
      <span
        role="alert"
        style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--danger)" }}
      >
        {etat.echec}
      </span>
    );
  }
  if (etat.fait) {
    return (
      <span
        role="status"
        style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}
      >
        {etat.fait}
      </span>
    );
  }
  return null;
}
