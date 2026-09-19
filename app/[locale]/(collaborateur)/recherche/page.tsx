import type { Metadata } from "next";

import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EtatErreur } from "@/app/components/Tableau";
import { ErreurApi } from "@/app/lib/api";
import { chercherDans, lireSourcesDeRecherche, type ReponseDeRecherche, type SourceOuverte } from "@/app/lib/recherche";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Recherche — Plateforme CGA" };

// Le résultat dépend de la requête et du périmètre de la session : rien à pré-rendre.
export const dynamic = "force-dynamic";

/**
 * Recherche globale (pas 93) : la barre de la coquille aboutit ici.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN GROUPE PAR SOURCE, ET CHAQUE GROUPE DIT CE QU'IL EN EST
 *
 * « Aucun résultat » et « la source n'a pas répondu » ne sont pas la même réponse.
 * Confondus, un comptable conclurait qu'une pièce n'existe pas alors que la collecte
 * est en panne. Chaque groupe affiche donc son propre état : résultats, aucun
 * résultat, liste tronquée (« précisez »), ou indisponible avec la phrase du service.
 *
 * `Promise.allSettled` et non `Promise.all` : une source qui échoue ne doit pas faire
 * tomber les autres. C'est tout l'intérêt d'une recherche fédérée.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Recherche({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigerAcces();
  const q = ((await searchParams).q ?? "").trim();

  let sources: SourceOuverte[] = [];
  let erreur: string | null = null;
  try {
    sources = await lireSourcesDeRecherche();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : String(cause);
  }

  const reponses = q ? await Promise.allSettled(sources.map((s) => chercherDans(s, q))) : [];
  // ⚠️ Une requête trop courte n'est pas une panne. Chaque source la refuse (422) avec
  // la même phrase, lue au réglage du backend : la dire une fois, en tête, plutôt que
  // « recherche indisponible » sous chaque groupe.
  const refusTropCourt = reponses.find(
    (r) => r.status === "rejected" && r.reason instanceof ErreurApi && r.reason.statut === 422,
  );
  const toutesRefusees = reponses.length > 0 && reponses.every((r) => r.status === "rejected");
  const trouves = reponses.reduce((n, r) => n + (r.status === "fulfilled" ? r.value.resultats.length : 0), 0);

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Recherche" }]} requete={q} />
      <div className="contenu">
        <h1 style={{ margin: 0, font: "600 var(--taille-titre-page)/1.2 var(--police-titre)", color: "var(--ink-900)" }}>
          {q ? <>Recherche « {q} »</> : "Recherche globale"}
        </h1>
        <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
          {q
            ? `${trouves} résultat${trouves > 1 ? "s" : ""} dans ${sources.length} source${sources.length > 1 ? "s" : ""}, limité à ce que votre accès vous permet de voir.`
            : `Cherchez un dossier par son NIU ou sa dénomination, une pièce par son numéro ou son émetteur${
                sources.length ? ` : ${sources.map((s) => s.libelle.toLowerCase()).join(", ")}` : ""
              }.`}
        </p>

        {erreur && <EtatErreur titre="Recherche indisponible" detail={erreur} />}

        {refusTropCourt && toutesRefusees && refusTropCourt.status === "rejected" && (
          <p role="status" style={{ margin: 0, font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-900)" }}>
            Précisez : {(refusTropCourt.reason as ErreurApi).message}
          </p>
        )}

        {q &&
          !(refusTropCourt && toutesRefusees) &&
          sources.map((source, index) => (
            <GroupeDeResultats key={source.service} source={source} issue={reponses[index]} />
          ))}
      </div>
    </>
  );
}

function GroupeDeResultats({
  source,
  issue,
}: {
  source: SourceOuverte;
  issue: PromiseSettledResult<ReponseDeRecherche> | undefined;
}) {
  const petit: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
  let corps: React.ReactNode;
  if (!issue || issue.status === "rejected") {
    const raison = issue?.status === "rejected" ? issue.reason : null;
    corps = (
      <p role="alert" style={{ ...petit, color: "var(--danger)" }}>
        {source.libelle} : recherche indisponible{raison instanceof ErreurApi ? ` (${raison.message})` : ""}. Les autres sources
        restent à jour.
      </p>
    );
  } else if (issue.value.resultats.length === 0) {
    corps = <p style={petit}>Aucun résultat.</p>;
  } else {
    corps = (
      <>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {issue.value.resultats.map((r) => (
            <li
              key={r.identifiant}
              style={{ padding: "8px 12px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", background: "var(--surface)" }}
            >
              <p style={{ margin: 0, font: "500 13px/1.5 var(--police-texte)", color: "var(--ink-900)" }}>
                {r.lien ? <Link href={r.lien}>{r.titre}</Link> : r.titre}
                <span style={{ color: "var(--ink-500)", fontWeight: 400 }}>
                  {" "}
                  · {r.nature} {r.identifiant}
                  {r.dossier && r.dossier !== r.identifiant ? ` · dossier ${r.dossier}` : ""}
                </span>
              </p>
              {r.detail && <p style={petit}>{r.detail}</p>}
            </li>
          ))}
        </ul>
        {issue.value.tronque && (
          <p style={petit}>D&rsquo;autres résultats existent : précisez la recherche (un mot de plus, ou le numéro).</p>
        )}
      </>
    );
  }
  return (
    <section aria-label={source.libelle} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ margin: 0, font: "600 14px/1.4 var(--police-texte)", color: "var(--ink-900)" }}>{source.libelle}</h2>
      {corps}
    </section>
  );
}
