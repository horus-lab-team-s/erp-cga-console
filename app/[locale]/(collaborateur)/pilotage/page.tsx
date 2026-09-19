import type { Metadata } from "next";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ErreurApi } from "@/app/lib/api";
import { detient } from "@/app/lib/acces";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";
import {
  LIBELLES_NIVEAU,
  TONS_NIVEAU,
  lireTableauDeBord,
  type LigneRisque,
  type TableauDeBord,
} from "@/app/lib/pilotage";

export const metadata: Metadata = { title: "Pilotage — Plateforme CGA" };

// Le score se calcule à la date du jour : un rendu figé afficherait des risques
// déjà levés, et la direction agirait sur un dossier déjà traité.
export const dynamic = "force-dynamic";

/**
 * E-J01 · Le tableau de bord de la direction.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN SCORE QUI NE SE DÉPLIE PAS EST UN CHIFFRE MAGIQUE
 *
 * C'est la contrainte du § 01 : « score décomposé et **traçable jusqu'à la
 * pièce** ». Un directeur qui lit « AGRO-NKOLO : 85 » veut savoir quoi faire, et
 * « le score est élevé » n'est pas une action. Chaque dossier affiche donc ses
 * composantes, leur poids, et **les références des éléments** qui les ont
 * produites — on descend du chiffre à la facture sans quitter l'écran.
 *
 * L'ORDRE EST CELUI DE L'ACTION, JAMAIS L'ALPHABET
 *
 * Les dossiers du plus risqué au moins risqué, les composantes de la plus lourde
 * à la moins lourde. Un tri alphabétique ferait un annuaire — joli, et inutile
 * pour décider par quoi commencer un lundi matin.
 *
 * ⚠️ CE QUE CET ÉCRAN N'AFFICHE PAS, ET POURQUOI C'EST ÉCRIT
 *
 * Pas de rentabilité par adhérent. Elle suppose un suivi du temps passé qui
 * n'existe pas, et la fabriquer en divisant les honoraires par le nombre de
 * pièces produirait un chiffre plausible et faux — que la direction emploierait
 * pour arbitrer. L'absence est assumée plutôt que comblée par une approximation.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Pilotage({
  searchParams,
}: {
  searchParams: Promise<{ exercice?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PILOTAGE")) {
    return <EcranReserve titre="Pilotage" permission="LIRE_PILOTAGE" acces={acces} />;
  }

  const { exercice = exerciceCourant() } = await searchParams;

  let tableau: TableauDeBord | null = null;
  let erreur: string | null = null;
  try {
    tableau = await lireTableauDeBord(exercice);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Pilotage" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Pilotage du cabinet</h1>
          <p>
            {tableau
              ? `${tableau.dossiers} dossier${tableau.dossiers > 1 ? "s" : ""} suivi${
                  tableau.dossiers > 1 ? "s" : ""
                } · exercice ${exercice}`
              : `exercice ${exercice}`}
          </p>
        </div>

        {erreur ? (
          <EtatErreur titre="Pilotage indisponible" detail={erreur} />
        ) : (
          tableau && (
            <>
              {tableau.poids_non_arretes && (
                <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
                  <span style={{ display: "block" }}>
                    <strong style={{ display: "inline", fontWeight: 600 }}>
                      La pondération du score n&rsquo;a pas encore été arrêtée par la
                      direction.
                    </strong>{" "}
                    Les poids et les seuils employés sont des valeurs de départ portées au
                    référentiel avec le statut <code>A_VALIDER</code>.
                  </span>
                  <span style={{ display: "block" }}>
                    Un score calculé sur des poids que personne n&rsquo;a choisis n&rsquo;est
                    pas un indicateur. Le classement ci-dessous se lit comme une proposition,
                    et les poids se règlent au référentiel — sans redéploiement.
                  </span>
                </div>
              )}

              <Compteurs tableau={tableau} />

              <Panneau
                titre="Dossiers par risque"
                aide="Du plus risqué au moins risqué — la direction traite ce qui est en haut"
              >
                {tableau.risques.length === 0 ? (
                  <EtatVide titre="Aucun dossier" />
                ) : (
                  tableau.risques.map((ligne) => <Dossier key={ligne.entreprise} ligne={ligne} />)
                )}
              </Panneau>

              <Panneau
                titre="Charge par collaborateur"
                aide="Comment le travail se répartit — ceci n’évalue personne"
              >
                {tableau.charges.length === 0 ? (
                  <EtatVide
                    titre="Aucune affectation nominative"
                    detail="Seules les habilitations à portée explicite comptent : un réviseur habilité sur tout le portefeuille y a accès, il ne le porte pas."
                  />
                ) : (
                  tableau.charges.map((charge) => (
                    <div
                      key={charge.compte}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 12,
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--line-100)",
                      }}
                    >
                      <strong style={{ font: "600 13px/1.3 var(--police-texte)" }}>
                        {charge.nom_complet}
                      </strong>
                      <span
                        style={{
                          font: "400 12.5px/1.3 var(--police-texte)",
                          color: "var(--ink-500)",
                        }}
                      >
                        {charge.dossiers} dossier{charge.dossiers > 1 ? "s" : ""}
                        {charge.dossiers_a_risque_eleve > 0 &&
                          ` · ${charge.dossiers_a_risque_eleve} à traiter`}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          font: "600 13px/1.2 var(--police-texte)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {Number(charge.risque_porte)} pts
                      </span>
                    </div>
                  ))
                )}
              </Panneau>
            </>
          )
        )}
      </div>
    </>
  );
}

/**
 * Les trois compteurs d'en-tête.
 *
 * Trois plutôt qu'un : « douze dossiers » ne dit rien, « douze dossiers dont
 * trois à traiter » dit quoi faire aujourd'hui.
 */
function Compteurs({ tableau }: { tableau: TableauDeBord }) {
  const cases = [
    { libelle: "Dossiers suivis", valeur: tableau.dossiers, ton: null },
    { libelle: "À traiter", valeur: tableau.a_risque_eleve, ton: "ELEVE" as const },
    { libelle: "À surveiller", valeur: tableau.a_risque_modere, ton: "MODERE" as const },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 1,
        background: "var(--line-200)",
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        overflow: "hidden",
      }}
    >
      {cases.map((c) => (
        <div key={c.libelle} style={{ background: "var(--surface)", padding: "14px 16px" }}>
          <span
            style={{
              display: "block",
              font: "400 12px/1.3 var(--police-texte)",
              color: "var(--ink-500)",
            }}
          >
            {c.libelle}
          </span>
          <strong
            style={{
              display: "block",
              marginTop: 4,
              font: "700 24px/1 var(--police-texte)",
              fontVariantNumeric: "tabular-nums",
              color: c.ton && c.valeur > 0 ? TONS_NIVEAU[c.ton].texte : "var(--ink-900)",
            }}
          >
            {c.valeur}
          </strong>
        </div>
      ))}
    </div>
  );
}

/**
 * Un dossier, avec son score déplié.
 *
 * Le dépliage est **toujours ouvert**, pas dans un accordéon : un score replié
 * redevient un chiffre magique, et l'utilisateur qui doit cliquer pour
 * comprendre ne clique pas — il se fie au chiffre.
 */
function Dossier({ ligne }: { ligne: LigneRisque }) {
  const ton = TONS_NIVEAU[ligne.niveau];
  return (
    <article style={{ borderBottom: "1px solid var(--line-100)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          padding: "11px 16px",
        }}
      >
        {/* Pas 100 : le dossier s'ouvre sur sa vue risque, où la direction décide. */}
        <strong style={{ font: "600 14px/1.3 var(--police-texte)" }}>
          <Link href={`/pilotage/${ligne.entreprise}`}>{ligne.denomination}</Link>
        </strong>
        <span
          style={{ font: "400 12px/1.3 var(--police-texte)", color: "var(--ink-400)" }}
        >
          {ligne.entreprise}
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            background: ton.fond,
            color: ton.texte,
            borderRadius: 5,
            padding: "3px 9px",
            font: "600 12px/1.4 var(--police-texte)",
          }}
        >
          {LIBELLES_NIVEAU[ligne.niveau]}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {Number(ligne.total)} pts
          </span>
        </span>
      </header>

      {ligne.mesures.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: "0 16px 12px 16px",
            font: "400 12.5px/1.4 var(--police-texte)",
            color: "var(--ink-500)",
          }}
        >
          Rien à signaler : aucune anomalie bloquante, aucun retard déclaratif, aucune pièce
          en souffrance, aucune demande sans réponse.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: "0 16px 12px 16px" }}>
          {ligne.mesures.map((mesure) => (
            <li key={mesure.composante} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <strong
                  style={{
                    font: "600 12.5px/1.4 var(--police-texte)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {mesure.occurrences} × {mesure.libelle}
                </strong>
                <span
                  style={{
                    font: "400 12px/1.4 var(--police-texte)",
                    color: "var(--ink-400)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  poids {Number(mesure.poids)} → {Number(mesure.poids) * mesure.occurrences} pts
                </span>
              </div>
              <div
                style={{
                  font: "400 12px/1.45 var(--police-texte)",
                  color: "var(--ink-500)",
                }}
              >
                {mesure.action}
              </div>
              {mesure.elements.length > 0 && (
                <div
                  style={{
                    font: "400 11.5px/1.45 var(--police-texte)",
                    color: "var(--ink-400)",
                  }}
                >
                  {mesure.elements.join(" · ")}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
