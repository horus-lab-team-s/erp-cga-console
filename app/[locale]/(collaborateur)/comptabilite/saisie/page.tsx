import type { Metadata } from "next";

import { ActesEcriture } from "@/app/components/comptabilite/ActesEcriture";
import { FormulaireEcriture } from "@/app/components/comptabilite/FormulaireEcriture";
import { Montant } from "@/app/components/Montant";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EtatVide, Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import {
  exerciceCourant,
  lireEcritures,
  lireJournaux,
  lirePlanComptable,
  type Compte,
  type Ecriture,
  type Journal,
} from "@/app/lib/comptabilite";
import { lireLesComptesUtilises, lireUneEcriture } from "@/app/lib/fiche-ecriture";
import { aujourdhui, lireDossiers, lireExercicesDuDossier, type ExerciceDuDossier } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Saisie comptable — Plateforme CGA" };

// La liste des écritures change à chaque saisie : un rendu figé montrerait le
// journal d'avant, et le comptable croirait sa saisie perdue.
export const dynamic = "force-dynamic";

/**
 * E-E02 · Saisir une écriture, la valider, la contre-passer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST LE PREMIER ÉCRAN D'ÉCRITURE DE L'ESPACE DE TRAVAIL
 *
 * Les seize écrans précédents lisaient. L'API savait écrire depuis longtemps —
 * trente routes — et aucune n'était atteignable autrement qu'en ligne de
 * commande. Un cabinet pouvait consulter une comptabilité qu'il n'avait aucun
 * moyen de tenir.
 *
 * LA SAISIE ET LE JOURNAL SUR LE MÊME ÉCRAN
 *
 * Le formulaire en haut, les écritures du journal en dessous. Deux écrans
 * séparés obligeraient à naviguer pour vérifier ce qu'on vient d'enregistrer, et
 * c'est précisément le moment où l'on vérifie. Le journal montre les dix
 * dernières : au-delà, on lit le grand livre, qui est fait pour ça.
 *
 * ⚠️ CE QUE CET ÉCRAN NE FAIT PAS, ET POURQUOI
 *
 * Pas d'imputation automatique depuis une pièce. Le backend sait la proposer —
 * `proposer_ecriture_achat` construit l'écriture d'une facture contrôlée, TVA
 * comprise, avec ses attributs fiscaux. La brancher ici demande de choisir la
 * pièce d'origine dans la boîte de réception, donc un second parcours, qui n'est
 * pas fait. La saisie manuelle vient d'abord parce qu'elle est le socle : sans
 * elle, l'imputation automatique n'aurait rien à corriger.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function SaisieComptable({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; exercice?: string; journal?: string; modele?: string }>;
}) {
  const acces = await exigerAcces();
  // ⚠️ `SAISIR_ECRITURE` et non `LIRE_COMPTABILITE` : le chargé de clientèle lit
  // la comptabilité et ne saisit pas, l'inspecteur non plus. Garder la lecture
  // ici ouvrirait un formulaire dont chaque envoi finirait en 403.
  if (!detient(acces, "SAISIR_ECRITURE")) {
    return <EcranReserve titre="Saisie comptable" permission="SAISIR_ECRITURE" acces={acces} />;
  }

  const { dossier, exercice = exerciceCourant(), journal, modele: modeleDemande } = await searchParams;
  const dossiers = await lireDossiers();

  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail
          miettes={[{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Saisie" }]}
        />
        <div className="page-travail">
          <EtatVide
            titre="Aucun dossier"
            detail="Aucun dossier ne vous est affecté : il n'y a rien à saisir."
          />
        </div>
      </>
    );
  }

  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;

  // Pas 110 : « Dupliquer pour une nouvelle saisie » arrive avec `modele=AC/3`.
  const [journalDuModele, numeroDuModele] = (modeleDemande ?? "").split("/");
  const [journaux, comptes, ecritures, exercices, comptesUtilises, modele] = await Promise.all([
    lireJournaux(),
    lirePlanComptable(),
    lireEcritures(niu, exercice, journal),
    lireExercicesDuDossier(niu),
    // Une commodité : sans elle, la palette montre le plan général seul.
    lireLesComptesUtilises(niu, exercice).catch(() => []),
    journalDuModele && Number(numeroDuModele) > 0
      ? lireUneEcriture(niu, exercice, journalDuModele, Number(numeroDuModele)).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  // `null` si la fiche est illisible ou l'exercice inconnu : les gestes restent, le
  // backend tranche (voir ActesEcriture).
  const exerciceAffiche = exercices?.find((e) => e.libelle === exercice) ?? null;
  const jour = aujourdhui();

  // Les dernières saisies d'abord : c'est ce qu'on vient de faire qu'on relit,
  // pas ce qu'on a fait en janvier.
  const dernieres = [...ecritures].reverse().slice(0, 10);

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Comptabilité", href: "/comptabilite" },
          { libelle: courant.denomination },
          { libelle: "Saisie" },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Saisie d&rsquo;écriture</h1>
          <p>
            {courant.denomination} · exercice {exercice} ·{" "}
            {ecritures.length} écriture{ecritures.length > 1 ? "s" : ""} au journal
            {dossiers.length > 1 && " · changez de dossier dans la barre latérale"}
          </p>
        </div>

        <Panneau
          titre="Nouvelle écriture"
          aide="Elle naît en brouillon : le comptable relit avant d'engager"
        >
          <div style={{ padding: "var(--espace-3)" }}>
            <FormulaireEcriture
              dossier={niu}
              exercice={exercice}
              journaux={journaux}
              comptes={comptes}
              aujourdHui={new Date().toISOString().slice(0, 10)}
              modele={modele}
              comptesUtilises={comptesUtilises}
            />
          </div>
        </Panneau>

        <Panneau
          titre="Dernières écritures"
          aide="Un brouillon se valide ; une écriture validée ne se corrige que par son inverse"
          action={
            <Link
              href={`/comptabilite?dossier=${niu}&exercice=${exercice}`}
              style={{ font: "400 12.5px/1 var(--police-texte)" }}
            >
              Voir la balance
            </Link>
          }
        >
          {dernieres.length === 0 ? (
            <EtatVide
              titre="Journal vide"
              detail={`Aucune écriture sur l'exercice ${exercice}. La première saisie portera le numéro 1.`}
            />
          ) : (
            dernieres.map((ecriture) => (
              <LigneEcriture
                key={ecriture.numero + ecriture.journal}
                niu={niu}
                ecriture={ecriture}
                exercice={exerciceAffiche}
                aujourdhui={jour}
                journaux={journaux}
                comptes={comptes}
              />
            ))
          )}
        </Panneau>
      </div>
    </>
  );
}

/**
 * Une écriture, dépliée sur ses lignes.
 *
 * Dépliée et non repliée : une écriture qu'il faut ouvrir pour voir ses comptes
 * n'est pas relue, et c'est justement la relecture qui précède la validation.
 */
function LigneEcriture({
  niu,
  ecriture,
  exercice,
  aujourdhui,
  journaux,
  comptes,
}: {
  niu: string;
  ecriture: Ecriture;
  exercice: ExerciceDuDossier | null;
  aujourdhui: string;
  journaux: Journal[];
  comptes: Compte[];
}) {
  const brouillon = ecriture.etat === "BROUILLON";
  return (
    <article style={{ borderBottom: "1px solid var(--line-100)", padding: "10px 14px" }}>
      <header
        style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}
      >
        <strong
          style={{ font: "600 13px/1.3 var(--police-texte)", fontVariantNumeric: "tabular-nums" }}
        >
          {/* Pas 110 : la fiche de l'écriture, son historique et sa correction. */}
          <Link href={`/comptabilite/ecritures?dossier=${encodeURIComponent(niu)}&exercice=${ecriture.exercice}&journal=${ecriture.journal}&numero=${ecriture.numero}`}>
            {ecriture.journal} n° {ecriture.numero}
          </Link>
        </strong>
        <span
          style={{
            font: "400 12px/1.3 var(--police-texte)",
            color: "var(--ink-500)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {ecriture.date_operation}
        </span>
        <span style={{ font: "400 12.5px/1.3 var(--police-texte)" }}>{ecriture.libelle}</span>
        {ecriture.piece_justificative && (
          <code style={{ fontSize: 11 }}>{ecriture.piece_justificative}</code>
        )}
        <span
          style={{
            borderRadius: 4,
            padding: "2px 7px",
            font: "600 11px/1.5 var(--police-texte)",
            background: brouillon ? "var(--brand-indigo-100)" : "var(--success-100, #edf6f1)",
            color: brouillon ? "var(--brand-indigo-700)" : "var(--success, #1e7a4c)",
          }}
        >
          {brouillon ? "Brouillon" : "Validée"}
        </span>
        <span style={{ marginLeft: "auto" }}>
          <ActesEcriture
            dossier={niu}
            ecriture={ecriture}
            exercice={exercice}
            aujourdhui={aujourdhui}
            journaux={journaux}
            comptes={comptes}
          />
        </span>
      </header>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 6,
          font: "400 12px/1.5 var(--police-texte)",
        }}
      >
        <tbody>
          {/* ⚠️ Le montant se range d'après `sens`. L'API ne rend pas deux
              colonnes `debit` et `credit` : le type du front les déclarait, et
              elles n'ont jamais existé. Choisir la colonne est de la mise en
              page, pas un calcul — le front continue de ne rien additionner. */}
          {ecriture.lignes.map((ligne, rang) => (
            <tr key={rang}>
              <td style={{ width: 70, fontVariantNumeric: "tabular-nums" }}>{ligne.compte}</td>
              <td style={{ color: "var(--ink-500)" }}>{ligne.libelle}</td>
              <td style={{ width: 130, textAlign: "right" }}>
                {ligne.sens === "DEBIT" && <Montant valeur={ligne.montant} />}
              </td>
              <td style={{ width: 130, textAlign: "right" }}>
                {ligne.sens === "CREDIT" && <Montant valeur={ligne.montant} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
