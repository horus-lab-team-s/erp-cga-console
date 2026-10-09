import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatErreur,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { FixerUnTarif } from "@/app/components/souscription/FixerUnTarif";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { lireTarifs, type EtatDesTarifs, type LigneDeTarif, type TarifFixe } from "@/app/lib/souscription";

export const metadata: Metadata = { title: "Tarifs de l'offre · Plateforme CGA" };

/**
 * Les prix de l'offre, fixés par la direction.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE PRIX EST UNE DÉCISION HUMAINE, ET C'EST ICI QU'ELLE SE PREND
 *
 * Le catalogue portait des montants recopiés de la maquette de la vitrine, affichés
 * comme fermes et encaissés en ligne sans qu'aucun responsable du cabinet ne les ait
 * arrêtés. Désormais, tant qu'un prix n'est pas fixé sur cet écran, il s'affiche
 * « indicatif » sur la vitrine et l'application, et le backend refuse de l'encaisser.
 *
 * L'écran répond à la question que se pose la direction — combien de prix restent à
 * fixer — puis montre, prestation par prestation, le prix du jour, qui l'a fixé et
 * depuis quand. L'historique des décisions suit : qui a décidé quoi, et pourquoi.
 *
 * ⚠️ CE QUI SE CHIFFRE SUR ÉTUDE N'A PAS DE PRIX À FIXER : la création d'entreprise
 * et le ponctuel s'arrêtent sur la proposition de chaque client.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PRIX: Colonne[] = [
  { cle: "prestation", libelle: "Prestation", largeur: "minmax(0, 1.8fr)" },
  { cle: "montant", libelle: "Prix du jour", largeur: "130px", aDroite: true },
  { cle: "statut", libelle: "Statut", largeur: "140px" },
  { cle: "depuis", libelle: "Depuis le", largeur: "104px" },
  { cle: "geste", libelle: "", largeur: "minmax(0, 1.6fr)" },
];

const DECISIONS: Colonne[] = [
  { cle: "le", libelle: "Décidé le", largeur: "104px" },
  { cle: "prestation", libelle: "Prestation", largeur: "minmax(0, 1.4fr)" },
  { cle: "montant", libelle: "Montant", largeur: "120px", aDroite: true },
  { cle: "effet", libelle: "À partir du", largeur: "104px" },
  { cle: "motif", libelle: "Motif", largeur: "minmax(0, 2fr)" },
  { cle: "par", libelle: "Par", largeur: "minmax(0, 1fr)" },
];

export default async function Tarifs() {
  const acces = await exigerAcces();
  if (!detient(acces, "FIXER_LES_TARIFS")) {
    return <EcranReserve titre="Tarifs de l'offre" permission="FIXER_LES_TARIFS" acces={acces} />;
  }
  const jour = aujourdhui();
  let lecture: { valeur: EtatDesTarifs } | { echec: string };
  try {
    lecture = { valeur: await lireTarifs(jour) };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) lecture = { echec: erreur.message };
    else throw erreur;
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Tarifs de l'offre" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Tarifs de l&rsquo;offre</h1>
          <p>Au {dateCourte(jour)}</p>
        </div>

        {"echec" in lecture ? (
          <EtatErreur titre="Les tarifs ne se lisent pas" detail={lecture.echec} />
        ) : (
          <>
            {lecture.valeur.a_fixer > 0 ? (
              <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
                <strong style={{ display: "inline", fontWeight: 600 }}>
                  {lecture.valeur.a_fixer} prix
                  {lecture.valeur.a_fixer > 1 ? " restent" : " reste"} à fixer.
                </strong>{" "}
                Tant qu&rsquo;un prix n&rsquo;est pas fixé, il s&rsquo;affiche comme indicatif sur la vitrine et
                l&rsquo;application, et aucun client ne peut le payer en ligne.
              </div>
            ) : (
              <div className="avertissement-ecran" role="status">
                Tous les prix de l&rsquo;offre sont fixés : ils se paient en ligne.
              </div>
            )}

            <Panneau
              titre="Les prix de l'offre"
              aide="Un prix fixé s'applique à tout devis établi à partir de sa date. Un devis déjà remis garde son prix."
            >
              <EnteteTableau colonnes={PRIX} />
              {lecture.valeur.lignes.map((l, rang) => (
                <LignePrix key={`${l.service}-${l.formule ?? ""}`} l={l} rang={rang} jour={jour} />
              ))}
            </Panneau>

            <Panneau titre="Les décisions" aide="Qui a fixé quel prix, à partir de quand, et pourquoi.">
              {lecture.valeur.decisions.length === 0 ? (
                <EtatVide
                  titre="Aucune décision pour l'instant"
                  detail="Les prix affichés viennent du catalogue de démonstration."
                />
              ) : (
                <>
                  <EnteteTableau colonnes={DECISIONS} />
                  {[...lecture.valeur.decisions].reverse().map((d, rang) => (
                    <LigneDecision key={d.identifiant} d={d} rang={rang} lignes={lecture.valeur.lignes} />
                  ))}
                </>
              )}
            </Panneau>
          </>
        )}
      </div>
    </>
  );
}

function intitule(l: Pick<LigneDeTarif, "libelle" | "libelle_formule">): string {
  return l.libelle_formule ? `${l.libelle} · ${l.libelle_formule}` : l.libelle;
}

function LignePrix({ l, rang, jour }: { l: LigneDeTarif; rang: number; jour: string }) {
  const fixe = l.statut === "FIXE";
  return (
    <LigneTableau colonnes={PRIX} ton={!fixe && l.fixable ? "alerte" : rang % 2 ? "alterne" : "normal"} hauteur="auto">
      <Cellule gras lignes={2} titre={intitule(l)}>
        {intitule(l)}
      </Cellule>
      <Cellule aDroite tabulaire>
        {l.montant ? montantFcfa(l.montant) : "sur étude"}
      </Cellule>
      {/* ⚠️ Le statut en MOTS : la couleur de la ligne ne le dit jamais seule. */}
      <Cellule couleur={fixe ? "var(--success)" : l.fixable ? "var(--danger)" : "var(--ink-500)"}>
        {!l.fixable ? "Sur étude" : fixe ? "Fixé" : "À fixer"}
      </Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">
        {dateCourte(l.en_vigueur_depuis)}
      </Cellule>
      <span style={{ minWidth: 0, paddingBlock: 6 }}>
        {l.fixable ? (
          <FixerUnTarif
            service={l.service}
            formule={l.formule}
            intitule={intitule(l)}
            montantActuel={l.montant}
            aujourdhui={jour}
            dejaFixe={fixe}
          />
        ) : (
          <span style={{ font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
            Arrêté sur la proposition de chaque client
          </span>
        )}
      </span>
    </LigneTableau>
  );
}

function LigneDecision({ d, rang, lignes }: { d: TarifFixe; rang: number; lignes: LigneDeTarif[] }) {
  const ligne = lignes.find((l) => l.service === d.service && l.formule === d.formule);
  return (
    <LigneTableau colonnes={DECISIONS} ton={rang % 2 ? "alterne" : "normal"} hauteur="auto">
      <Cellule tabulaire>{dateCourte(d.fixe_le.slice(0, 10))}</Cellule>
      <Cellule lignes={2}>{ligne ? intitule(ligne) : `${d.service}${d.formule ? ` · ${d.formule}` : ""}`}</Cellule>
      <Cellule aDroite tabulaire>
        {montantFcfa(d.montant)}
      </Cellule>
      <Cellule tabulaire>{dateCourte(d.a_partir_du)}</Cellule>
      <Cellule lignes={2}>{d.motif}</Cellule>
      <Cellule couleur="var(--ink-500)" titre={d.fixe_par}>
        {d.fixe_par_nom ?? d.fixe_par}
      </Cellule>
    </LigneTableau>
  );
}
