import type { Metadata } from "next";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import {
  RegistreDesImmobilisations,
  TableauDesAmortissements,
} from "@/app/components/comptabilite/RegistreDesImmobilisations";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { lireLeRegistre, lireLeTableau, type Immobilisation, type TableauEtDotation } from "@/app/lib/immobilisations";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Immobilisations · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Le registre des immobilisations et le tableau des amortissements (17 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Une fiche par bien ; la dotation de l'exercice se calcule (linéaire, prorata des jours)
 * et se passe en écriture au journal OD, en brouillon, à valider comme toute écriture. Le
 * tableau de l'exercice est la pièce n° 7 de la DSF normale (Note 3C) : la plateforme le
 * produit en Excel. Le contrôle avec la balance dit si un bien comptabilisé manque au
 * registre. Rien ne se calcule ici : tout vient du backend.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Immobilisations({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; exercice?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Immobilisations" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const { dossier, exercice: demande } = await searchParams;
  const exercice = demande && /^\d{4}$/.test(demande) ? demande : exerciceCourant();
  const dossiers = await lireDossiers();
  const miettes = [{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Immobilisations" }];
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatVide
            titre="Aucun dossier"
            detail="Aucun dossier ne vous est affecté : il n'y a pas de registre à afficher."
          />
        </div>
      </>
    );
  }
  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;
  const peutSaisir = detient(acces, "SAISIR_ECRITURE");

  let fiches: Immobilisation[] = [];
  let tableau: TableauEtDotation | null = null;
  let erreur: string | null = null;
  let erreurTableau: string | null = null;
  try {
    fiches = await lireLeRegistre(niu);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }
  try {
    tableau = await lireLeTableau(niu, exercice);
  } catch (cause) {
    erreurTableau = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  return (
    <>
      <EnteteTravail miettes={miettes} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Immobilisations</h1>
          <p>
            {courant.denomination} · NIU {niu} · exercice {exercice}
            {dossiers.length > 1 && " · changez de dossier dans la barre latérale"}
          </p>
        </div>

        <Panneau
          titre={`Tableau des amortissements ${exercice}`}
          aide="Pièce n° 7 de la DSF normale (Note 3C), produite depuis le registre"
        >
          {erreurTableau || !tableau ? (
            <EtatErreur titre="Le tableau ne se lit pas" detail={erreurTableau ?? ""} />
          ) : (
            <TableauDesAmortissements dossier={niu} exercice={exercice} donnees={tableau} peutSaisir={peutSaisir} />
          )}
        </Panneau>

        <Panneau
          titre="Registre des immobilisations"
          aide="Un bien par fiche ; un bien cédé ou saisi par erreur se sort, il ne s'efface pas"
        >
          {erreur ? (
            <EtatErreur titre="Le registre ne se lit pas" detail={erreur} />
          ) : (
            <RegistreDesImmobilisations dossier={niu} fiches={fiches} peutSaisir={peutSaisir} />
          )}
        </Panneau>
      </div>
    </>
  );
}
