import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Montant } from "@/app/components/Montant";
import { EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ImprimerLeRapport } from "@/app/components/pilotage/GestesRapport";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { LIBELLES_NIVEAU, lireLeRapportMensuel, type RapportMensuel } from "@/app/lib/pilotage";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Rapport mensuel — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Un rapport mensuel archivé (pas 106).
 *
 * ⚠️ RIEN N'EST RECALCULÉ ICI
 *
 * L'écran lit le document **figé** au moment de la génération et l'affiche tel quel. Il ne
 * rappelle aucune route de pilotage ou de conformité : un rapport de juillet relu en décembre
 * doit montrer ce que la direction a vu en juillet. Seule l'intégrité est vérifiée à la
 * lecture, par le backend.
 *
 * L'export PDF est l'impression du navigateur ; la coquille disparaît à l'impression.
 * « Envoyer au comité » n'est pas construit : le cabinet n'a pas encore désigné de destinataire.
 */

const texte: React.CSSProperties = { margin: 0, font: "400 13px/1.55 var(--police-texte)" };
const ligne: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "2px 12px", padding: "7px 16px", borderBottom: "1px solid var(--line-100)", font: "400 12.5px/1.45 var(--police-texte)" };

export default async function Rapport({ params }: { params: Promise<{ identifiant: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PILOTAGE") || !detient(acces, "LIRE_AUDIT")) {
    return <EcranReserve titre="Rapport mensuel" permission="LIRE_PILOTAGE" acces={acces} />;
  }
  const { identifiant } = await params;
  let r: RapportMensuel;
  try {
    r = await lireLeRapportMensuel(identifiant);
  } catch (cause) {
    if (cause instanceof ErreurApi && cause.statut === 404) notFound();
    throw cause;
  }
  const mois = new Date(`${r.mois}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const { RISQUE, CHARGE, DEROGATIONS, QUALITE_DES_REGLES, DECISIONS } = r.sections;

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Pilotage", href: "/pilotage" }, { libelle: "Rapports mensuels", href: "/pilotage/rapports" }, { libelle: `${r.mois} · v${r.version}` }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Rapport mensuel · {mois}</h1>
          <p>
            {r.agrement} · version {r.version} · chiffres au {dateCourte(r.a_la_date)} · généré le {dateCourte(r.genere_le)} par {r.genere_par_nom}
          </p>
        </div>

        <div
          className="avertissement-ecran"
          role="status"
          style={r.integre ? { borderColor: "var(--success)", background: "var(--success-100)", color: "var(--ink-900)" } : undefined}
        >
          <span style={{ display: "block" }}>
            <strong style={{ display: "inline", fontWeight: 600 }}>{r.integre ? "Rapport intègre." : "Contenu altéré depuis la génération."}</strong>{" "}
            Empreinte SHA-256 <code style={{ overflowWrap: "anywhere" }}>{r.empreinte}</code>, inscrite au journal d&rsquo;audit.
          </span>
          <span style={{ display: "block", marginTop: 4 }}>{r.engagement}</span>
        </div>

        <div className="sans-impression">
          <ImprimerLeRapport />
        </div>

        {RISQUE && (
          <Panneau titre="Risque du portefeuille" aide="Le tableau de bord de la direction, à la date du rapport">
            <p style={{ ...texte, padding: "10px 16px" }}>
              {RISQUE.dossiers} dossiers · {RISQUE.a_risque_eleve} à traiter · {RISQUE.a_risque_modere} à surveiller
              {RISQUE.poids_non_arretes && " · pondération non arrêtée par la direction"}
            </p>
            {RISQUE.risques.slice(0, 10).map((l) => (
              <div key={l.entreprise} style={ligne}>
                <strong style={{ flex: "1 1 200px" }}>{l.denomination}</strong>
                <span>{LIBELLES_NIVEAU[l.niveau]}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{Number(l.total)} pts</span>
              </div>
            ))}
          </Panneau>
        )}

        {CHARGE && (
          <Panneau titre="Charge et production" aide="La répartition du travail ; ceci n'évalue personne">
            {CHARGE.collaborateurs.map((c) => (
              <div key={c.habilitation} style={ligne}>
                <strong style={{ flex: "1 1 180px" }}>{c.nom}</strong>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.charge === null ? `${c.points} points` : `${c.charge} %`}</span>
                <span style={{ flexBasis: "100%", color: "var(--ink-500)" }}>
                  {c.dossiers} dossiers · {c.pieces_en_attente} pièces en attente · {c.retards} retards · {c.ecritures_du_mois} écritures validées
                </span>
              </div>
            ))}
            <p style={{ ...texte, padding: "8px 16px", color: "var(--ink-500)" }}>
              {CHARGE.propositions.length} réaffectation{CHARGE.propositions.length > 1 ? "s" : ""} proposée{CHARGE.propositions.length > 1 ? "s" : ""} à la date du rapport.
            </p>
          </Panneau>
        )}

        {DEROGATIONS && (
          <Panneau titre="Dérogations du mois" aide="Les décisions qui engagent la signature du centre">
            <p style={{ ...texte, padding: "10px 16px" }}>
              {DEROGATIONS.total} dérogation{DEROGATIONS.total > 1 ? "s" : ""}, dont {DEROGATIONS.effectives} effective
              {DEROGATIONS.effectives > 1 ? "s" : ""} · enjeu fiscal levé <Montant valeur={DEROGATIONS.enjeu_leve} avecDevise />
            </p>
            {DEROGATIONS.derogations.length === 0 ? (
              <EtatVide titre="Aucune dérogation ce mois" />
            ) : (
              DEROGATIONS.derogations.map((d) => (
                <div key={d.identifiant} style={ligne}>
                  <strong>{d.code_regle}</strong>
                  <span style={{ flex: "1 1 160px" }}>
                    {d.reference_document} · {d.dossier}
                  </span>
                  <span>{d.statut}</span>
                  <span style={{ flexBasis: "100%", color: "var(--ink-500)" }}>
                    {dateCourte(d.propose_le)} · {DEROGATIONS.auteurs[d.propose_par] ?? d.propose_par} : {d.motif}
                  </span>
                </div>
              ))
            )}
          </Panneau>
        )}

        {QUALITE_DES_REGLES && (
          <Panneau titre="Qualité des règles" aide="Constats et écarts du mois">
            <p style={{ ...texte, padding: "10px 16px" }}>
              {QUALITE_DES_REGLES.pieces_controlees} pièces contrôlées · {QUALITE_DES_REGLES.constats} constats · {QUALITE_DES_REGLES.ecartes} écartés
              {QUALITE_DES_REGLES.taux_global !== null && ` · taux d'écartement ${Math.round(QUALITE_DES_REGLES.taux_global * 100)} %`}
            </p>
            {QUALITE_DES_REGLES.regles
              .filter((q) => q.constats > 0)
              .map((q) => (
                <div key={q.code} style={ligne}>
                  <strong>{q.code}</strong>
                  <span style={{ flex: "1 1 200px" }}>{q.libelle}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {q.ecartes} / {q.constats}
                  </span>
                </div>
              ))}
          </Panneau>
        )}

        {DECISIONS && (
          <Panneau titre="Décisions de la direction" aide="Prises dans le mois">
            {DECISIONS.decisions.length === 0 ? (
              <EtatVide titre="Aucune décision ce mois" />
            ) : (
              DECISIONS.decisions.map((d) => (
                <div key={d.identifiant} style={ligne}>
                  <strong style={{ flex: "1 1 200px" }}>{d.libelle}</strong>
                  <span>{d.dossier}</span>
                  <span style={{ flexBasis: "100%", color: "var(--ink-500)" }}>
                    {dateCourte(d.prise_le)} · {d.prise_par_nom} · {d.motif}
                  </span>
                </div>
              ))
            )}
          </Panneau>
        )}
      </div>
    </>
  );
}
