import type { Metadata } from "next";

import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { OuvrirUneMission } from "@/app/components/missions/GestesMission";
import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { lireMissions, type Mission } from "@/app/lib/missions";
import { LIBELLES_ETAT, LIBELLES_TYPE } from "@/app/lib/missions-etats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Prestations ponctuelles · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les missions des prestations ponctuelles (15 octobre 2026) : analyse et rédaction de contrats,
 * DSF ciblée. Ce qui suit la vente, jusqu'au livrable. Voir `routes_missions.py`.
 */
export default async function Missions() {
  const acces = await exigerAcces();
  if (!detient(acces, "TRAITER_MISSION") && !detient(acces, "VALIDER_MISSION")) {
    return <EcranReserve titre="Prestations ponctuelles" permission="TRAITER_MISSION" acces={acces} />;
  }
  let missions: Mission[] = [];
  let erreur: string | null = null;
  try {
    missions = await lireMissions();
  } catch (cause) {
    if (!(cause instanceof ErreurApi)) throw cause;
    erreur = cause.message;
  }
  const aDecider = (m: Mission) => m.propositions.filter((p) => p.decision === "EN_ATTENTE").length;
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Prestations ponctuelles" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Prestations ponctuelles</h1>
          <p>L&rsquo;agent propose, le juriste décide, un second valide : rien ne part au client sans eux.</p>
        </div>
        {detient(acces, "TRAITER_MISSION") && (
          <Panneau titre="Ouvrir une mission" aide="Depuis un dossier commercial payé, ou directement avec le nom du client.">
            <OuvrirUneMission />
          </Panneau>
        )}
        <Panneau titre="Les missions" aide={`${missions.length} mission${missions.length > 1 ? "s" : ""}`}>
          {erreur ? (
            <EtatErreur titre="Les missions ne se lisent pas" detail={erreur} />
          ) : missions.length === 0 ? (
            <EtatVide titre="Aucune mission" detail="Ouvrez la première ci-dessus." />
          ) : (
            <ul className="mission__liste">
              {missions.map((m) => (
                <li key={m.identifiant} data-etat={m.etat}>
                  <Link href={`/missions/${encodeURIComponent(m.identifiant)}`}>
                    <strong>{LIBELLES_TYPE[m.type]}</strong> · {m.client}
                  </Link>
                  <span>{m.objet}</span>
                  <span className="mission__etat">
                    {LIBELLES_ETAT[m.etat]}
                    {m.etat === "OUVERTE" && aDecider(m) > 0 ? ` · ${aDecider(m)} à décider` : ""}
                  </span>
                  <span className="mission__note">
                    {m.identifiant} · ouverte le {dateCourte(m.ouverte_le.slice(0, 10))}
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
