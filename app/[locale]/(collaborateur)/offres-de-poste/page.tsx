import type { Metadata } from "next";

import { EtatErreur, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { OffresDePoste } from "@/app/components/recrutement/OffresDePoste";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireLesCandidatures, lireLesOffresDuCabinet } from "@/app/lib/recrutement";
import type { Candidature, OffreDuCabinet } from "@/app/lib/recrutement-etats";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Offres de poste · Plateforme CGA" };

/**
 * Les offres de poste du cabinet (16 octobre 2026). Rédigées ici au mini-éditeur, publiées
 * sur le site, où le candidat lit les qualifications avant de postuler avec son CV.
 */
export default async function PageOffresDePoste() {
  const acces = await exigerAcces();
  // 18 octobre 2026 (point 25) : qui recrute rédige aussi les offres ; seul lui lit les CV.
  const recrute = detient(acces, "GERER_RECRUTEMENT");
  if (!detient(acces, "EDITER_VITRINE") && !recrute) {
    return <EcranReserve titre="Offres de poste" permission="EDITER_VITRINE" acces={acces} />;
  }
  let offres: OffreDuCabinet[] = [];
  let erreur: string | null = null;
  const candidatures: Record<string, Candidature[]> = {};
  try {
    offres = await lireLesOffresDuCabinet();
    await Promise.all(
      offres
        .filter((o) => recrute && o.candidatures > 0)
        .map(async (o) => {
          candidatures[o.offre.identifiant] = await lireLesCandidatures(o.offre.identifiant);
        }),
    );
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }
  const publiees = offres.filter((o) => o.offre.etat === "PUBLIEE").length;

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Offres de poste" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Offres de poste</h1>
          <p>
            {offres.length} offre{offres.length > 1 ? "s" : ""} · {publiees} sur le site · les qualifications se
            rédigent au mini-éditeur, le candidat les lit avant de postuler
          </p>
        </div>
        {erreur ? (
          <EtatErreur titre="Offres indisponibles" detail={erreur} />
        ) : (
          <Panneau titre="Les offres du cabinet" aide="Brouillon, publiée sur le site, puis close.">
            <OffresDePoste offres={offres} candidatures={candidatures} />
          </Panneau>
        )}
      </div>
    </>
  );
}
