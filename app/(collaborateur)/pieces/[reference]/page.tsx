import type { Metadata } from "next";

import { BandeauVerdict, type Severite } from "../../../components/Gravite";
import { EtatErreur } from "../../../components/Tableau";
import { DonneesExtraites } from "../../../components/conformite/DonneesExtraites";
import { ListeConstats } from "../../../components/conformite/ListeConstats";
import { Visionneuse } from "../../../components/conformite/Visionneuse";
import { EnteteTravail } from "../../../components/coquille/EnteteTravail";
import { ErreurApi, controlerPieceDemonstration, type ReponseControle } from "../../../lib/api";
import { montantFcfa } from "../../../lib/formats";

/**
 * E02 · Détail d'une pièce et rapport de conformité — fiche au § 8.2.
 *
 * > « Écran le plus important du produit. C'est celui qui doit être conçu en
 * > premier et soigné plus que tous les autres. »
 *
 * Utilisateur : comptable ou réviseur, devant une facture d'achat déposée par un
 * adhérent. Objectif : savoir en un coup d'œil si la facture est exploitable,
 * sinon pourquoi et que faire.
 *
 * Disposition en deux colonnes, 45 % / 55 %. La colonne droite suit **l'ordre
 * exact** de la fiche : verdict, données extraites, constats, actions. Cet ordre
 * n'est pas négociable — c'est la conséquence fiscale que le comptable doit lire
 * en premier, pas l'identité du fournisseur.
 *
 * Cet écran est le seul branché sur le vrai moteur de conformité : les constats
 * affichés sont produits par l'évaluation des prédicats sur le référentiel daté.
 */

// Le rapport dépend du référentiel courant : le pré-rendre au build afficherait
// un verdict figé, périmé dès la première modification de règle par le fiscaliste.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Pièce ${reference} — Plateforme CGA` };
}

export default async function DetailPiece({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  let reponse: ReponseControle | null = null;
  let erreur: { titre: string; detail: string } | null = null;

  try {
    reponse = await controlerPieceDemonstration(reference);
  } catch (cause) {
    erreur =
      cause instanceof ErreurApi
        ? {
            titre:
              cause.statut === 404
                ? "Pièce introuvable"
                : "Contrôle de conformité indisponible",
            detail: cause.message,
          }
        : { titre: "Contrôle de conformité indisponible", detail: String(cause) };
  }

  const miettes = [
    { libelle: "Flux entrant", href: "/pieces" },
    { libelle: "Pièces justificatives", href: "/pieces" },
    { libelle: reference },
  ];

  if (!reponse) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="contenu">
          <EtatErreur titre={erreur!.titre} detail={erreur!.detail} />
        </div>
      </>
    );
  }

  const { facture, verdict, rapport } = reponse;
  const severite = (rapport.constats.length
    ? rapport.constats.reduce((pire, c) =>
        rang(c.severite) > rang(pire.severite) ? c : pire,
      ).severite
    : "CONFORME") as Severite;

  return (
    <>
      <EnteteTravail miettes={miettes} notifications={4} />

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ width: "45%", flex: "none", minWidth: 0 }}>
          <Visionneuse facture={facture} />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* 1 · Bandeau de verdict. La conséquence fiscale chiffrée, en langage
                clair. Le premier élément lu, systématiquement. */}
            <BandeauVerdict
              severite={severite}
              titre={verdict.titre}
              detail={verdict.detail}
            />

            {verdict.avertissement_validation && (
              <p
                role="note"
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: "var(--rayon)",
                  border: "1px solid var(--warning)",
                  background: "var(--warning-100)",
                  font: "400 12.5px/1.6 var(--police-texte)",
                  color: "var(--ink-900)",
                }}
              >
                <strong>△ </strong>
                {verdict.avertissement_validation}
              </p>
            )}

            {/* 2 · Données extraites, avec indice de confiance. */}
            <DonneesExtraites facture={facture} />

            {/* 3 · Constats, dépliables, chacun portant sa référence légale. */}
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h2
                  style={{
                    margin: 0,
                    font: "600 16px/1 var(--police-texte)",
                    color: "var(--ink-900)",
                  }}
                >
                  Constats
                </h2>
                <p
                  style={{
                    margin: 0,
                    font: "400 12px/1 var(--police-texte)",
                    color: "var(--ink-500)",
                  }}
                >
                  {rapport.constats.length} sur {rapport.regles_appliquees} règles appliquées
                </p>
              </div>

              {rapport.constats.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    padding: 22,
                    textAlign: "center",
                    border: "1px solid var(--line-200)",
                    borderRadius: "var(--rayon)",
                    font: "400 13px/1.6 var(--police-texte)",
                    color: "var(--ink-500)",
                  }}
                >
                  Aucune anomalie détectée — {rapport.regles_appliquees} règles appliquées.
                </p>
              ) : (
                <ListeConstats constats={rapport.constats} />
              )}

              {rapport.regles_en_echec.length > 0 && (
                <EtatErreur
                  titre={`${rapport.regles_en_echec.length} règle(s) n'ont pas pu être évaluées`}
                  detail={rapport.regles_en_echec
                    .map((e) => `${e.code_regle} : ${e.motif}`)
                    .join(" · ")}
                />
              )}
            </section>

            <TraceDuControle rapport={rapport} />
          </div>

          {/* 4 · Actions. Sur une pièce bloquante, l'action principale devient la
              demande de rectification : proposer « comptabiliser » désactivé serait
              une impasse. */}
          <footer
            style={{
              flex: "none",
              borderTop: "1px solid var(--line-200)",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              background: "var(--surface)",
            }}
          >
            {verdict.comptabilisation_interdite ? (
              <>
                <button type="button" className="action-principale">
                  Demander une facture rectificative
                </button>
                <span
                  style={{
                    font: "600 12.5px/1.4 var(--police-texte)",
                    color: "var(--danger)",
                  }}
                >
                  ⬣ Comptabilisation interdite tant que l&rsquo;anomalie bloquante subsiste
                </span>
              </>
            ) : (
              <>
                <button type="button" className="action-principale">
                  {rapport.constats.some((c) => c.severite === "MAJEUR")
                    ? "Comptabiliser avec conséquence fiscale"
                    : "Valider et comptabiliser"}
                </button>
                <button type="button" className="action-secondaire">
                  Demander une facture rectificative
                </button>
              </>
            )}

            <button type="button" className="action-secondaire">
              Écarter un constat
            </button>

            <span
              style={{
                marginLeft: "auto",
                font: "400 11.5px/1.5 var(--police-texte)",
                color: "var(--ink-500)",
                textAlign: "right",
              }}
            >
              {facture.destinataire.denomination} · période{" "}
              {new Date(`${facture.document.date_emission}T00:00:00`).toLocaleDateString("fr", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </footer>
        </div>
      </div>
    </>
  );
}

/**
 * Trace du contrôle : quels paramètres du référentiel ont servi, avec quelle
 * valeur et depuis quelle date.
 *
 * Ce bloc est ce qui rend un rapport défendable des années plus tard. Sans lui,
 * impossible d'expliquer pourquoi une facture de 2026 a été rejetée sur un seuil
 * qui aura changé en 2028.
 */
function TraceDuControle({ rapport }: { rapport: ReponseControle["rapport"] }) {
  if (rapport.parametres_employes.length === 0) return null;

  return (
    <details>
      <summary
        style={{
          cursor: "pointer",
          font: "500 12.5px/1.6 var(--police-texte)",
          color: "var(--brand-indigo-700)",
        }}
      >
        Trace du contrôle — {rapport.parametres_employes.length} paramètre(s) du référentiel
      </summary>
      <div
        style={{
          marginTop: 6,
          border: "1px solid var(--line-200)",
          borderRadius: "var(--rayon)",
          overflow: "hidden",
        }}
      >
        {rapport.parametres_employes.map((parametre) => (
          <div
            key={parametre.code}
            style={{
              padding: "8px 14px",
              borderBottom: "1px solid var(--line-100)",
              font: "400 12px/1.5 var(--police-texte)",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span className="tabulaire" style={{ fontWeight: 600 }}>
                {parametre.code}
              </span>
              <span className="tabulaire" style={{ marginLeft: "auto", fontWeight: 600 }}>
                {parametre.unite === "FCFA"
                  ? montantFcfa(String(parametre.valeur))
                  : String(parametre.valeur)}
              </span>
            </div>
            <div style={{ color: "var(--ink-500)" }}>
              en vigueur depuis le {parametre.applicable_du} · {parametre.fondement.texte}
              {parametre.statut !== "VALIDE" && (
                <strong style={{ color: "var(--warning)" }}> · non validé</strong>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

const ORDRE: Record<string, number> = {
  BLOQUANT: 4,
  MAJEUR: 3,
  AVERTISSEMENT: 2,
  INFORMATION: 1,
};

function rang(severite: string): number {
  return ORDRE[severite] ?? 0;
}
