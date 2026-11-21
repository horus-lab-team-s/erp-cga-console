import type { Metadata } from "next";

import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { DocumentDeLaPiece } from "@/app/components/creation/DocumentDeLaPiece";
import {
  AjouterUnPoint,
  CahierDeRedaction,
  LireAvecLAgent,
  PointAInstruire,
  ReaffecterLaMission,
  Soumettre,
  ValiderOuRenvoyer,
} from "@/app/components/missions/GestesMission";
import { EtatErreur, Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { lireLeDocumentDeLaMission } from "@/app/lib/actions-missions";
import { ErreurApi } from "@/app/lib/api";
import {
  lectureAutomatiqueDisponible,
  lireLesCandidatsALaMission,
  lireLesModelesDeContrat,
  lireMission,
  type Mission,
} from "@/app/lib/missions";
import { LIBELLES_ETAT, LIBELLES_TYPE, type ModeleDeContrat } from "@/app/lib/missions-etats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Mission · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Une mission : le document à gauche, les points à décider à droite (15 octobre 2026).
 *
 * ⚠️ L'agent PROPOSE : chaque point entre « à décider ». Le juriste le retient, le reformule ou
 * l'écarte avec un motif ; la mission ne se soumet pas tant qu'un point attend, et un autre la
 * valide. Le livrable ne porte que ce qui a été retenu, dans les mots du juriste.
 */
export default async function PageMission({ params }: { params: Promise<{ identifiant: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "TRAITER_MISSION") && !detient(acces, "VALIDER_MISSION")) {
    return <EcranReserve titre="Mission" permission="TRAITER_MISSION" acces={acces} />;
  }
  const { identifiant } = await params;
  let mission: Mission;
  let disponible = false;
  let modeles: ModeleDeContrat[] = [];
  try {
    mission = await lireMission(identifiant);
    if (mission.type === "REDACTION_CONTRAT" && detient(acces, "TRAITER_MISSION"))
      modeles = await lireLesModelesDeContrat();
    // Seul le juriste lance l'agent : la question n'est posée que pour lui (le valideur
    // recevait un refus, et la page entière tombait).
    if (detient(acces, "TRAITER_MISSION")) disponible = await lectureAutomatiqueDisponible();
  } catch (cause) {
    if (!(cause instanceof ErreurApi)) throw cause;
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Prestations ponctuelles", href: "/missions" }, { libelle: identifiant }]} />
        <div className="page-travail">
          <EtatErreur titre="La mission ne se lit pas" detail={cause.message} />
        </div>
      </>
    );
  }
  // Les gestes d'instruction au seul juriste ; le valideur lit, valide ou renvoie.
  const ouverte = mission.etat === "OUVERTE" && detient(acces, "TRAITER_MISSION");
  const enAttente = mission.propositions.filter((p) => p.decision === "EN_ATTENTE").length;
  // 18 octobre 2026 (point 22) : qui affecte les dossiers peut confier la mission à un autre.
  const candidats =
    mission.etat !== "LIVREE" && detient(acces, "AFFECTER_DOSSIER")
      ? await lireLesCandidatsALaMission(mission.identifiant).catch(() => [])
      : [];
  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Prestations ponctuelles", href: "/missions" }, { libelle: `${LIBELLES_TYPE[mission.type]} · ${mission.client}` }]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>
            {LIBELLES_TYPE[mission.type]} · {mission.client}
          </h1>
          <p>
            {mission.objet} · {mission.identifiant} · <strong>{LIBELLES_ETAT[mission.etat]}</strong>
          </p>
        </div>
        {candidats.length > 0 && (
          <details className="lecture-depot__cadre">
            <summary>Confier la mission à un autre collaborateur</summary>
            <ReaffecterLaMission identifiant={mission.identifiant} candidats={candidats} actuel={mission.responsable} />
          </details>
        )}
        {mission.renvoi && ouverte && (
          <p role="status" className="avertissement-ecran avertissement-ecran--reserve">
            Renvoyée par le second regard : {mission.renvoi}
          </p>
        )}
        <div className="lecture-page">
          <section className="lecture-page__document" aria-label="Le document">
            {mission.document_empreinte ? (
              <DocumentDeLaPiece
                champs={{ mission: mission.identifiant }}
                libelle={mission.document_nom ?? "le document"}
                lire={lireLeDocumentDeLaMission}
                ouvrirDesLeDebut
              />
            ) : (
              <p className="mission__note">Aucun document versé à cette mission.</p>
            )}
          </section>
          <section className="lecture-page__facture" aria-label="L'analyse">
            {ouverte && mission.type === "ANALYSE_CONTRAT" && mission.document_empreinte && (
              <LireAvecLAgent mission={mission.identifiant} disponible={disponible} />
            )}
            {mission.type === "REDACTION_CONTRAT" && (
              <Panneau titre="Cahier de rédaction" aide="Ce que le contrat doit dire : l'agent rédige d'après lui, le juriste décide de chaque article.">
                <CahierDeRedaction
                  mission={mission.identifiant}
                  typeDeContrat={mission.type_de_contrat}
                  cahier={mission.cahier}
                  disponible={disponible}
                  modifiable={ouverte}
                  modeles={modeles}
                  modeleVerse={mission.propositions.some((p) => p.origine === "MODELE")}
                />
              </Panneau>
            )}
            {mission.type === "DSF_CIBLEE" && mission.dossier_niu && (
              <p className="mission__agent">
                <span className="mission__note">
                  La DSF de l&rsquo;exercice {mission.exercice} se prépare, se valide et se dépose dans son parcours.
                  Notez ici vos constats et recommandations au client.
                </span>
                <Link className="bouton-discret" href={`/cloture?dossier=${encodeURIComponent(mission.dossier_niu)}&exercice=${encodeURIComponent(mission.exercice ?? "")}`}>
                  Ouvrir la DSF {mission.exercice} du dossier →
                </Link>
              </p>
            )}
            <Panneau titre="Les points" aide={`${mission.propositions.length} point${mission.propositions.length > 1 ? "s" : ""} · ${enAttente} à décider`}>
              <ul className="mission__points">
                {mission.propositions.map((p) => (
                  <PointAInstruire key={p.rang} mission={mission.identifiant} type={mission.type} point={p} modifiable={ouverte} />
                ))}
              </ul>
              {ouverte && (
                <div className="mission__pied">
                  <AjouterUnPoint mission={mission.identifiant} type={mission.type} />
                </div>
              )}
            </Panneau>
            {ouverte && mission.propositions.length > 0 && <Soumettre mission={mission.identifiant} enAttente={enAttente} />}
            {mission.etat === "A_VALIDER" && detient(acces, "VALIDER_MISSION") && <ValiderOuRenvoyer mission={mission.identifiant} />}
            {mission.propositions.some((p) => p.decision === "RETENUE" || p.decision === "MODIFIEE") && (
              <p className="mission__pied">
                <a
                  className="bouton-discret"
                  href={`/api/missions/${encodeURIComponent(mission.identifiant)}/livrable`}
                  target="_blank"
                  rel="noopener"
                >
                  {mission.etat === "LIVREE" ? "Le livrable (PDF) ↗" : "Aperçu du livrable, en projet (PDF) ↗"}
                </a>
                {/* 18 octobre 2026 (point 23) : le projet de contrat, à retoucher avec les parties. */}
                {mission.type === "REDACTION_CONTRAT" && (
                  <a className="bouton-discret" href={`/api/missions/${encodeURIComponent(mission.identifiant)}/word`}>
                    {mission.etat === "LIVREE" ? "Le contrat en Word (.docx)" : "Le projet en Word (.docx)"}
                  </a>
                )}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
