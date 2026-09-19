import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatErreur,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { Montant } from "@/app/components/Montant";
import { ClotureExercice } from "@/app/components/cloture/ClotureExercice";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ErreurApi } from "@/app/lib/api";
import { detient } from "@/app/lib/acces";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { dateCourte } from "@/app/lib/formats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";
import {
  LIBELLES_SENS,
  LIBELLES_SYSTEME,
  ORDRE_SENS,
  exerciceDejaClos,
  lireLiasse,
  lirePlanDeLaLiasse,
  type Liasse,
  type SystemeDsf,
} from "@/app/lib/cloture";

export const metadata: Metadata = { title: "Clôture et DSF — Plateforme CGA" };

// La liasse se recalcule depuis la balance et le référentiel : pré-rendre
// figerait des montants que la moindre écriture de régularisation dément.
export const dynamic = "force-dynamic";

/**
 * E12 · Assistant de clôture et liasse fiscale.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORDRE DE LECTURE EST L'ORDRE DE DÉCISION
 *
 * 1. **Les contrôles.** Une liasse incohérente ne se dépose pas ; tout ce qui
 *    suit est sans objet tant qu'un contrôle est rouge. Ils passent donc avant
 *    les montants, alors même qu'ils sont verts neuf fois sur dix.
 * 2. **Le passage du résultat comptable au résultat fiscal.** C'est là que se
 *    décide l'impôt, et c'est ce que l'adhérent demandera.
 * 3. **Les états.** Le détail, en dernier — on l'ouvre pour vérifier, pas pour
 *    décider.
 *
 * ⚠️ CE QUE CET ÉCRAN NE FAIT PAS, ET POURQUOI
 *
 * Il ne dépose pas la DSF : ce dépôt reste à construire.
 *
 * ⚠️ IL CLÔT, DEPUIS LE PAS 55, ET EN DERNIER
 *
 * La clôture vient **après** les contrôles, le passage et les états : on arrête
 * des comptes qu'on vient de lire, jamais l'inverse. Elle n'est offerte qu'à qui
 * détient `CLOTURER_EXERCICE`, et pas sur un exercice déjà clos. Une clôture
 * n'est pas un dépôt, et l'écran le dit deux fois : dans la confirmation et dans
 * le message de réussite.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "poste", libelle: "Poste", largeur: "70px" },
  { cle: "libelle", libelle: "Intitulé", largeur: "minmax(0, 2fr)" },
  { cle: "comptes", libelle: "Comptes", largeur: "minmax(0, 1fr)" },
  { cle: "montant", libelle: "Montant", largeur: "150px", aDroite: true },
];

export default async function ClotureEtDsf({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; exercice?: string; systeme?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Clôture et DSF" permission="LIRE_COMPTABILITE" acces={acces} />;
  }

  const { dossier, exercice = exerciceCourant(), systeme } = await searchParams;
  // Pas 90 : le plan de la liasse, pour répondre à « pourquoi ce montant est-il là ? ».
  const systemeDsf: SystemeDsf = systeme === "MINIMAL" ? "MINIMAL" : "NORMAL";
  const plan = await lirePlanDeLaLiasse(systemeDsf).catch((e: unknown) => (e instanceof ErreurApi ? e.message : Promise.reject(e)));
  const dossiers = await lireDossiers();
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Clôture et DSF" }]} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier" detail="Aucun dossier ne vous est affecté." />
        </div>
      </>
    );
  }

  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;

  let liasse: Liasse | null = null;
  let erreur: string | null = null;
  try {
    liasse = await lireLiasse(niu, exercice);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  // ⚠️ Lu seulement pour qui peut clore : les autres n'ont rien à en faire, et
  // l'appel serait une lecture de dossier de plus au journal.
  const peutClore = detient(acces, "CLOTURER_EXERCICE");
  const clos = liasse && peutClore ? await exerciceDejaClos(niu, liasse.cloture) : null;

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Clôture et DSF" },
          { libelle: liasse?.denomination ?? dossiers.find((d) => d.niu === niu)!.denomination },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Liasse fiscale {exercice}</h1>
          <p>
            {liasse
              ? `${liasse.denomination} · clôture au ${dateCourte(liasse.cloture)} · ${
                  LIBELLES_SYSTEME[liasse.systeme]
                }`
              : "changez de dossier dans la barre latérale"}
          </p>
        </div>

        {erreur ? (
          <EtatErreur titre="Liasse indisponible" detail={erreur} />
        ) : (
          liasse && (
            <>
              <Controles liasse={liasse} />
              <TableauDePassage liasse={liasse} />
              {ORDRE_SENS.map((sens) => {
                const lignes = liasse.lignes.filter((l) => l.sens === sens);
                if (lignes.length === 0) return null;
                const total = lignes.reduce((n, l) => n + Number(l.montant), 0);
                return (
                  <Panneau
                    key={sens}
                    titre={LIBELLES_SENS[sens]}
                    aide={`${lignes.length} poste${lignes.length > 1 ? "s" : ""}`}
                    action={
                      <strong style={{ font: "600 14px/1 var(--police-texte)" }}>
                        <Montant valeur={total} />
                      </strong>
                    }
                  >
                    <EnteteTableau colonnes={COLONNES} />
                    {lignes.map((ligne) => (
                      <LigneTableau key={ligne.poste} colonnes={COLONNES}>
                        <Cellule>{ligne.poste}</Cellule>
                        <Cellule>{ligne.libelle}</Cellule>
                        <Cellule>
                          <span
                            style={{
                              font: "400 12px/1.3 var(--police-texte)",
                              color: "var(--ink-500)",
                            }}
                          >
                            {ligne.comptes.join(", ")}
                          </span>
                        </Cellule>
                        <Cellule aDroite>
                          <Montant valeur={Number(ligne.montant)} />
                        </Cellule>
                      </LigneTableau>
                    ))}
                  </Panneau>
                );
              })}
              {peutClore && (
                <Panneau
                  titre="Clôture de l’exercice"
                  aide={
                    clos
                      ? "Exercice clos : ses comptes sont arrêtés et ses soldes reportés."
                      : "Ferme l’exercice et reporte ses soldes sur le suivant. Un exercice clos ne se rouvre pas."
                  }
                >
                  {!clos && <ClotureExercice key={`${niu}-${exercice}`} dossier={niu} exercice={exercice} />}
                </Panneau>
              )}
            </>
          )
        )}

        <Panneau
          titre={`Plan de la liasse, système ${systemeDsf === "NORMAL" ? "normal" : "minimal de trésorerie"}`}
          aide="Ce qui alimente quoi : chaque poste de la liasse et les comptes qui s'y ventilent. Aucune donnée d'adhérent."
        >
          <p style={{ margin: "8px 14px", font: "400 12.5px/1.5 var(--police-texte)" }}>
            <Link href={`/cloture?${new URLSearchParams({ ...(dossier ? { dossier } : {}), exercice, systeme: systemeDsf === "NORMAL" ? "MINIMAL" : "NORMAL" })}`}>
              voir le système {systemeDsf === "NORMAL" ? "minimal de trésorerie" : "normal"}
            </Link>
          </p>
          {typeof plan === "string" ? (
            <EtatVide titre="Le plan ne se lit pas" detail={plan} />
          ) : (
            plan.map((poste) => (
              <p key={poste.code} style={{ margin: 0, padding: "5px 14px", borderBottom: "1px solid var(--line-100)", font: "400 12.5px/1.5 var(--police-texte)" }}>
                <strong style={{ display: "inline-block", minWidth: 40 }}>{poste.code}</strong> {poste.libelle} ·{" "}
                <span style={{ color: "var(--ink-500)" }}>
                  {poste.sens.toLowerCase()} · comptes {poste.prefixes.join(", ")}
                </span>
              </p>
            ))
          )}
        </Panneau>
      </div>
    </>
  );
}

/**
 * Les contrôles inter-états, avant tout le reste.
 *
 * ⚠️ Le vert n'est pas décoratif ici. Un contrôle rouge signifie que la liasse
 * **ne se dépose pas** : l'administration la rejette. C'est la seule information
 * de cet écran qui interdise une action.
 */
function Controles({ liasse }: { liasse: Liasse }) {
  return (
    <section
      style={{
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid var(--line-200)",
          background: liasse.coherent ? "var(--success-100)" : "var(--danger-100)",
        }}
      >
        <strong
          style={{
            font: "600 14px/1.3 var(--police-texte)",
            color: liasse.coherent ? "var(--success)" : "var(--danger)",
          }}
        >
          {liasse.coherent
            ? "Les trois contrôles d’avant dépôt passent"
            : "La liasse ne peut pas être déposée en l’état"}
        </strong>
        {liasse.systeme_non_valide && (
          <span
            style={{
              marginLeft: "auto",
              font: "400 12px/1.3 var(--police-texte)",
              color: "var(--ink-500)",
            }}
          >
            ⚠️ Classement en {LIBELLES_SYSTEME[liasse.systeme]} fondé sur un seuil non validé
          </span>
        )}
      </div>
      {liasse.controles.map((controle) => (
        <div
          key={controle.code}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            padding: "9px 16px",
            borderBottom: "1px solid var(--line-100)",
          }}
        >
          <span
            aria-hidden="true"
            style={{ color: controle.satisfait ? "var(--success)" : "var(--danger)" }}
          >
            {controle.satisfait ? "✓" : "✗"}
          </span>
          <span style={{ font: "400 13px/1.4 var(--police-texte)" }}>{controle.libelle}</span>
          {!controle.satisfait && (
            <span
              style={{
                font: "400 12px/1.4 var(--police-texte)",
                color: "var(--ink-500)",
                marginLeft: 8,
              }}
            >
              {controle.explication}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * Le tableau de passage — la raison d'être de l'écran.
 *
 * C'est ici qu'atterrit le chiffrage du moteur de conformité : une anomalie
 * relevée sur une facture d'octobre devient une ligne de réintégration, donc de
 * l'impôt réellement dû. Chaque ligne porte son origine, parce qu'un
 * vérificateur demandera « d'où sort ce montant ? ».
 */
function TableauDePassage({ liasse }: { liasse: Liasse }) {
  const nul = liasse.passage.length === 0;
  return (
    <Panneau
      titre="Du résultat comptable au résultat fiscal"
      aide="C’est ici que le contrôle de conformité devient de l’impôt"
    >
      <Ligne libelle="Résultat comptable" montant={liasse.resultat_comptable} fort />
      {nul ? (
        <EtatVide
          titre="Aucun retraitement"
          detail="Aucune charge refusée par le contrôle, et aucune déduction : le résultat fiscal égale le résultat comptable."
        />
      ) : (
        liasse.passage.map((ligne) => (
          <Ligne
            key={`${ligne.code}-${ligne.libelle}`}
            libelle={ligne.libelle}
            montant={ligne.montant}
            signe={ligne.nature === "REINTEGRATION" ? "+" : "−"}
            origine={ligne.origine}
            nonValide={ligne.non_valide}
          />
        ))
      )}
      <Ligne libelle="Résultat fiscal" montant={liasse.resultat_fiscal} fort surligne />
      <DroitCga liasse={liasse} />
      {Number(liasse.tva_rejetee_a_verifier) > 0 && (
        <div
          style={{
            padding: "10px 16px",
            font: "400 12.5px/1.5 var(--police-texte)",
            color: "var(--ink-500)",
            borderTop: "1px solid var(--line-100)",
          }}
        >
          <strong style={{ color: "var(--warning)" }}>
            <Montant valeur={Number(liasse.tva_rejetee_a_verifier)} /> de TVA rejetée par le
            contrôle
          </strong>{" "}
          — <strong>non réintégrée</strong>, et c’est voulu : une TVA non déductible relève de
          la déclaration de TVA, pas du résultat. La réintégrer ferait payer l’impôt deux fois
          sur la même somme. À vérifier : {liasse.pieces_a_verifier.join(", ")}.
        </div>
      )}
    </Panneau>
  );
}

/**
 * Pourquoi l'abattement CGA figure au tableau, ou pourquoi il n'y figure pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AFFICHÉ DANS LES TROIS CAS, ET CHACUN A SA PHRASE
 *
 *   droit fermé                  le motif du droit : pas d'adhésion sur tout
 *                                l'exercice, ou chiffre d'affaires au-delà du seuil
 *   droit ouvert, abattement     le motif de l'écart : déficit, ou taux absent du
 *   écarté                       référentiel
 *   droit ouvert, abattement     le motif du droit, qui fonde la déduction
 *   accordé
 *
 * Une déduction qui apparaît ou disparaît sans explication fait croire à une
 * erreur de calcul, et le réviseur la « corrigerait » en sens inverse. Le cas du
 * milieu était muet côté backend jusqu'au pas 54 : un droit ouvert, un motif
 * « sous le seuil », et pas d'abattement.
 *
 * Les phrases viennent toutes du backend ; l'écran n'en choisit que l'intitulé.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function DroitCga({ liasse }: { liasse: Liasse }) {
  const { droit_cga: droit, abattement_cga_ecarte: ecarte } = liasse;
  const [intitule, detail, couleur] = !droit.ouvert
    ? ["Pas d’abattement CGA", droit.motif, "var(--ink-700)"]
    : ecarte
      ? ["Droit à l’abattement CGA ouvert, abattement écarté", ecarte, "var(--warning)"]
      : ["Abattement CGA accordé", droit.motif, "var(--success)"];
  return (
    <div
      style={{
        padding: "10px 16px",
        font: "400 12.5px/1.5 var(--police-texte)",
        color: "var(--ink-500)",
        borderTop: "1px solid var(--line-100)",
      }}
    >
      <strong style={{ color: couleur }}>{intitule}</strong> : {detail}
    </div>
  );
}

function Ligne({
  libelle,
  montant,
  signe,
  origine,
  nonValide,
  fort,
  surligne,
}: {
  libelle: string;
  montant: string;
  signe?: "+" | "−";
  origine?: string | null;
  nonValide?: boolean;
  fort?: boolean;
  surligne?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "10px 16px",
        borderBottom: "1px solid var(--line-100)",
        background: surligne ? "var(--surface-2)" : undefined,
      }}
    >
      {signe && (
        <span
          aria-hidden="true"
          style={{
            width: 12,
            font: "600 14px/1 var(--police-texte)",
            color: signe === "+" ? "var(--warning)" : "var(--success)",
          }}
        >
          {signe}
        </span>
      )}
      <span
        style={{
          font: `${fort ? 600 : 400} 13px/1.4 var(--police-texte)`,
          marginLeft: signe ? 0 : 22,
        }}
      >
        {libelle}
        {nonValide && (
          <span style={{ color: "var(--ink-400)", fontWeight: 400 }}> · valeur à valider</span>
        )}
      </span>
      {origine && (
        <span
          style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}
        >
          {origine}
        </span>
      )}
      <strong
        style={{
          marginLeft: "auto",
          font: `${fort ? 700 : 500} 14px/1.2 var(--police-texte)`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Montant valeur={Number(montant)} />
      </strong>
    </div>
  );
}
