import type { Metadata } from "next";

import { Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { dateCourte } from "@/app/lib/formats";
import {
  LIBELLES_CATEGORIE,
  lireLesRetardsDuCommerce,
  lireLesRetardsDuPilotage,
  parResponsable,
  type Retard,
} from "@/app/lib/retards";
import { exigerAcces } from "@/app/lib/session";
import { lireLesExpirations } from "@/app/lib/documents-a-echeance";
import { tonDeLEcheance } from "@/app/lib/documents-a-echeance-etats";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Retards · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Les retards du cabinet, en rouge, avec leurs délais (lot 4, 9 novembre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Réunion du 4 novembre 2026, demandes 20 et 22 : « signaler les retards par un code couleur
 * (rouge), avec les délais, pour que le responsable repère tout de suite les dossiers en
 * souffrance », et suivre le travail de chaque gestionnaire.
 *
 * La direction voit tout le cabinet, regroupé par responsable ; chacun voit les siens.
 * ⚠️ Pas de note ni de classement des personnes : des retards de portefeuille, avec le lien
 * qui permet de les traiter. Une source qui ne répond pas n'efface pas l'autre.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Retards() {
  const acces = await exigerAcces();
  const autorise = ["LIRE_PILOTAGE", "SAISIR_ECRITURE", "SUIVRE_FORMALITE", "LIRE_PROSPECT", "ENCAISSER"].some(
    (p) => detient(acces, p as Parameters<typeof detient>[1]),
  );
  if (!autorise) {
    return <EcranReserve titre="Retards" permission="LIRE_PILOTAGE" acces={acces} />;
  }
  const [pilotage, commerce, expirations] = await Promise.all([
    lireLesRetardsDuPilotage().catch(() => null),
    lireLesRetardsDuCommerce().catch(() => null),
    // Lot 4 (9 novembre 2026) : ce qui expire au portefeuille, à côté de ce qui est en retard.
    lireLesExpirations().catch(() => null),
  ]);
  const retards: Retard[] = [...(pilotage?.retards ?? []), ...(commerce?.retards ?? [])].sort(
    (a, b) => b.jours_de_retard - a.jours_de_retard,
  );
  const direction = detient(acces, "LIRE_PILOTAGE");
  const parCategorie = new Map<string, number>();
  for (const r of retards) parCategorie.set(r.categorie, (parCategorie.get(r.categorie) ?? 0) + 1);

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Retards" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Retards</h1>
        </div>
        <p className="retards__resume">
          <strong className="retards__total" data-rouge={retards.length > 0 ? "oui" : "non"}>
            {retards.length === 0 ? "Aucun retard" : `${retards.length} retard${retards.length > 1 ? "s" : ""}`}
          </strong>
          {[...parCategorie.entries()].map(([c, n]) => (
            <span key={c} className="retards__pastille">
              {LIBELLES_CATEGORIE[c as Retard["categorie"]]} · {n}
            </span>
          ))}
        </p>
        {(pilotage === null || commerce === null) && (
          <p className="retards__note">
            Une partie des retards n&rsquo;a pas pu être lue
            {pilotage === null ? " (comptabilité, déclarations, création)" : " (commerce, rendez-vous, honoraires)"}.
          </p>
        )}

        {expirations && expirations.expirations.length > 0 && (
          <Panneau
            titre={`Expirations à venir · ${expirations.expirations.length}`}
            aide="Documents à échéance, adhésions et mandats datés : expirés depuis peu, ou qui expirent bientôt. L'adhérent en est prévenu par courriel aux paliers réglés par le cabinet."
          >
            <ul className="retards__liste">
              {expirations.expirations.map((e) => (
                <li key={`${e.dossier}-${e.objet}-${e.libelle}`} className="retards__ligne">
                  <span className="echeances__pastille" data-ton={tonDeLEcheance(e.jours_restants)}>
                    {e.jours_restants < 0 ? "Expiré" : e.jours_restants === 0 ? "Aujourd'hui" : `J-${e.jours_restants}`}
                  </span>
                  <span className="retards__categorie">{e.objet === "DOCUMENT" ? "Document" : e.objet === "ADHESION" ? "Adhésion" : "Mandat"}</span>
                  <span className="retards__objet">
                    <Link href={`/portefeuille/${e.dossier}`}>{e.denomination}</Link> · {e.libelle}
                    <span className="retards__echeance"> · le {dateCourte(e.expire_le)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panneau>
        )}

        {direction ? (
          parResponsable(retards).map((groupe) => (
            <Panneau
              key={groupe.nom}
              titre={`${groupe.nom} · ${groupe.retards.length} retard${groupe.retards.length > 1 ? "s" : ""}`}
              aide="Les retards du portefeuille de ce responsable, du plus ancien au plus récent."
            >
              <ListeDesRetards retards={groupe.retards} />
            </Panneau>
          ))
        ) : (
          <Panneau titre="Mes retards" aide="Ce qui devait être fait dans vos dossiers, et ne l'est pas encore.">
            <ListeDesRetards retards={retards} />
          </Panneau>
        )}
      </div>
    </>
  );
}

function ListeDesRetards({ retards }: { retards: Retard[] }) {
  if (retards.length === 0) {
    return <p className="retards__note retards__vide">Rien en retard.</p>;
  }
  return (
    <ul className="retards__liste">
      {retards.map((r, i) => (
        <li key={`${r.categorie}-${r.dossier}-${r.libelle}-${i}`} className="retards__ligne">
          <span className="retards__jours" title={`Dû le ${dateCourte(r.echeance)}`}>
            +{r.jours_de_retard} j
          </span>
          <span className="retards__categorie">{LIBELLES_CATEGORIE[r.categorie]}</span>
          <span className="retards__objet">
            <Link href={r.lien}>{r.denomination}</Link> · {r.libelle}
            <span className="retards__echeance"> · dû le {dateCourte(r.echeance)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
