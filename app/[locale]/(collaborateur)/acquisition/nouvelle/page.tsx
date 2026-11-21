import type { Metadata } from "next";

import { Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { NouvelleDemandeAuCabinet } from "@/app/components/rendez-vous/GestesRendezVous";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Nouvelle demande au cabinet · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * La demande d'un client venu au cabinet, saisie par le responsable (9 novembre 2026).
 *
 * « Le responsable de la création doit pouvoir saisir les informations des personnes de
 * façon manuelle. » La demande entre comme celle du site (doublon, code de dossier, frais),
 * avec l'origine `cabinet` ; il remplit ensuite la qualification depuis la fiche.
 */
export default async function NouvelleDemande() {
  const acces = await exigerAcces();
  if (!detient(acces, "QUALIFIER_PROSPECT")) {
    return <EcranReserve titre="Nouvelle demande au cabinet" permission="QUALIFIER_PROSPECT" acces={acces} />;
  }
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Demandes entrantes", href: "/acquisition" }, { libelle: "Nouvelle demande" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Nouvelle demande au cabinet</h1>
        </div>
        <Panneau
          titre="Le client"
          aide="Ses coordonnées et son accord. Les réponses du projet se saisissent ensuite dans la qualification de la fiche."
        >
          <NouvelleDemandeAuCabinet />
        </Panneau>
      </div>
    </>
  );
}
