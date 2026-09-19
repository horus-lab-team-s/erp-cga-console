import type { Metadata } from "next";

import { Cellule, EnteteTableau, EtatErreur, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import { ExportDesEcritures, RepriseDUnFichier } from "@/app/components/comptabilite/EchangeComptable";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { lirePlanImputation, lireProfilsDEchange } from "@/app/lib/echange";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Échange comptable — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * E-E03 · L'échange avec le logiciel du client : exporter, reprendre, et le plan
 * d'imputation du dossier (pas 85).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX PERMISSIONS
 *
 * Lire le plan et exporter demandent `LIRE_COMPTABILITE`. Reprendre demande
 * `SAISIR_ECRITURE`, même en contrôle : le rapport montre le contenu comptable du
 * fichier, et l'application produit des écritures. Le panneau de reprise n'est pas
 * affiché sans elle.
 *
 * ⚠️ POURQUOI LE PLAN D'IMPUTATION EST ICI
 *
 * Il dit sur quels comptes ce dossier impute ses achats. C'est la question qu'on se pose
 * en relisant une reprise ou un export : « pourquoi ce 604 plutôt qu'un 602 ? ». Le
 * mettre ailleurs obligerait à changer d'écran au moment où l'on compare.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const REGLES: Colonne[] = [
  { cle: "priorite", libelle: "Rang", largeur: "56px", aDroite: true },
  { cle: "motif", libelle: "Quand le libellé contient", largeur: "minmax(0, 1.4fr)" },
  { cle: "compte", libelle: "Compte", largeur: "90px" },
  { cle: "libelle", libelle: "Intitulé", largeur: "minmax(0, 1.6fr)" },
];

async function lirePanneau<T>(lecture: () => Promise<T>): Promise<{ valeur: T } | { echec: string }> {
  try {
    return { valeur: await lecture() };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message };
    throw erreur;
  }
}

export default async function EchangeComptable({ searchParams }: { searchParams: Promise<{ dossier?: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Échange comptable" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const saisit = detient(acces, "SAISIR_ECRITURE");
  const { dossier } = await searchParams;
  const dossiers = await lireDossiers();
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Échange" }]} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier" detail="Aucun dossier ne vous est affecté : il n'y a rien à échanger." />
        </div>
      </>
    );
  }
  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;
  const exercice = exerciceCourant();

  const [profils, plan] = await Promise.all([lirePanneau(lireProfilsDEchange), lirePanneau(() => lirePlanImputation(niu))]);
  const listeProfils = "valeur" in profils ? profils.valeur : [];

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: courant.denomination }, { libelle: "Échange" }]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Échange avec le logiciel du client</h1>
          <p>
            {courant.denomination} · {niu}
            {dossiers.length > 1 && " · changez de dossier dans la barre latérale"}
          </p>
        </div>

        {"echec" in profils && <EtatErreur titre="Les formats d'échange ne se lisent pas" detail={profils.echec} />}

        <Panneau titre="Exporter" aide="Seules les écritures validées sortent : un lot qui contient un brouillon est refusé en entier.">
          <ExportDesEcritures entreprise={niu} exercice={exercice} profils={listeProfils} />
          {listeProfils.length > 0 && (
            <ul style={{ margin: "0 16px 12px", paddingLeft: 18, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              {listeProfils.map((p) => (
                <li key={p.code}>
                  <strong style={{ fontWeight: 600 }}>{p.libelle}</strong> : {p.remarque}
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        {saisit && (
          <Panneau
            titre="Reprendre un fichier"
            aide="Contrôler d'abord : rien n'est écrit. Les écritures appliquées entrent en brouillon, et un brouillon ne se supprime pas."
          >
            <RepriseDUnFichier entreprise={niu} exercice={exercice} profils={listeProfils} />
          </Panneau>
        )}

        <Panneau titre="Plan d'imputation du dossier" aide="Les comptes sur lesquels ce dossier impute ses achats : propres à chaque adhérent.">
          {"echec" in plan ? (
            <EtatErreur titre="Le plan ne se lit pas" detail={plan.echec} />
          ) : (
            <>
              <p style={{ margin: "10px 16px", font: "400 13px/1.6 var(--police-texte)" }}>
                Charge par défaut <strong>{plan.valeur.compte_charge_par_defaut}</strong> · fournisseurs{" "}
                <strong>{plan.valeur.compte_fournisseur}</strong> · TVA déductible <strong>{plan.valeur.compte_tva_deductible}</strong>
                {plan.valeur.compte_tva_non_recuperable && (
                  <>
                    {" "}
                    · TVA non récupérable <strong>{plan.valeur.compte_tva_non_recuperable}</strong>
                  </>
                )}
              </p>
              {plan.valeur.regles.length === 0 ? (
                <EtatVide titre="Aucune règle propre" detail="Tout achat est imputé au compte de charge par défaut." />
              ) : (
                <>
                  <EnteteTableau colonnes={REGLES} />
                  {[...plan.valeur.regles]
                    .sort((a, b) => a.priorite - b.priorite)
                    .map((r, rang) => (
                      <LigneTableau key={`${r.priorite}-${r.motif}`} colonnes={REGLES} ton={rang % 2 ? "alterne" : "normal"}>
                        <Cellule aDroite tabulaire>{r.priorite}</Cellule>
                        <Cellule>{r.motif}</Cellule>
                        <Cellule tabulaire gras>{r.compte}</Cellule>
                        <Cellule>{r.libelle}</Cellule>
                      </LigneTableau>
                    ))}
                </>
              )}
            </>
          )}
        </Panneau>
      </div>
    </>
  );
}
