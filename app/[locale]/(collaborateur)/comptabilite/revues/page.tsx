import type { Metadata } from "next";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { LIBELLES_STATUT_REVUE } from "@/app/lib/libelles-revue";
import { lireDossiers } from "@/app/lib/portefeuille";
import { lireLesRevues, type ResumeDeRevue } from "@/app/lib/revue";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Revue des dossiers — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les passages de relais entre comptable et réviseur (pas 102).
 * Maquettes « Parcours comptable », vue A (passages de relais) et « Parcours réviseur », vue D.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE PAGE, DEUX FILES, SELON QUI REGARDE
 *
 * * **À réviser** : les mois transmis, les plus anciens d'abord. C'est la file du réviseur ;
 *   le comptable y voit ce qu'il attend.
 * * **Revenus avec des remarques** : les mois renvoyés. C'est la file du comptable.
 * * **Validés** : l'histoire, repliée en bas.
 *
 * La page ne décide pas du rôle : chaque file est lisible par qui lit la comptabilité, et
 * les gestes, sur la revue elle-même, sont gardés par leurs permissions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function moisPrecedent(): string {
  const d = new Date();
  const precedent = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return precedent.toISOString().slice(0, 7);
}

export default async function Revues() {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Revue des dossiers" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  let revues: ResumeDeRevue[] = [];
  let erreur: string | null = null;
  try {
    revues = await lireLesRevues();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }
  const dossiers = await lireDossiers();
  const noms = new Map(dossiers.map((d) => [d.niu, d.denomination]));
  const file = (statut: string) => revues.filter((r) => r.statut === statut);
  const reviseur = detient(acces, "REVISER_DOSSIER");

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Revue des dossiers" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Revue des dossiers</h1>
          <p>
            {file("TRANSMISE").length} mois à réviser · {file("RENVOYEE").length} revenu{file("RENVOYEE").length > 1 ? "s" : ""} avec des
            remarques · {file("VALIDEE").length} validé{file("VALIDEE").length > 1 ? "s" : ""}
          </p>
        </div>

        {erreur ? (
          <EtatErreur titre="Les revues ne se lisent pas" detail={erreur} />
        ) : (
          <>
            <File
              titre={reviseur ? "À réviser" : "Chez le réviseur"}
              aide="Les plus anciens d'abord"
              revues={file("TRANSMISE")}
              noms={noms}
              vide="Aucun mois n'attend le réviseur."
            />
            <File
              titre="Revenus avec des remarques"
              aide="Répondre à chaque remarque, puis retransmettre"
              revues={file("RENVOYEE")}
              noms={noms}
              vide="Aucun mois renvoyé."
            />
            <File titre="Validés" aide="Le second regard est donné" revues={file("VALIDEE")} noms={noms} vide="Aucun mois validé." />
          </>
        )}

        {/* Pas 107 : un mois se transmet depuis sa clôture, qui montre d'abord les points de contrôle
            et le compte de ceux qui bloquent. Transmettre d'ici, sans les voir, c'est ce que ce pas retire. */}
        {detient(acces, "SAISIR_ECRITURE") && dossiers.length > 0 && (
          <Panneau titre="Transmettre un mois" aide="Depuis sa clôture : les points de contrôle d'abord, le verrou ensuite">
            <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)" }}>
              <Link href={`/comptabilite/cloture?mois=${moisPrecedent()}`}>Clôturer un mois</Link> : vérifier ses points de contrôle, puis le transmettre
              au réviseur, ce qui le verrouille.
            </p>
          </Panneau>
        )}
      </div>
    </>
  );
}

function File({
  titre,
  aide,
  revues,
  noms,
  vide,
}: {
  titre: string;
  aide: string;
  revues: ResumeDeRevue[];
  noms: Map<string, string>;
  vide: string;
}) {
  return (
    <Panneau titre={titre} aide={aide}>
      {revues.length === 0 ? (
        <EtatVide titre={vide} />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {revues.map((r) => {
            const statut = LIBELLES_STATUT_REVUE[r.statut];
            return (
              <li key={`${r.dossier}-${r.identifiant}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "10px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
                <Link href={`/comptabilite/revues/${r.identifiant}?dossier=${r.dossier}`} style={{ flex: "1 1 240px", fontWeight: 600 }}>
                  {noms.get(r.dossier) ?? r.dossier} · du {dateCourte(r.du)} au {dateCourte(r.au)}
                </Link>
                <span style={{ color: statut.couleur, fontWeight: 600, fontSize: 12 }}>{statut.libelle}</span>
                <span style={{ flexBasis: "100%", color: "var(--ink-500)", fontSize: 12 }}>
                  transmis par {r.transmise_par} · échantillon {r.echantillon} sur {r.ecritures_du_mois} écriture
                  {r.ecritures_du_mois > 1 ? "s" : ""}
                  {r.ouvertes + r.traitees + r.closes > 0 &&
                    ` · remarques : ${r.ouvertes} ouverte${r.ouvertes > 1 ? "s" : ""}, ${r.traitees} répondue${r.traitees > 1 ? "s" : ""}, ${r.closes} close${r.closes > 1 ? "s" : ""}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panneau>
  );
}
