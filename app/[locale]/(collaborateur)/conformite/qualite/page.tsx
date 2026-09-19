import type { Metadata } from "next";

import { Cellule, EnteteTableau, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { SignalerLaRegle } from "@/app/components/conformite/GestesRevue";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { LIBELLES_LECTURE, lireLaQualiteDesRegles, type QualiteDesRegles } from "@/app/lib/conformite-revue";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Qualité des règles — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Qualité des règles (pas 99), d'après la maquette du parcours réviseur (UC10).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA BOUCLE QUE CET ÉCRAN FERME
 *
 * Le réviseur repère la règle souvent écartée et la signale ; le fiscaliste, notifié, la
 * corrige au constructeur (référentiel) et l'éprouve ; la file d'anomalies s'allège.
 *
 * ⚠️ « Peu contestée » et non « saine » : un taux faible dit que personne n'a écarté les
 * constats, pas qu'ils étaient justes. Les seuils affichés sont ceux du référentiel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "code", libelle: "Règle", largeur: "110px" },
  { cle: "libelle", libelle: "Libellé", largeur: "minmax(0, 2fr)" },
  { cle: "constats", libelle: "Constats", largeur: "90px", aDroite: true },
  { cle: "ecartes", libelle: "Écartés", largeur: "110px", aDroite: true },
  { cle: "enjeu", libelle: "Enjeu retenu", largeur: "130px", aDroite: true },
  { cle: "lecture", libelle: "Lecture", largeur: "minmax(0, 1.6fr)" },
];

const TON: Record<string, string> = {
  PEU_CONTESTEE: "var(--success)",
  A_RECALIBRER: "var(--warning)",
  TROP_BRUYANTE: "var(--danger)",
  NON_JUGEE: "var(--ink-500)",
};

function pourcent(taux: number | null) {
  return taux === null ? "—" : `${Math.round(taux * 100)} %`;
}

export default async function QualiteDesReglesPage({ searchParams }: { searchParams: Promise<{ du?: string; au?: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "CONTROLER_CONFORMITE")) {
    return <EcranReserve titre="Qualité des règles" permission="CONTROLER_CONFORMITE" acces={acces} />;
  }
  const periode = await searchParams;
  let qualite: QualiteDesRegles | null = null;
  let erreur: string | null = null;
  try {
    qualite = await lireLaQualiteDesRegles({ du: periode.du, au: periode.au });
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : String(cause);
  }
  const peutSignaler = acces.interne;
  const champ: React.CSSProperties = { padding: "4px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", font: "400 12.5px/1.4 var(--police-texte)" };

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Conformité" }, { libelle: "Qualité des règles" }]} />
      <div className="page-travail">
        <div className="page-travail__titre" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <h1>Qualité des règles</h1>
            {qualite && (
              <p>
                Du {dateCourte(qualite.du)} au {dateCourte(qualite.au)} · {qualite.pieces_controlees} pièces contrôlées · {qualite.constats} constats ·
                taux d&rsquo;écartement global {pourcent(qualite.taux_global)}
              </p>
            )}
          </div>
          {detient(acces, "LIRE_AUDIT") && (
            <Link href="/conformite" style={{ marginLeft: "auto" }}>
              Journal des dérogations
            </Link>
          )}
        </div>

        <form style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ font: "400 12px/1.5 var(--police-texte)" }}>
            Du <input type="date" name="du" defaultValue={qualite?.du} style={champ} />
          </label>
          <label style={{ font: "400 12px/1.5 var(--police-texte)" }}>
            au <input type="date" name="au" defaultValue={qualite?.au} style={champ} />
          </label>
          <button type="submit" className="bouton-discret">Mesurer</button>
        </form>

        <Panneau
          titre="Statistiques par règle"
          aide={
            qualite
              ? `À recalibrer au-delà de ${pourcent(qualite.seuils.a_recalibrer)} de constats écartés, trop bruyante au-delà de ${pourcent(qualite.seuils.trop_bruyante)}, jamais jugée sur moins de ${qualite.seuils.constats_minimum} constats (seuils du référentiel).`
              : undefined
          }
        >
          <EnteteTableau colonnes={COLONNES} />
          {erreur ? (
            <EtatVide titre="La mesure ne se fait pas" detail={erreur} />
          ) : qualite && qualite.regles.length === 0 ? (
            <EtatVide titre="Aucune règle en vigueur" />
          ) : (
            qualite?.regles.map((r, rang) => (
              <LigneTableau key={r.code} colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"}>
                <Cellule tabulaire couleur="var(--brand-indigo-700)">
                  {/* Pas 103 : la règle s'ouvre sur ses constats, où l'on écarte en masse. */}
                  <Link href={`/conformite/regles/${r.code}?du=${qualite.du}&au=${qualite.au}`}>{r.code}</Link>
                </Cellule>
                <Cellule titre={r.libelle}>{r.libelle}</Cellule>
                <Cellule aDroite tabulaire>{r.constats}</Cellule>
                <Cellule aDroite tabulaire couleur={TON[r.lecture]} gras>
                  {r.ecartes} · {pourcent(r.taux_d_ecartement)}
                </Cellule>
                <Cellule aDroite tabulaire>{Number(r.enjeu_retenu) > 0 ? montantFcfa(r.enjeu_retenu) : "—"}</Cellule>
                <Cellule>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ color: TON[r.lecture], fontWeight: 600 }}>{LIBELLES_LECTURE[r.lecture]}</strong>
                    {peutSignaler && (r.lecture === "A_RECALIBRER" || r.lecture === "TROP_BRUYANTE") && <SignalerLaRegle code={r.code} />}
                  </span>
                </Cellule>
              </LigneTableau>
            ))
          )}
        </Panneau>
        <p style={{ margin: 0, font: "400 12px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
          Une règle souvent écartée accuse des cas légitimes : son seuil est mal calibré, ou sa formulation piège. Signalée, elle se corrige
          au constructeur de règles du <Link href="/referentiel">référentiel</Link>, s&rsquo;éprouve sur les factures, puis se valide.
        </p>
      </div>
    </>
  );
}
