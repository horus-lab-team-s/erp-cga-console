import type { Metadata } from "next";

import { EtatVide, Panneau } from "@/app/components/Tableau";
import { DetailDuCompte } from "@/app/components/comptabilite/DetailDuCompte";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { Link } from "@/i18n/navigation";
import { ErreurApi } from "@/app/lib/api";
import {
  exerciceCourant,
  lireGrandLivre,
  lirePlanComptable,
  type LigneGrandLivre,
} from "@/app/lib/comptabilite";
import { lireDossiers } from "@/app/lib/portefeuille";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Grand livre — Plateforme CGA" };

/**
 * E-E02 · Le grand livre d'un compte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST LA VUE PAR COMPTE DE CE QUE LE JOURNAL ENREGISTRE PAR DATE
 *
 * Et c'est le seul endroit où l'on voit ce qui reste réellement ouvert chez un
 * fournisseur. Le solde progressif est calculé par le backend : le recalculer
 * ici ferait deux vérités pour un même chiffre.
 *
 * UN COMPTE SANS MOUVEMENT REND 404, ET CE N'EST PAS UNE ERREUR
 *
 * L'écran le dit ainsi : « aucun mouvement » n'est pas « compte inexistant ».
 * Confondre les deux ferait chercher une panne là où il n'y a qu'un compte
 * inutilisé.
 * PAS 108 : LE MÊME DÉTAIL QU'À CÔTÉ DE LA BALANCE
 *
 * Le tableau et le lettrage sont ceux du panneau de la balance (`DetailDuCompte`) : deux
 * tableaux du même compte divergeraient au premier ajout de colonne. Cette page reste pour les
 * liens directs (la clôture mensuelle y mène) ; la balance l'ouvre désormais à côté d'elle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default async function GrandLivre({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; compte?: string; exercice?: string }>;
}) {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403, l'erreur remonte, et le
  // visiteur voit un 500 au lieu d'un refus lisible. Voir `EcranReserve`.
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Grand livre" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const { dossier, compte, exercice = exerciceCourant() } = await searchParams;
  const dossiers = await lireDossiers();
  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0]?.niu;

  if (!niu || !compte) {
    return (
      <>
        <EnteteTravail
          miettes={[
            { libelle: "Comptabilité", href: "/comptabilite" },
            { libelle: "Grand livre" },
          ]}
        />
        <div className="page-travail">
          <EtatVide
            titre="Choisir un compte"
            detail="Le grand livre s'ouvre depuis un numéro de compte de la balance."
          />
        </div>
      </>
    );
  }

  let lignes: LigneGrandLivre[] = [];
  let sansMouvement = false;
  const plan = await lirePlanComptable().catch(() => []);
  const auPlan = plan.find((c) => c.numero === compte);
  try {
    lignes = await lireGrandLivre(niu, compte, exercice);
  } catch (erreur) {
    // 404 ici veut dire « aucun mouvement », pas « compte inexistant ». Le
    // backend le dit dans son message ; l'écran ne doit pas le traduire en
    // panne.
    if (erreur instanceof ErreurApi && erreur.statut === 404) sansMouvement = true;
    else throw erreur;
  }

  const courant = dossiers.find((d) => d.niu === niu)!;

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Comptabilité", href: "/comptabilite" },
          { libelle: `Compte ${compte}` },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Compte {compte}</h1>
          <p>
            {courant.denomination} · exercice {exercice} ·{" "}
            <Link href={`/comptabilite?dossier=${niu}&exercice=${exercice}&compte=${compte}`}>
              ouvrir à côté de la balance
            </Link>
          </p>
        </div>

        <Panneau
          titre="Mouvements"
          aide="Dans l'ordre chronologique. Le solde progressif est calculé par le backend, jamais ici."
        >
          {sansMouvement || lignes.length === 0 ? (
            <EtatVide
              titre="Aucun mouvement"
              detail={`Le compte ${compte} n'a pas été mouvementé sur l'exercice ${exercice}. Ce n'est pas une erreur : vérifier le numéro avant de conclure.`}
            />
          ) : (
            <DetailDuCompte
              dossier={niu}
              exercice={exercice}
              compte={compte}
              lettrable={Boolean(auPlan?.lettrable)}
              peutLettrer={detient(acces, "SAISIR_ECRITURE")}
              lignes={lignes}
            />
          )}
        </Panneau>
      </div>
    </>
  );
}
