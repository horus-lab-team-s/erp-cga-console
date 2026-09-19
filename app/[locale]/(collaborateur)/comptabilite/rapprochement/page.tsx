import type { Metadata } from "next";

import { Montant } from "@/app/components/Montant";
import { Cellule, EnteteTableau, EtatErreur, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import { ImporterUnReleve } from "@/app/components/comptabilite/GestesRapprochement";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireJournaux } from "@/app/lib/comptabilite";
import { dateCourte } from "@/app/lib/formats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { lireProfilsDeReleve, lireRapprochements, type ResumeDeRapprochement } from "@/app/lib/rapprochement";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Rapprochement bancaire — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Rapprochement bancaire, la liste des relevés d'un dossier (pas 101).
 * Maquette « Parcours comptable », vue B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA PAGE MONTRE D'ABORD : CE QUI RESTE À FAIRE
 *
 * Pour chaque relevé importé : sa période, son état, le nombre de lignes qui résistent
 * et l'écart inexpliqué. Un relevé arrêté ne bouge plus ; un relevé abandonné reste
 * visible, pour qu'on sache pourquoi une période a été importée deux fois.
 *
 * L'import vient ensuite : un fichier exporté par la banque, lu selon un format déclaré au
 * référentiel, et deux soldes recopiés du relevé qui permettent de refuser un fichier
 * incomplet.
 *
 * ⚠️ Pas de PDF, et c'est assumé : lire un relevé PDF, c'est de la reconnaissance de
 * texte, dont les erreurs de lecture se chercheraient ensuite dans la comptabilité.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "periode", libelle: "Période", largeur: "minmax(0, 1.4fr)" },
  { cle: "journal", libelle: "Compte", largeur: "110px" },
  { cle: "statut", libelle: "État", largeur: "120px" },
  { cle: "reste", libelle: "À traiter", largeur: "110px", aDroite: true },
  { cle: "ecart", libelle: "Écart inexpliqué", largeur: "150px", aDroite: true },
];

const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  EN_COURS: { libelle: "En cours", couleur: "var(--warning)" },
  VALIDE: { libelle: "Arrêté", couleur: "var(--success)" },
  ABANDONNE: { libelle: "Abandonné", couleur: "var(--ink-400)" },
};

function moisPrecedent(): { du: string; au: string } {
  const aujourdhui = new Date();
  const debut = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth() - 1, 1));
  const fin = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth(), 0));
  return { du: debut.toISOString().slice(0, 10), au: fin.toISOString().slice(0, 10) };
}

export default async function Rapprochements({ searchParams }: { searchParams: Promise<{ dossier?: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Rapprochement bancaire" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const { dossier } = await searchParams;
  const dossiers = await lireDossiers();
  const miettes = [{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Rapprochement bancaire" }];
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier" detail="Aucun dossier ne vous est affecté : il n'y a rien à rapprocher." />
        </div>
      </>
    );
  }
  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;

  let resumes: ResumeDeRapprochement[] = [];
  let erreur: string | null = null;
  try {
    resumes = await lireRapprochements(niu);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }
  const peutImporter = detient(acces, "SAISIR_ECRITURE");
  const [journaux, profils] = peutImporter ? await Promise.all([lireJournaux(), lireProfilsDeReleve()]) : [[], []];
  const periode = moisPrecedent();

  return (
    <>
      <EnteteTravail miettes={miettes} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Rapprochement bancaire</h1>
          <p>
            {courant.denomination} · NIU {niu}
            {dossiers.length > 1 && " · changez de dossier dans la barre latérale"}
          </p>
        </div>

        <Panneau titre="Relevés importés" aide="Les plus récents d'abord ; ce qui reste à traiter et l'écart, en un coup d'œil">
          {erreur ? (
            <EtatErreur titre="Les relevés ne se lisent pas" detail={erreur} />
          ) : resumes.length === 0 ? (
            <EtatVide titre="Aucun relevé importé" detail="Importez le relevé du mois : ce qui correspond sans doute possible se rapproche seul." />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES} />
              {resumes.map((r, rang) => (
                <LigneTableau key={r.identifiant} colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"}>
                  <Cellule gras>
                    <Link href={`/comptabilite/rapprochement/${r.identifiant}?dossier=${niu}`}>
                      du {dateCourte(r.du)} au {dateCourte(r.au)}
                    </Link>
                  </Cellule>
                  <Cellule tabulaire couleur="var(--ink-500)">
                    {r.journal} · {r.compte}
                  </Cellule>
                  <Cellule couleur={STATUTS[r.statut]?.couleur}>{STATUTS[r.statut]?.libelle ?? r.statut}</Cellule>
                  <Cellule aDroite tabulaire>
                    {r.statut === "ABANDONNE" ? "—" : `${r.a_traiter} / ${r.lignes}`}
                  </Cellule>
                  <Cellule aDroite tabulaire>
                    {r.statut === "ABANDONNE" ? "—" : <Montant valeur={r.ecart_inexplique} />}
                  </Cellule>
                </LigneTableau>
              ))}
            </>
          )}
        </Panneau>

        {peutImporter && (
          <Panneau titre="Importer un relevé" aide="Formats déclarés au référentiel ; les soldes recopiés contrôlent que le fichier est complet">
            <ImporterUnReleve
              dossier={niu}
              journaux={journaux.filter((j) => j.nature === "BANQUE")}
              profils={profils}
              du={periode.du}
              au={periode.au}
            />
          </Panneau>
        )}
      </div>
    </>
  );
}
