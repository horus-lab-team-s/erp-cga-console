import type { Metadata } from "next";

import { BandeauVerdict, type Severite } from "@/app/components/Gravite";
import { EtatErreur } from "@/app/components/Tableau";
import { DonneesExtraites } from "@/app/components/conformite/DonneesExtraites";
import { ComptabiliserLaPiece } from "@/app/components/conformite/ComptabiliserLaPiece";
import { ListeConstats } from "@/app/components/conformite/ListeConstats";
import { DemandeRectificative } from "@/app/components/collecte/GestesDemandes";
import { lireDemandes, lirePieces, type LignePiece } from "@/app/lib/collecte";
import { DocumentDeLaPiece } from "@/app/components/collecte/GestesDuCabinet";
import {
  EcarterUnConstat,
  JoindreLaPieceDAppui,
  LeverLEcart,
  SecondRegard,
} from "@/app/components/conformite/GestesEcarts";
import {
  LIBELLES_STATUT_ECART,
  lirePolitiqueDEcart,
  peutDonnerLeSecondRegard,
  regleDEcartPour,
  type PolitiqueDEcart,
} from "@/app/lib/ecarts";
import { Visionneuse } from "@/app/components/conformite/Visionneuse";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ErreurApi, controlerPieceDemonstration, type ReponseControle } from "@/app/lib/api";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { montantFcfa } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

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
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel. L'API refuse désormais aussi — et rend 404, non
  // 403, sur un dossier hors périmètre — mais un refus API remonterait ici en
  // erreur de rendu. Le refus doit se lire, pas se subir.
  if (!detient(acces, "LIRE_PIECE")) {
    return <EcranReserve titre={`Pièce ${reference}`} permission="LIRE_PIECE" acces={acces} />;
  }

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

  const { facture, verdict, rapport, ecarts } = reponse;

  // Pas 92 : la politique d'écart, lue pour ne proposer que ce qu'elle permet. Réservée
  // au cabinet côté backend ; sans elle (adhérent, ou lecture en échec), aucun geste
  // d'écart n'est proposé, et l'écran reste entier.
  let politique: PolitiqueDEcart | null = null;
  if (acces.interne) {
    try {
      politique = await lirePolitiqueDEcart();
    } catch {
      politique = null;
    }
  }

  // ⚠️ Pas 74 : une rectificative déjà demandée pour la pièce de cette facture se lit
  // ici, à la place du bouton. Émettre une seconde demande ferait relancer deux fois
  // l'adhérent ; le backend la refuserait, mais l'écran ne doit pas la proposer.
  const dossier = facture.destinataire.niu;
  let rectificativeEnCours: { identifiant: string; demandee_le: string } | null = null;
  // Pas 88 : les pièces reçues qui portent cette facture, pour en télécharger le document.
  let piecesDeLaFacture: LignePiece[] = [];
  if (dossier) {
    try {
      piecesDeLaFacture = (await lirePieces({ entreprise: dossier })).filter((p) => p.reference_document === reference);
      const pieces = piecesDeLaFacture.map((p) => p.identifiant);
      const ouverte = (await lireDemandes({ entreprise: dossier })).find(
        (d) => d.piece_a_rectifier !== null && pieces.includes(d.piece_a_rectifier),
      );
      if (ouverte) rectificativeEnCours = ouverte;
    } catch {
      // Lecture de commodité : sans elle, le bouton reste, et le backend refusera un doublon.
    }
  }
  const peutDemander = Boolean(dossier) && detient(acces, "CONTROLER_CONFORMITE");
  const rectificative = (principale: boolean) =>
    rectificativeEnCours ? (
      <span style={{ font: "400 12.5px/1.4 var(--police-texte)", color: "var(--ink-900)" }}>
        Rectificative demandée le {rectificativeEnCours.demandee_le.split("-").reverse().join("/")} (
        {rectificativeEnCours.identifiant}), <Link href="/pieces/attendues">suivie dans les pièces attendues</Link>
      </span>
    ) : peutDemander ? (
      <DemandeRectificative
        reference={reference}
        dossier={dossier!}
        motifPropose={`${verdict.titre}. ${verdict.detail}`}
        principale={principale}
      />
    ) : null;
  const severite = (rapport.constats.length
    ? rapport.constats.reduce((pire, c) =>
        rang(c.severite) > rang(pire.severite) ? c : pire,
      ).severite
    : "CONFORME") as Severite;

  return (
    <>
      {/* Pas 76 : plus de compteur de notifications écrit en dur (« 4 »). */}
      <EnteteTravail miettes={miettes} />

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

            {/* Pas 88 : le document tel qu'il a été reçu. La visionneuse dessine la facture à
                partir des données extraites ; comparer les deux est le contrôle de la lecture. */}
            {piecesDeLaFacture.length > 0 && (
              <p style={{ margin: 0, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", font: "400 12.5px/1.5 var(--police-texte)" }}>
                <span style={{ color: "var(--ink-500)" }}>Document reçu :</span>
                {piecesDeLaFacture.map((p) => (
                  <DocumentDeLaPiece key={p.identifiant} identifiant={p.identifiant} nom={p.nom_fichier} />
                ))}
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

              {/* Pas 92 : les constats écartés restent lisibles, hors de tout calcul. */}
              {rapport.constats_ecartes.length > 0 && (
                <details>
                  <summary style={{ cursor: "pointer", font: "500 12.5px/1.6 var(--police-texte)", color: "var(--ink-700)" }}>
                    {rapport.constats_ecartes.length} constat(s) écarté(s) par le cabinet, sans effet sur ce verdict
                  </summary>
                  <div style={{ opacity: 0.75, marginTop: 8 }}>
                    <ListeConstats constats={rapport.constats_ecartes.map((c) => c.constat)} />
                  </div>
                </details>
              )}

              {ecarts.length > 0 && politique && (
                <PanneauDesEcarts
                  reference={reference}
                  etats={ecarts}
                  compte={acces.compte}
                  peutLever={detient(acces, "ECARTER_CONSTAT")}
                  peutTrancher={peutDonnerLeSecondRegard(acces, politique)}
                />
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
                {rectificative(true)}
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
                {/* ⚠️ Pas 73 : ce bouton était décoratif. Il propose désormais l'écriture,
                    puis l'enregistre en brouillon, pour qui saisit. */}
                {detient(acces, "SAISIR_ECRITURE") ? (
                  <ComptabiliserLaPiece
                    reference={reference}
                    avecConsequence={rapport.constats.some((c) => c.severite === "MAJEUR")}
                  />
                ) : (
                  <span style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
                    La comptabilisation est réservée à qui saisit les écritures.
                  </span>
                )}
                {rectificative(false)}
              </>
            )}

            {/* ⚠️ Pas 92 : ce bouton était décoratif depuis le premier jour. Il propose
                désormais les seuls constats que la politique du cabinet permet d'écarter,
                et un constat déjà écarté ou en attente n'y figure plus. */}
            {politique && detient(acces, "ECARTER_CONSTAT") && (
              <EcarterUnConstat
                reference={reference}
                motifMinimum={politique.motif_minimum}
                candidats={rapport.constats
                  .filter((c) => regleDEcartPour(politique, c).ecartable)
                  .filter(
                    (c) =>
                      !ecarts.some((e) => e.ecart.code_regle === c.code_regle && e.ecart.statut === "EN_ATTENTE"),
                  )
                  .map((c) => ({
                    code_regle: c.code_regle,
                    libelle: c.libelle,
                    severite: c.severite,
                    second_regard: regleDEcartPour(politique, c).second_regard,
                  }))}
                fermes={rapport.constats
                  .filter((c) => !regleDEcartPour(politique, c).ecartable)
                  .map((c) => ({ code_regle: c.code_regle, severite: c.severite }))}
              />
            )}

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
 * Les décisions d'écart de la pièce, et ce qu'elles produisent aujourd'hui (pas 92).
 *
 * ⚠️ `raison` vient du backend : « en attente », « caduc » (le constat a changé depuis
 * la décision), « suspendu » (la politique a été durcie). L'écran ne la recalcule pas.
 *
 * Le second regard n'est jamais proposé à l'auteur de l'écart : le backend le refuserait,
 * et un bouton qui échoue est pire qu'un bouton absent.
 */
function PanneauDesEcarts({
  reference,
  etats,
  compte,
  peutLever,
  peutTrancher,
}: {
  reference: string;
  etats: ReponseControle["ecarts"];
  compte: string;
  peutLever: boolean;
  peutTrancher: boolean;
}) {
  const petit: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
  return (
    <section aria-label="Écarts de constats" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{ margin: 0, font: "600 13px/1.4 var(--police-texte)", color: "var(--ink-900)" }}>
        Écarts décidés sur cette pièce
      </h3>
      {etats.map(({ ecart, applique, raison }) => (
        <div
          key={ecart.identifiant}
          style={{
            padding: "10px 12px",
            border: "1px solid var(--line-200)",
            borderRadius: "var(--rayon)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <p style={{ margin: 0, font: "500 12.5px/1.5 var(--police-texte)", color: "var(--ink-900)" }}>
            {ecart.code_regle} · {LIBELLES_STATUT_ECART[ecart.statut]}
            {applique ? " · s'applique" : ""}
            <span style={{ color: "var(--ink-500)", fontWeight: 400 }}> · {ecart.identifiant}</span>
          </p>
          <p style={petit}>
            Proposé par {ecart.propose_par} le {ecart.propose_le.slice(0, 10).split("-").reverse().join("/")} : « {ecart.motif} »
          </p>
          {ecart.tranche_par && (
            <p style={petit}>
              Second regard de {ecart.tranche_par} : « {ecart.motif_du_second_regard} »
            </p>
          )}
          {ecart.leve_par && (
            <p style={petit}>
              Levé par {ecart.leve_par} : « {ecart.motif_de_levee} »
            </p>
          )}
          {/* Pas 118 : la preuve de ce que le motif affirme, et ce qu'il reste à joindre. */}
          <p style={petit}>
            {ecart.piece_appui
              ? `Pièce d'appui : ${ecart.piece_appui}${ecart.piece_appui_par ? `, jointe par ${ecart.piece_appui_par}` : ""}`
              : "Aucune pièce d'appui jointe."}
          </p>
          {raison && <p style={{ ...petit, color: "var(--ink-700)" }}>△ {raison}</p>}
          {ecart.statut === "EN_ATTENTE" && peutTrancher && ecart.propose_par !== compte && (
            <SecondRegard reference={reference} identifiant={ecart.identifiant} />
          )}
          {ecart.statut === "EN_ATTENTE" && ecart.propose_par === compte && (
            <p style={petit}>Le second regard viendra d&rsquo;une autre personne que vous.</p>
          )}
          {/* Même permission que la levée (`ECARTER_CONSTAT`) : qui décide l'écart en fournit la preuve. */}
          {(ecart.statut === "EN_ATTENTE" || ecart.statut === "EFFECTIF") && peutLever && (
            <JoindreLaPieceDAppui
              reference={reference}
              identifiant={ecart.identifiant}
              piece={ecart.piece_appui}
            />
          )}
          {(ecart.statut === "EN_ATTENTE" || ecart.statut === "EFFECTIF") && peutLever && (
            <LeverLEcart reference={reference} identifiant={ecart.identifiant} />
          )}
        </div>
      ))}
    </section>
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
