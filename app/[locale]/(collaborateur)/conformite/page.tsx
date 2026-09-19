import type { Metadata } from "next";

import { Cellule, EnteteTableau, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { ExporterLeJournal } from "@/app/components/conformite/GestesRevue";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireLeJournalDesDerogations, type FiltresDesDerogations, type JournalDesDerogations } from "@/app/lib/conformite-revue";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Journal des dérogations — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Journal des dérogations (pas 99), d'après la maquette du parcours réviseur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'UN VÉRIFICATEUR DEMANDERA À VOIR
 *
 * Chaque constat que le cabinet a écarté : quand, sur quelle pièce, quelle règle, pourquoi,
 * par qui, avec quel second regard, et l'enjeu que l'écart a levé (relevé au moment de
 * l'écart, pas recalculé aujourd'hui). Rien ne s'y modifie : une dérogation se lève, depuis
 * la pièce, elle ne s'efface pas.
 *
 * ⚠️ `LIRE_AUDIT` : le réviseur, la direction, et l'inspecteur sur son seul dossier. Le
 * comptable contrôle sans auditer : l'entrée de menu « Conformité » le mène à la qualité des
 * règles, et cet écran lui dit la permission qui lui manque.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "date", libelle: "Date", largeur: "96px" },
  { cle: "regle", libelle: "Règle", largeur: "110px" },
  { cle: "dossier", libelle: "Dossier", largeur: "minmax(0, 1.1fr)" },
  { cle: "piece", libelle: "Pièce", largeur: "110px" },
  { cle: "motif", libelle: "Motif", largeur: "minmax(0, 2.2fr)" },
  { cle: "appui", libelle: "Pièce d'appui", largeur: "minmax(0, 1fr)" },
  { cle: "enjeu", libelle: "Enjeu levé", largeur: "120px", aDroite: true },
  { cle: "statut", libelle: "Statut", largeur: "minmax(0, 1fr)" },
];

const STATUTS: Record<string, string> = {
  EN_ATTENTE: "en attente du second regard",
  EFFECTIF: "effective",
  REFUSE: "refusée",
  LEVE: "levée",
};

export default async function JournalDesDerogationsPage({
  searchParams,
}: {
  searchParams: Promise<FiltresDesDerogations>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_AUDIT")) {
    return <EcranReserve titre="Journal des dérogations" permission="LIRE_AUDIT" acces={acces} />;
  }
  const brut = await searchParams;
  const filtres: FiltresDesDerogations = {
    regle: brut.regle || undefined,
    auteur: brut.auteur || undefined,
    dossier: brut.dossier || undefined,
    statut: brut.statut || undefined,
  };
  let journal: JournalDesDerogations | null = null;
  let erreur: string | null = null;
  try {
    journal = await lireLeJournalDesDerogations(filtres);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : String(cause);
  }
  // Les noms de dossiers sont une commodité : sans lecture du portefeuille, le NIU reste lisible.
  const noms = new Map(
    (detient(acces, "LIRE_DOSSIER") ? await lireDossiers().catch(() => []) : []).map((d) => [d.niu, d.denomination]),
  );
  const champ: React.CSSProperties = { padding: "4px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", font: "400 12.5px/1.4 var(--police-texte)" };

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Conformité" }, { libelle: "Journal des dérogations" }]} />
      <div className="page-travail">
        <div className="page-travail__titre" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <h1>Journal des dérogations</h1>
            {journal && (
              <p>
                {journal.total} dérogation{journal.total > 1 ? "s" : ""} dont {journal.effectives} effective
                {journal.effectives > 1 ? "s" : ""} · {montantFcfa(journal.enjeu_leve)} d&rsquo;enjeu levé · consultable en cas de contrôle
              </p>
            )}
          </div>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/conformite/qualite">Qualité des règles</Link>
            <ExporterLeJournal filtres={filtres} />
          </span>
        </div>

        <form style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input name="regle" defaultValue={filtres.regle} placeholder="Règle (FAC-ACH-007)" aria-label="Filtrer par règle" style={champ} />
          <input name="dossier" defaultValue={filtres.dossier} placeholder="NIU du dossier" aria-label="Filtrer par dossier" style={champ} />
          <select name="statut" defaultValue={filtres.statut ?? ""} aria-label="Filtrer par statut" style={champ}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button type="submit" className="bouton-discret">Filtrer</button>
          <span style={{ marginLeft: "auto", font: "400 11.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
            Une dérogation ne se modifie ni ne se supprime : elle se lève, depuis la pièce, ce qui rétablit le constat.
          </span>
        </form>

        {/* Pas 118 : ce que la revue trimestrielle regarde en premier. Affiché avant le journal,
            parce qu'une dérogation sans preuve est ce qui se défend le plus mal. */}
        {journal && journal.a_regulariser.length > 0 && (
          <Panneau
            titre={`À régulariser (${journal.a_regulariser.length})`}
            aide={`Dérogations qui exigent une pièce d'appui, sans pièce jointe passé ${journal.delai_de_regularisation_jours} jours. La pièce se joint depuis la fiche de la pièce.`}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {journal.a_regulariser.map((r) => (
                <li
                  key={r.identifiant}
                  style={{ padding: "8px 16px", borderTop: "1px solid var(--line-100)", font: "400 13px/1.5 var(--police-texte)" }}
                >
                  <Link href={`/pieces/${r.reference_document}`}>{r.reference_document}</Link> · {r.code_regle} ·{" "}
                  {r.severite.toLowerCase()} · {noms.get(r.dossier) ?? r.dossier} · proposée par {r.propose_par} il y a{" "}
                  <strong style={{ color: "var(--danger)" }}>{r.jours} jours</strong>
                </li>
              ))}
            </ul>
          </Panneau>
        )}

        <Panneau titre="Dérogations" aide="Du plus récent au plus ancien. L'enjeu est celui du constat au moment de l'écart.">
          <EnteteTableau colonnes={COLONNES} />
          {erreur ? (
            <EtatVide titre="Le journal ne se lit pas" detail={erreur} />
          ) : journal && journal.derogations.length === 0 ? (
            <EtatVide titre="Aucune dérogation" detail="Aucun constat n'a été écarté dans votre périmètre, ou aucun ne répond aux filtres." />
          ) : (
            journal?.derogations.map((d, rang) => (
              <LigneTableau key={d.identifiant} colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"} hauteur="auto">
                <Cellule tabulaire>{dateCourte(d.propose_le)}</Cellule>
                <Cellule tabulaire couleur="var(--brand-indigo-700)">{d.code_regle}</Cellule>
                <Cellule titre={d.dossier}>{noms.get(d.dossier) ?? d.dossier}</Cellule>
                <Cellule tabulaire>
                  <Link href={`/pieces/${d.reference_document}`}>{d.reference_document}</Link>
                </Cellule>
                <Cellule titre={d.motif}>
                  {d.motif}
                  <span style={{ display: "block", color: "var(--ink-500)", fontSize: 11.5 }}>
                    par {journal.auteurs[d.propose_par] ?? d.propose_par}
                    {d.tranche_par && ` · second regard de ${journal.auteurs[d.tranche_par] ?? d.tranche_par}`}
                    {d.leve_par && ` · levée par ${journal.auteurs[d.leve_par] ?? d.leve_par} : « ${d.motif_de_levee} »`}
                  </span>
                </Cellule>
                <Cellule titre={d.piece_appui ?? undefined}>
                  {d.piece_appui ?? (
                    <span style={{ color: "var(--ink-500)" }}>aucune</span>
                  )}
                </Cellule>
                <Cellule aDroite tabulaire>{d.enjeu ? montantFcfa(d.enjeu) : "—"}</Cellule>
                <Cellule>{STATUTS[d.statut] ?? d.statut}</Cellule>
              </LigneTableau>
            ))
          )}
        </Panneau>
      </div>
    </>
  );
}
