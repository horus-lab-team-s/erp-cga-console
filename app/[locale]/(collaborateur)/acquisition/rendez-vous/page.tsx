import type { Metadata } from "next";

import { Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { AgendaDuResponsable, BasculeDuCreneau, LigneDeRendezVous } from "@/app/components/rendez-vous/GestesRendezVous";
import { detient } from "@/app/lib/acces";
import { jourADouala } from "@/app/lib/heure-douala";
import { lireLAgenda, lireLesCreneauxLibres, lireLesRendezVous } from "@/app/lib/rendez-vous";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Rendez-vous de création · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les rendez-vous de création, et l'agenda qui les propose (9 novembre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POUR QUI : le responsable de la création (`QUALIFIER_PROSPECT`), qui qualifie ces
 * dossiers. Il part d'une proposition par défaut et FERME ce qui ne lui convient pas, un
 * créneau d'un clic, une journée ou une plage dans l'agenda. Il constate ensuite chaque
 * rendez-vous : honoré, manqué (la pénalité fixée par la direction devient due), annulé.
 *
 * Les heures sont celles de Douala.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function RendezVousDeCreation() {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PROSPECT")) {
    return <EcranReserve titre="Rendez-vous de création" permission="LIRE_PROSPECT" acces={acces} />;
  }
  const peutTenir = detient(acces, "QUALIFIER_PROSPECT");
  const [rendezVous, agenda, libres] = await Promise.all([
    lireLesRendezVous().catch(() => null),
    lireLAgenda().catch(() => null),
    lireLesCreneauxLibres().catch(() => null),
  ]);

  // Les créneaux des jours à venir : libres (à fermer) et fermés (à rouvrir), par jour.
  const parJour = new Map<string, { debut: string; ferme: boolean }[]>();
  // Les heures de l'agenda sont celles de Douala, sans fuseau : on écarte les jours passés.
  const aujourdhui = jourADouala();
  for (const debut of libres?.creneaux ?? []) {
    parJour.set(debut.slice(0, 10), [...(parJour.get(debut.slice(0, 10)) ?? []), { debut, ferme: false }]);
  }
  for (const debut of agenda?.agenda.creneaux_fermes ?? []) {
    if (debut.slice(0, 10) < aujourdhui) continue;
    parJour.set(debut.slice(0, 10), [...(parJour.get(debut.slice(0, 10)) ?? []), { debut, ferme: true }]);
  }
  const jours = [...parJour.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jour, c]) => [jour, c.sort((x, y) => x.debut.localeCompare(y.debut))] as const);
  const prevus = (rendezVous ?? []).filter((r) => r.rendez_vous.etat === "PREVU");
  const passes = (rendezVous ?? []).filter((r) => r.rendez_vous.etat !== "PREVU");

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Demandes entrantes", href: "/acquisition" }, { libelle: "Rendez-vous" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Rendez-vous de création</h1>
        </div>

        <Panneau
          titre={`À venir (${prevus.length})`}
          aide="Les clients qui ont préféré un rendez-vous à remplir le formulaire seuls. Après l'heure, constatez : honoré, manqué ou annulé."
        >
          {rendezVous === null ? (
            <p className="rdv__note" style={{ padding: "12px 16px" }}>
              La lecture des rendez-vous n&rsquo;a pas abouti.
            </p>
          ) : prevus.length === 0 ? (
            <p className="rdv__note" style={{ padding: "12px 16px" }}>
              Aucun rendez-vous prévu.
            </p>
          ) : (
            <ul className="rdv__liste">
              {prevus.map((r) => (
                <LigneDeRendezVous key={r.rendez_vous.identifiant} ligne={r} />
              ))}
            </ul>
          )}
        </Panneau>

        {peutTenir && (
          <Panneau
            titre="Créneaux proposés"
            aide="Ce que le site propose dans les jours qui viennent. Un clic ferme un créneau ; un créneau fermé (barré) se rouvre d'un clic. Les créneaux déjà pris n'apparaissent pas."
          >
            {jours.length === 0 ? (
              <p className="rdv__note" style={{ padding: "12px 16px" }}>
                Aucun créneau proposé : ouvrez des plages dans l&rsquo;agenda ci-dessous.
              </p>
            ) : (
              jours.map(([jour, creneaux]) => (
                <div key={jour} className="rdv__jour">
                  <strong>
                    {new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </strong>
                  {creneaux.map((c) => (
                    <BasculeDuCreneau key={c.debut} debut={c.debut} ferme={c.ferme} />
                  ))}
                </div>
              ))
            )}
          </Panneau>
        )}

        {peutTenir && agenda && (
          <Panneau titre="Agenda" aide="Les plages de chaque semaine, la durée d'un rendez-vous, les modes, et les jours fermés.">
            <AgendaDuResponsable agenda={agenda.agenda} parDefaut={agenda.par_defaut} />
          </Panneau>
        )}

        {passes.length > 0 && (
          <Panneau titre="Récents" aide="Les rendez-vous de la semaine écoulée, constatés.">
            <ul className="rdv__liste">
              {passes.map((r) => (
                <LigneDeRendezVous key={r.rendez_vous.identifiant} ligne={r} />
              ))}
            </ul>
          </Panneau>
        )}
      </div>
    </>
  );
}
