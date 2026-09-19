import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { CloreLaDecision, DeciderLaMesure } from "@/app/components/pilotage/GestesDecisions";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { dateCourte } from "@/app/lib/formats";
import {
  LIBELLES_NIVEAU,
  TONS_NIVEAU,
  lireVueRisque,
  type DecisionLue,
  type MesureComposante,
  type VueRisque,
} from "@/app/lib/pilotage";
import { Link } from "@/i18n/navigation";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Vue risque — Plateforme CGA" };

// Le score se calcule à la date du jour, comme au tableau de bord.
export const dynamic = "force-dynamic";

/**
 * E-J02 · La vue risque d'un dossier (pas 100), maquette « Pilotage direction », vue B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS QUESTIONS, DANS L'ORDRE OÙ LA DIRECTION LES POSE
 *
 * 1. **Combien, et par rapport à quoi ?** Le score, son niveau, et les seuils employés :
 *    « 65 » ne se lit pas sans « élevé à partir de 60 ».
 * 2. **Qu'est-ce qui le compose ?** Les quatre composantes, y compris celles à zéro (une
 *    composante absente laisserait croire qu'elle n'a pas été regardée), puis chaque
 *    élément cité, avec un lien vers la pièce ou l'échéancier. On descend du chiffre à la
 *    facture sans rien chercher.
 * 3. **Que décide-t-on ?** Les mesures que le catalogue du cabinet propose à ce niveau,
 *    et l'histoire des décisions déjà prises : datées, signées, motivées, avec le score
 *    qui les a fondées.
 *
 * ⚠️ ÉCARTS ASSUMÉS AVEC LA MAQUETTE
 *
 * La maquette compose le score de cinq rubriques notées sur un maximum (« complétude
 * 18/25 », « relation et paiement 8/20 »). Le score réel en compte quatre, non bornées :
 * chaque rubrique de la maquette qui n'a pas de relevé dans le système (paiement des
 * honoraires, volumétrie) serait un chiffre inventé. Une composante nouvelle s'ajoute
 * avec son poids au référentiel, le jour où son relevé existe.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function VueRisqueDuDossier({
  params,
  searchParams,
}: {
  params: Promise<{ niu: string }>;
  searchParams: Promise<{ exercice?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PILOTAGE")) {
    return <EcranReserve titre="Vue risque" permission="LIRE_PILOTAGE" acces={acces} />;
  }
  const { niu } = await params;
  const { exercice = exerciceCourant() } = await searchParams;

  let vue: VueRisque | null = null;
  let erreur: string | null = null;
  try {
    vue = await lireVueRisque(niu, exercice);
  } catch (cause) {
    if (cause instanceof ErreurApi && (cause.statut === 404 || cause.statut === 403)) notFound();
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  const peutDecider = detient(acces, "DECIDER_SUR_DOSSIER");

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Pilotage", href: "/pilotage" }, { libelle: vue?.denomination ?? niu }]}
      />
      <div className="page-travail">
        {erreur || !vue ? (
          <EtatErreur titre="Vue risque indisponible" detail={erreur ?? ""} />
        ) : (
          <>
            <div className="page-travail__titre">
              <h1>{vue.denomination}</h1>
              <p>
                NIU {vue.entreprise} · exercice {vue.exercice} · calculé le {dateCourte(vue.a_la_date)} ·{" "}
                <Link href={`/portefeuille/${vue.entreprise}`}>fiche du dossier</Link>
              </p>
            </div>

            {vue.poids_non_arretes && (
              <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
                <span style={{ display: "block" }}>
                  <strong style={{ display: "inline", fontWeight: 600 }}>
                    La pondération n&rsquo;a pas encore été arrêtée par la direction.
                  </strong>{" "}
                  Ce score se lit comme une proposition ; une décision prise dessus le garde en mémoire.
                </span>
              </div>
            )}

            <Score vue={vue} />

            <Panneau
              titre="Ce qui compose le risque"
              aide="Chaque composante avec ses éléments : on descend du chiffre à la pièce"
            >
              {vue.composantes.map((c) => (
                <Composante key={c.composante} mesure={c} niu={vue.entreprise} exercice={vue.exercice} />
              ))}
            </Panneau>

            <Panneau
              titre="Décider"
              aide={`Mesures proposées au niveau « ${LIBELLES_NIVEAU[vue.niveau]} » · catalogue ${vue.source_du_catalogue}`}
            >
              {!peutDecider ? (
                <EtatVide
                  titre="Lecture seule"
                  detail="Décider une mesure demande la permission DECIDER_SUR_DOSSIER."
                />
              ) : vue.mesures_proposees.length === 0 ? (
                <EtatVide
                  titre="Aucune mesure proposée à ce niveau"
                  detail="Les mesures se règlent au référentiel, dans pilotage/mesures.yaml : chacune dit pour quels niveaux elle est permise."
                />
              ) : (
                vue.mesures_proposees.map((m) => (
                  <DeciderLaMesure
                    key={m.code}
                    niu={vue.entreprise}
                    mesure={m}
                    motifMinimum={vue.motif_minimum}
                    demain={lendemain(vue.a_la_date)}
                  />
                ))
              )}
            </Panneau>

            <Panneau
              titre="Décisions de la direction"
              aide="Datées, signées, avec le score qui les a fondées. Une décision close reste lisible."
            >
              {vue.decisions.length === 0 ? (
                <EtatVide titre="Aucune décision sur ce dossier" />
              ) : (
                vue.decisions.map((d) => (
                  <Decision
                    key={d.decision.identifiant}
                    lue={d}
                    niu={vue.entreprise}
                    motifMinimum={vue.motif_minimum}
                    peutClore={peutDecider}
                  />
                ))
              )}
            </Panneau>
          </>
        )}
      </div>
    </>
  );
}

function lendemain(jour: string): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Le score, son niveau et les seuils qui le classent. */
function Score({ vue }: { vue: VueRisque }) {
  const ton = TONS_NIVEAU[vue.niveau];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        flexWrap: "wrap",
        padding: "14px 16px",
        background: "var(--surface)",
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
      }}
    >
      <strong style={{ font: "700 32px/1 var(--police-texte)", fontVariantNumeric: "tabular-nums", color: ton.texte }}>
        {Number(vue.total)} pts
      </strong>
      <span
        style={{
          background: ton.fond,
          color: ton.texte,
          borderRadius: 5,
          padding: "3px 9px",
          font: "600 12.5px/1.4 var(--police-texte)",
        }}
      >
        {LIBELLES_NIVEAU[vue.niveau]}
      </span>
      <span style={{ font: "400 12.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
        « à surveiller » dès {Number(vue.seuil_modere)} pts, « à traiter » dès {Number(vue.seuil_eleve)} pts. Le score
        n&rsquo;est pas borné à cent : un dossier qui cumule doit se distinguer.
      </span>
    </div>
  );
}

/**
 * Où mène un élément. Les pièces s'ouvrent ; un retard mène à l'échéancier du dossier ; une
 * demande sans réponse, aux pièces attendues.
 */
function lienDe(composante: string, element: string, niu: string, exercice: string): string | null {
  if (composante === "PIECES_EN_SOUFFRANCE") return `/pieces/${encodeURIComponent(element)}`;
  // Une anomalie bloquante cite la pièce justificative de l'écriture, ou, à défaut, le
  // journal et le numéro (« AC-000012 ») : seule la première s'ouvre comme une pièce.
  if (composante === "ANOMALIES_BLOQUANTES") return element.startsWith("PJ-") ? `/pieces/${encodeURIComponent(element)}` : null;
  if (composante === "RETARD_DECLARATIF") return `/obligations?dossier=${encodeURIComponent(niu)}&exercice=${encodeURIComponent(exercice)}`;
  if (composante === "DEMANDES_SANS_REPONSE") return "/pieces/attendues";
  return null;
}

function Composante({ mesure, niu, exercice }: { mesure: MesureComposante; niu: string; exercice: string }) {
  const contribution = Number(mesure.poids) * mesure.occurrences;
  const saine = mesure.occurrences === 0;
  // 33 retards cités un à un ne se lisent pas : ils sont regroupés par obligation, mois
  // à la suite (« TVA : 01, 02, 03/2026 »), sans rien perdre de la traçabilité.
  const groupes =
    mesure.composante === "RETARD_DECLARATIF" ? regrouperLesRetards(mesure.elements) : null;
  return (
    <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--line-100)", opacity: saine ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ font: "600 13px/1.4 var(--police-texte)", fontVariantNumeric: "tabular-nums" }}>
          {saine ? `Aucun élément : ${mesure.libelle}` : `${mesure.occurrences} × ${mesure.libelle}`}
        </strong>
        <span style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-400)", fontVariantNumeric: "tabular-nums" }}>
          poids {Number(mesure.poids)}
          {mesure.poids_non_valide ? " (non arrêté)" : ""}
        </span>
        <strong style={{ marginLeft: "auto", font: "600 13px/1.4 var(--police-texte)", fontVariantNumeric: "tabular-nums" }}>
          {contribution} pts
        </strong>
      </div>
      {!saine && (
        <>
          <p style={{ margin: "2px 0 4px", font: "400 12.5px/1.45 var(--police-texte)", color: "var(--ink-500)" }}>{mesure.action}</p>
          <div style={{ font: "400 12px/1.7 var(--police-texte)", color: "var(--ink-500)" }}>
            {groupes
              ? groupes.map(([code, mois]) => (
                  <span key={code} style={{ display: "block" }}>
                    <Link href={lienDe(mesure.composante, code, niu, exercice) ?? "#"}>{code}</Link> : {mois.join(", ")}
                  </span>
                ))
              : mesure.elements.map((element, rang) => {
                  const lien = lienDe(mesure.composante, element, niu, exercice);
                  return (
                    <span key={element}>
                      {rang > 0 && " · "}
                      {lien ? <Link href={lien}>{element}</Link> : element}
                    </span>
                  );
                })}
          </div>
        </>
      )}
    </div>
  );
}

/** « TVA 01/2026 », « TVA 02/2026 » deviennent `["TVA", ["01/2026", "02/2026"]]`. */
function regrouperLesRetards(elements: string[]): [string, string[]][] {
  const groupes = new Map<string, string[]>();
  for (const element of elements) {
    const coupure = element.lastIndexOf(" ");
    const code = coupure > 0 ? element.slice(0, coupure) : element;
    const mois = coupure > 0 ? element.slice(coupure + 1) : "";
    groupes.set(code, [...(groupes.get(code) ?? []), mois]);
  }
  return [...groupes.entries()];
}

function Decision({ lue, niu, motifMinimum, peutClore }: { lue: DecisionLue; niu: string; motifMinimum: number; peutClore: boolean }) {
  const d = lue.decision;
  const enCours = d.statut === "EN_COURS";
  return (
    <article style={{ padding: "11px 16px", borderBottom: "1px solid var(--line-100)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ font: "600 13px/1.4 var(--police-texte)" }}>{d.libelle}</strong>
        <span
          style={{
            font: "600 11.5px/1.4 var(--police-texte)",
            color: lue.echue ? "var(--danger)" : enCours ? "var(--warning)" : "var(--ink-500)",
          }}
        >
          {lue.echue ? "échue" : enCours ? "en cours" : "close"}
          {d.echeance && ` · échéance ${dateCourte(d.echeance)}`}
        </span>
        {enCours && peutClore && (
          <span style={{ marginLeft: "auto" }}>
            <CloreLaDecision niu={niu} identifiant={d.identifiant} libelle={d.libelle} motifMinimum={motifMinimum} />
          </span>
        )}
      </div>
      <p style={{ margin: "2px 0 0", font: "400 12.5px/1.5 var(--police-texte)" }}>{d.motif}</p>
      <p style={{ margin: "2px 0 0", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
        Décidée le {dateCourte(d.prise_le)} par {d.prise_par_nom}, sur un score de {Number(d.score.total)} pts (
        {LIBELLES_NIVEAU[d.score.niveau].toLowerCase()})
        {!enCours && d.close_le && ` · close le ${dateCourte(d.close_le)} par ${d.close_par_nom} : ${d.motif_de_cloture}`}
      </p>
    </article>
  );
}
