import type { Metadata } from "next";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { GenererLeRapport } from "@/app/components/pilotage/GestesRapport";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { lireLesRapportsMensuels, type ResumeDeRapport } from "@/app/lib/pilotage";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Rapports mensuels — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les rapports mensuels archivés (pas 106). Maquette « Pilotage direction », vue E.
 *
 * Chaque rapport est daté, figé et porte son empreinte ; la liste dit s'il est **intègre**,
 * c'est-à-dire si son contenu relu produit toujours l'empreinte écrite à la génération.
 * Regénérer un mois crée une version suivante, sans effacer celle qui a peut-être été
 * présentée au comité.
 */

function moisPrecedent(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

function libelleDuMois(mois: string) {
  return new Date(`${mois}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default async function RapportsMensuels() {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PILOTAGE") || !detient(acces, "LIRE_AUDIT")) {
    return <EcranReserve titre="Rapports mensuels" permission={detient(acces, "LIRE_PILOTAGE") ? "LIRE_AUDIT" : "LIRE_PILOTAGE"} acces={acces} />;
  }
  let rapports: ResumeDeRapport[] = [];
  let erreur: string | null = null;
  try {
    rapports = await lireLesRapportsMensuels();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Pilotage", href: "/pilotage" }, { libelle: "Rapports mensuels" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Qualité et rapport mensuel</h1>
          <p>La trace du pilotage exigible en cas de contrôle de l&rsquo;agrément : datée, archivée, et vérifiable.</p>
        </div>

        <Panneau titre="Générer" aide="Les sections reprennent exactement les chiffres des écrans, à la date du rapport">
          <GenererLeRapport moisParDefaut={moisPrecedent()} />
        </Panneau>

        <Panneau titre="Rapports archivés" aide="Les plus récents d'abord ; une regénération crée une version suivante">
          {erreur ? (
            <EtatErreur titre="Les rapports ne se lisent pas" detail={erreur} />
          ) : rapports.length === 0 ? (
            <EtatVide titre="Aucun rapport archivé" />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rapports.map((r) => (
                <li key={r.identifiant} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "10px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
                  <Link href={`/pilotage/rapports/${r.identifiant}`} style={{ flex: "1 1 200px", fontWeight: 600 }}>
                    {libelleDuMois(r.mois)} · version {r.version}
                  </Link>
                  <span style={{ color: r.integre ? "var(--success)" : "var(--danger)", fontWeight: 600, fontSize: 12 }}>
                    {r.integre ? "Intègre" : "Contenu altéré"}
                  </span>
                  <span style={{ flexBasis: "100%", fontSize: 12, color: "var(--ink-500)", overflowWrap: "anywhere" }}>
                    chiffres au {dateCourte(r.a_la_date)} · généré le {dateCourte(r.genere_le)} par {r.genere_par_nom} · empreinte{" "}
                    <code>{r.empreinte.slice(0, 16)}…</code>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panneau>
      </div>
    </>
  );
}
