import type { Metadata } from "next";

import { ClasserLaDemande, RattacherLaPiece, TracerLaRelance } from "@/app/components/collecte/GestesDemandes";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EtatVide, Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { LIBELLES_CANAL,
  SENS_DES_REPONSES, lireDemandes, lireRelancesDePieces } from "@/app/lib/collecte";
import { ErreurApi } from "@/app/lib/api";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Pièces attendues — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les pièces que le cabinet attend de ses adhérents (pas 74).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CET ÉCRAN EXISTE
 *
 * Le domaine des demandes disait « le cabinet ne peut relancer que ce qu'il sait
 * attendre » et « une relance non tracée n'a pas eu lieu ». Rien ne montrait les
 * demandes, rien ne les fermait, rien ne traçait les relances. Une pièce reçue
 * laissait sa demande ouverte : l'adhérent aurait été relancé pour ce qu'il avait
 * déjà envoyé.
 *
 * ⚠️ CHAQUE GESTE APPARAÎT POUR QUI PEUT LE FAIRE
 *
 * Rattacher une pièce : `IDENTIFIER_PIECE`. Tracer une relance et classer :
 * `RELANCER_ADHERENT`. Le backend vérifie aussi le dossier de chaque demande.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PiecesAttendues() {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PIECE")) {
    return <EcranReserve titre="Pièces attendues" permission="LIRE_PIECE" acces={acces} />;
  }
  const demandes = await lireDemandes();
  const rattache = detient(acces, "IDENTIFIER_PIECE");
  const relance = detient(acces, "RELANCER_ADHERENT");
  // Pas 88 : la liste de travail du jour du chargé de clientèle. Lue seulement avec la
  // permission : la route la refuse aux autres, et un refus ne doit pas faire tomber l'écran.
  const relancesDuJour = relance
    ? await lireRelancesDePieces().catch((e: unknown) => (e instanceof ErreurApi ? e.message : Promise.reject(e)))
    : null;
  const texte: React.CSSProperties = { margin: 0, font: "400 12.5px/1.5 var(--police-texte)" };

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Flux entrant", href: "/pieces" }, { libelle: "Pièces attendues" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Pièces attendues</h1>
          <p>
            {demandes.length} demande{demandes.length > 1 ? "s" : ""} ouverte{demandes.length > 1 ? "s" : ""} ·{" "}
            <Link href="/pieces">boîte de réception</Link>
            {/* Pas 111 : ce qui manque se déduit, et se demande en un message. */}
            {detient(acces, "RELANCER_PIECES") && (
              <>
                {" · "}
                <Link href="/pieces/relancer">relancer un adhérent</Link>
              </>
            )}
          </p>
        </div>
        {relancesDuJour !== null && (
          <Panneau
            titre="Relances à émettre aujourd'hui"
            aide="Jalons J+7, J+15 et J+30 après la demande. Au-delà, ce n'est plus un oubli : l'escalade revient au responsable du portefeuille."
          >
            {typeof relancesDuJour === "string" ? (
              <EtatVide titre="Les relances ne se lisent pas" detail={relancesDuJour} />
            ) : relancesDuJour.length === 0 ? (
              <EtatVide titre="Aucune relance aujourd'hui" detail="Aucune demande ouverte ne tombe sur un jalon ce jour." />
            ) : (
              relancesDuJour.map((r) => (
                <p key={`${r.demande.identifiant}-${r.jalon}`} style={{ ...texte, padding: "8px 14px", borderBottom: "1px solid var(--line-100)" }}>
                  <strong>J+{r.jalon}</strong> · {r.demande.identifiant} · {r.demande.entreprise} · {r.demande.motif} · par{" "}
                  {LIBELLES_CANAL[r.canal]}
                  {r.escalade && <span style={{ color: "var(--danger)", fontWeight: 600 }}> · escalade au responsable</span>}
                  {" · "}
                  <a href={`#${r.demande.identifiant}`}>tracer la relance</a>
                </p>
              ))
            )}
          </Panneau>
        )}

        <Panneau
          titre="Demandes ouvertes"
          aide="Une demande satisfaite ne se relance jamais : rattachez la pièce dès qu'elle arrive."
        >
          {demandes.length === 0 ? (
            <EtatVide titre="Rien n'est attendu" detail="Aucune demande de pièce ouverte sur votre portefeuille." />
          ) : (
            demandes.map((d) => (
              <article key={d.identifiant} id={d.identifiant} style={{ borderBottom: "1px solid var(--line-100)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <header style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ font: "600 13px/1.3 var(--police-texte)" }}>{d.identifiant}</strong>
                  <span style={{ ...texte, color: "var(--ink-500)" }}>
                    {d.entreprise} · demandée le {d.demandee_le.split("-").reverse().join("/")}
                    {d.attendue_pour && ` · attendue pour le ${d.attendue_pour.split("-").reverse().join("/")}`}
                  </span>
                  {d.bloquante && <span style={{ ...texte, color: "var(--danger)", fontWeight: 600 }}>bloquante</span>}
                </header>
                <p style={texte}>{d.motif}</p>
                {d.piece_a_rectifier && (
                  <p style={{ ...texte, color: "var(--ink-500)" }}>Rectifie la pièce {d.piece_a_rectifier}</p>
                )}
                {d.reponses.map((r) => (
                  <p key={r.le} style={{ ...texte, color: "var(--success)" }}>
                    Le {r.le.slice(0, 10).split("-").reverse().join("/")}, l&rsquo;adhérent {SENS_DES_REPONSES[r.nature]}
                    {r.annoncee_pour && ` (annoncée pour le ${r.annoncee_pour.split("-").reverse().join("/")})`}
                    {r.message && ` : « ${r.message} »`}
                  </p>
                ))}
                <p style={{ ...texte, color: "var(--ink-500)" }}>
                  {d.relances.length === 0
                    ? "Aucune relance tracée."
                    : `Relances tracées : ${d.relances.map(([jour, canal]) => `${jour.split("-").reverse().join("/")} (${LIBELLES_CANAL[canal]})`).join(", ")}.`}
                </p>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {rattache && <RattacherLaPiece demande={d.identifiant} />}
                  {relance && <TracerLaRelance demande={d.identifiant} />}
                  {relance && <ClasserLaDemande demande={d.identifiant} />}
                  {!rattache && !relance && (
                    <span style={{ ...texte, color: "var(--ink-500)" }}>Lecture seule pour votre rôle.</span>
                  )}
                </div>
              </article>
            ))
          )}
        </Panneau>
      </div>
    </>
  );
}
