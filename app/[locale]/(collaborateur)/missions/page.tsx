import type { Metadata } from "next";

import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { OuvrirDepuisUneDemande, OuvrirUneMission } from "@/app/components/missions/GestesMission";
import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { lireLesDemandesAOuvrir, lireMissions, type Mission } from "@/app/lib/missions";
import { LIBELLES_ETAT, LIBELLES_TYPE } from "@/app/lib/missions-etats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";
import { jourDuFait } from "@/app/lib/heure-douala";

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
  // 18 octobre 2026 (point 22) : les demandes ponctuelles payées n'attendent plus qu'on
  // recopie leur référence ; elles se présentent ici. Une panne ne cache pas les missions.
  const aOuvrir = detient(acces, "TRAITER_MISSION") ? await lireLesDemandesAOuvrir().catch(() => []) : [];
  const aDecider = (m: Mission) => m.propositions.filter((p) => p.decision === "EN_ATTENTE").length;
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Prestations ponctuelles" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Prestations ponctuelles</h1>
          <p>L&rsquo;agent propose, le juriste décide, un second valide : rien ne part au client sans eux.</p>
        </div>
        {aOuvrir.length > 0 && (
          <Panneau
            titre={`${aOuvrir.length} demande${aOuvrir.length > 1 ? "s" : ""} payée${aOuvrir.length > 1 ? "s" : ""}, à ouvrir`}
            aide="Venues de la vitrine, chiffrées et réglées : il reste à choisir la prestation. Le client reçoit un courriel à l'ouverture."
          >
            <ul className="mission__liste">
              {aOuvrir.map((d) => (
                <li key={d.reference}>
                  <strong>{d.client}</strong>
                  <span>
                    {d.reference} · {d.telephone}
                    {d.courriel ? ` · ${d.courriel}` : ""}
                    {d.payee_le ? ` · payée le ${dateCourte(jourDuFait(d.payee_le))}` : ""}
                  </span>
                  {d.message && <span className="mission__note">« {d.message} »</span>}
                  <OuvrirDepuisUneDemande demande={d} />
                </li>
              ))}
            </ul>
          </Panneau>
        )}
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
                    {m.identifiant} · ouverte le {dateCourte(jourDuFait(m.ouverte_le))}
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
