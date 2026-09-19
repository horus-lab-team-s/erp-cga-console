import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Montant } from "@/app/components/Montant";
import { EtatVide, Panneau } from "@/app/components/Tableau";
import { EcarterEnMasse } from "@/app/components/conformite/EcarterEnMasse";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireLesConstatsDeLaRegle, type VueDEcartEnMasse } from "@/app/lib/conformite-revue";
import { dateCourte } from "@/app/lib/formats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Constats d'une règle — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les constats d'une règle, et les écarter en masse (pas 103). Maquette « Parcours réviseur », vue B.
 *
 * En tête, les chiffres qui disent si la règle mérite d'être écartée ou corrigée : constats de
 * la période, enjeu cumulé, adhérents concernés, taux d'écartement. Une règle écartée en
 * permanence est une règle à corriger (qualité des règles, pas 99), pas une alerte à ignorer.
 *
 * Une règle que la politique ne permet pas d'écarter (un BLOQUANT, par défaut) montre ses
 * constats sans case à cocher, et dit pourquoi : l'action attendue est la rectificative.
 */
export default async function ConstatsDeLaRegle({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ du?: string; au?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "CONTROLER_CONFORMITE")) {
    return <EcranReserve titre="Constats d'une règle" permission="CONTROLER_CONFORMITE" acces={acces} />;
  }
  const { code } = await params;
  const periode = await searchParams;
  let vue: VueDEcartEnMasse;
  try {
    vue = await lireLesConstatsDeLaRegle(code, periode);
  } catch (cause) {
    if (cause instanceof ErreurApi && cause.statut === 404) notFound();
    throw cause;
  }
  const noms = Object.fromEntries((await lireDossiers()).map((d) => [d.niu, d.denomination]));
  const peutEcarter = detient(acces, "ECARTER_CONSTAT");
  const cases = [
    { libelle: "Constats de la période", valeur: <>{vue.constats}</> },
    { libelle: "Enjeu fiscal cumulé", valeur: <Montant valeur={vue.enjeu_cumule} avecDevise /> },
    { libelle: "Adhérents concernés", valeur: <>{vue.adherents}</> },
    {
      libelle: "Taux d'écartement de la règle",
      valeur: <>{vue.taux_d_ecartement === null ? "—" : `${Math.round(vue.taux_d_ecartement * 100)} %`}</>,
    },
  ];

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Conformité", href: "/conformite" },
          { libelle: "Qualité des règles", href: "/conformite/qualite" },
          { libelle: vue.code },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>
            {vue.code} · {vue.libelle}
          </h1>
          <p>
            {vue.severite} · du {dateCourte(vue.du)} au {dateCourte(vue.au)} ·{" "}
            {vue.ecartable
              ? vue.second_regard
                ? "écartable avec second regard"
                : "écartable sans second regard"
              : "non écartable selon la politique du cabinet"}{" "}
            ({vue.source_de_la_politique})
          </p>
        </div>

        <form style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ font: "600 12px/1.4 var(--police-texte)" }}>
            Du <input type="date" name="du" defaultValue={vue.du} style={{ padding: "3px 6px" }} />
          </label>
          <label style={{ font: "600 12px/1.4 var(--police-texte)" }}>
            Au <input type="date" name="au" defaultValue={vue.au} style={{ padding: "3px 6px" }} />
          </label>
          <button type="submit" className="bouton-discret">
            Changer la période
          </button>
        </form>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1, background: "var(--line-200)", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", overflow: "hidden" }}>
          {cases.map((c) => (
            <div key={c.libelle} style={{ background: "var(--surface)", padding: "12px 16px" }}>
              <span style={{ display: "block", font: "400 12px/1.3 var(--police-texte)", color: "var(--ink-500)" }}>{c.libelle}</span>
              <strong style={{ display: "block", marginTop: 4, font: "700 20px/1.2 var(--police-texte)", fontVariantNumeric: "tabular-nums" }}>{c.valeur}</strong>
            </div>
          ))}
        </div>

        {!vue.ecartable && (
          <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
            La politique du cabinet ne permet pas d&rsquo;écarter ces constats : l&rsquo;action attendue est la facture rectificative,
            demandée depuis chaque pièce. La politique se règle au référentiel, pas à l&rsquo;écran.
          </div>
        )}

        <Panneau titre="Constats" aide="Les plus gros enjeux d'abord ; une ligne grisée dit pourquoi elle ne se choisit pas">
          {vue.lignes.length === 0 ? (
            <EtatVide titre="Aucun constat sur la période" />
          ) : peutEcarter ? (
            <EcarterEnMasse
              code={vue.code}
              severite={vue.severite}
              secondRegard={vue.second_regard}
              motifMinimum={vue.motif_minimum}
              motifsTypes={vue.motifs_types}
              lignes={vue.lignes}
              noms={noms}
            />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {vue.lignes.map((l) => (
                <li key={l.piece} style={{ padding: "9px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
                  <Link href={`/pieces/${l.piece}`}>{l.piece}</Link> · {noms[l.dossier] ?? l.dossier} · {l.fournisseur ?? "fournisseur inconnu"}
                  {l.raison && <span style={{ color: "var(--warning)" }}> · {l.raison}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panneau>
      </div>
    </>
  );
}
