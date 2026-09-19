import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { Montant, PastilleStatut, type Statut } from "@/app/components/Montant";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { InscrireReclassement } from "@/app/components/obligations/InscrireReclassement";
import { detient } from "@/app/lib/acces";
import { dateCourte } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { ErreurApi } from "@/app/lib/api";
import {
  lireEligibiliteDesAdherents,
  lireSeuilsDeRegime,
  lireVeilleDUnDossier,
  pourcentage,
  type EligibiliteDeLAdherent,
  type SurveillanceDuDossier,
} from "@/app/lib/veille-des-seuils";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Veille des seuils — Plateforme CGA" };

/**
 * E-F03 · La veille des seuils du portefeuille.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CET ÉCRAN EXISTE
 *
 * Les deux revues qui font le métier d'un centre agréé étaient construites côté
 * backend, et aucun collaborateur ne pouvait les voir : la mesure du pas 51 a
 * compté 40 routes appelées par le frontend sur 130, et aucune des deux n'en
 * faisait partie.
 *
 *   le seuil de régime     une entreprise passe au réel en septembre, continue de
 *                          facturer sans TVA, et doit au contrôle une taxe qu'elle
 *                          n'a jamais encaissée
 *   le seuil d'adhésion    un adhérent dépasse 100 millions, et découvre à la
 *                          liasse, des mois après, un abattement qu'il n'aura pas
 *
 * ⚠️ L'ORDRE EST CELUI DU BACKEND
 *
 * Les deux listes arrivent triées par urgence, le fait avant la prévision. Les
 * retrier à l'écran, par nom par exemple, ferait passer un dossier en infraction
 * derrière un dossier qui a encore le temps.
 *
 * ⚠️ RIEN N'EST EXTRAPOLÉ
 *
 * L'exercice en cours s'affiche avec sa part écoulée, jamais projeté sur l'année.
 *
 * ⚠️ L'ÉCRAN PERMET LE GESTE QUI RÉPOND À L'ALERTE (pas 53)
 *
 * « Reclassement dû » sans moyen d'agir obligeait le réviseur à inscrire le passage
 * au réel ailleurs, c'est-à-dire nulle part dans l'application. Le bouton n'apparaît
 * que sur un reclassement **dû**, c'est-à-dire constaté sur un exercice clos, et
 * pour qui détient `INSCRIRE_STATUT`. Un exercice en cours déjà au-delà du seuil
 * reste une veille : son chiffre est partiel, et inscrire un changement de régime
 * sur une prévision serait décider à la place des livres.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES_REGIME: Colonne[] = [
  { cle: "dossier", libelle: "Dossier", largeur: "minmax(0, 2fr)" },
  { cle: "acquis", libelle: "Exercice clos", largeur: "168px", aDroite: true },
  { cle: "en_cours", libelle: "Exercice en cours", largeur: "200px", aDroite: true },
  { cle: "statut", libelle: "Conclusion", largeur: "220px" },
];

const COLONNES_ADHESION: Colonne[] = [
  { cle: "dossier", libelle: "Adhérent", largeur: "minmax(0, 2fr)" },
  { cle: "acquis", libelle: "Exercice clos", largeur: "168px", aDroite: true },
  { cle: "en_cours", libelle: "Exercice en cours", largeur: "200px", aDroite: true },
  { cle: "statut", libelle: "Conclusion", largeur: "150px" },
];

export default async function VeilleDesSeuils({
  searchParams,
}: {
  searchParams: Promise<{ tout?: string; dossier?: string }>;
}) {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : les deux revues exigent `LIRE_COMPTABILITE`, et
  // l'appel refusé remonterait en erreur 500 au lieu d'un refus lisible.
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return (
      <EcranReserve titre="Veille des seuils" permission="LIRE_COMPTABILITE" acces={acces} />
    );
  }

  const { tout, dossier } = await searchParams;
  const toutAfficher = tout === "1";
  const jour = aujourdhui();
  const [regimes, adherents] = await Promise.all([
    lireSeuilsDeRegime(jour, toutAfficher),
    lireEligibiliteDesAdherents(jour, toutAfficher),
  ]);
  // ⚠️ Lue une fois, ici : le composant client ne connaît pas la session, et une
  // permission testée ligne par ligne serait autant d'occasions de l'oublier.
  const peutInscrire = detient(acces, "INSCRIRE_STATUT");
  const seuilRegime = regimes[0]?.seuil;
  // Pas 90 : la veille d'un seul dossier, ouverte depuis sa ligne ou par `?dossier=`.
  const veille = dossier
    ? await lireVeilleDUnDossier(dossier, jour).catch((e: unknown) => (e instanceof ErreurApi ? e.message : Promise.reject(e)))
    : null;
  const seuilAdhesion = adherents[0]?.seuil;

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Obligations fiscales", href: "/obligations" },
          { libelle: "Veille des seuils" },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Veille des seuils</h1>
          <p>
            Lue dans les livres au {dateCourte(jour)} ·{" "}
            {toutAfficher ? (
              <Link href="/obligations/veille-des-seuils">
                ne montrer que ce qui demande un regard
              </Link>
            ) : (
              <Link href="/obligations/veille-des-seuils?tout=1">
                afficher tout le portefeuille
              </Link>
            )}
          </p>
        </div>

        {veille && (
          <Panneau titre={typeof veille === "string" ? "Veille du dossier" : `Veille de ${veille.denomination}`} aide="Le chiffre d'affaires lu dans les livres, sans extrapolation : la part de l'exercice écoulée est donnée pour juger.">
            {typeof veille === "string" ? (
              <EtatVide titre="La veille ne se lit pas" detail={veille} />
            ) : (
              <div style={{ padding: "10px 16px", font: "400 13px/1.7 var(--police-texte)" }}>
                {[veille.acquis, veille.en_cours].map((m, k) =>
                  m ? (
                    <p key={m.exercice} style={{ margin: 0 }}>
                      <strong>{k === 0 ? "Exercice clos" : "Exercice en cours"} {m.exercice}</strong> : chiffre d&rsquo;affaires{" "}
                      <Montant valeur={Number(m.diagnostic.chiffre_affaires)} /> pour un seuil de <Montant valeur={Number(m.diagnostic.seuil)} /> (
                      {Math.round(Number(m.diagnostic.taux_d_approche) * 100)} %
                      {m.clos ? "" : `, ${Math.round(Number(m.part_ecoulee) * 100)} % de l'exercice écoulé`}) ·{" "}
                      {m.diagnostic.reclassement_requis ? "reclassement requis" : m.diagnostic.franchi ? "seuil franchi" : m.diagnostic.alerte_anticipee ? "alerte anticipée" : "en deçà"}
                    </p>
                  ) : null,
                )}
                <p style={{ margin: "4px 0 0", color: "var(--ink-500)" }}>
                  {veille.reclassement_inscrit_au
                    ? `Reclassement inscrit au ${dateCourte(veille.reclassement_inscrit_au)}.`
                    : veille.reclassement_du
                      ? "Reclassement dû et non inscrit."
                      : "Aucun reclassement dû."}
                </p>
              </div>
            )}
          </Panneau>
        )}

        <Panneau
          titre="Seuil d'assujettissement à la TVA"
          aide={
            "Le chiffre d'affaires des comptes de vente, comparé au seuil du référentiel et à sa borne. " +
            "Sur l'exercice clos, un franchissement est un fait : le reclassement au réel est dû. " +
            "Sur l'exercice en cours, c'est une veille, et le chiffre est partiel."
          }
        >
          {regimes.length === 0 ? (
            <EtatVide
              titre="Aucun dossier à surveiller"
              detail="Aucun dossier de votre portefeuille n'approche du seuil d'assujettissement."
            />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES_REGIME} />
              {regimes.map((vue, rang) => (
                <LigneRegime key={vue.niu} vue={vue} rang={rang} peutInscrire={peutInscrire} />
              ))}
            </>
          )}
        </Panneau>

        <Panneau
          titre="Éligibilité des adhérents (CGI art. 118)"
          aide={
            "Les adhérents dont les livres sortent, ou vont sortir, du champ du Centre. " +
            "Cette revue ne résilie rien : sortir du champ est une information à porter à l'adhérent, " +
            "et la décision reste celle du cabinet."
          }
        >
          {adherents.length === 0 ? (
            <EtatVide
              titre="Aucun adhérent à surveiller"
              detail="Aucun adhérent de votre portefeuille n'approche du seuil d'adhésion."
            />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES_ADHESION} />
              {adherents.map((revue, rang) => (
                <LigneAdhesion key={revue.niu} revue={revue} rang={rang} />
              ))}
            </>
          )}
        </Panneau>

        {(seuilRegime || seuilAdhesion) && (
          <p style={{ font: "400 12.5px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
            Seuils du référentiel au {dateCourte(jour)} :
            {seuilRegime && <> assujettissement <Montant valeur={seuilRegime} avecDevise /></>}
            {seuilRegime && seuilAdhesion && " ·"}
            {seuilAdhesion && <> adhésion <Montant valeur={seuilAdhesion} avecDevise /></>}
            {" "}· la valeur même du seuil n&rsquo;est franchie que si le texte le dit.
          </p>
        )}
      </div>
    </>
  );
}

function Chiffre({
  mesure,
}: {
  mesure: { chiffre_affaires: string; taux_d_approche: string; part_ecoulee: string; exercice: string } | null;
}) {
  if (!mesure) return <span style={{ color: "var(--ink-500)" }}>—</span>;
  const partielle = Number(mesure.part_ecoulee) < 1;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
      <Montant valeur={mesure.chiffre_affaires} />
      <span style={{ font: "400 11.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
        {mesure.exercice} · {pourcentage(mesure.taux_d_approche)} du seuil
        {partielle && ` · ${pourcentage(mesure.part_ecoulee)} de l'exercice écoulé`}
      </span>
    </span>
  );
}

/**
 * Le 1er janvier qui suit l'exercice clos mesuré, quand son libellé est une année.
 *
 * ⚠️ Une proposition, que le réviseur peut changer. Un libellé qui n'est pas une
 * année (exercice décalé) ne propose rien plutôt que de deviner une date fausse.
 */
function dateDEffetProposee(vue: SurveillanceDuDossier): string {
  const libelle = vue.acquis?.exercice ?? "";
  return /^\d{4}$/.test(libelle) ? `${Number(libelle) + 1}-01-01` : "";
}

/**
 * Ce que dit une ligne sans alerte.
 *
 * ⚠️ **« Sous le seuil » était écrit pour toute ligne sans alerte**, et c'était faux
 * pour un dossier déjà au réel : le diagnostic ne lève aucune alerte sur lui,
 * puisqu'il n'y a plus rien à reclasser, et l'écran affichait « Sous le seuil » à
 * 140 % du seuil. Le défaut s'est vu au pas 53, juste après une inscription : la
 * ligne passait de « Reclassement dû » à « Sous le seuil », comme si le chiffre
 * avait baissé. Le régime vient du backend, lu à la date d'observation.
 */
function conclusionSansAlerte(vue: SurveillanceDuDossier): string {
  const regime = (vue.en_cours ?? vue.acquis)?.diagnostic.regime_actuel;
  return regime === "REEL" ? "Au réel" : "Sous le seuil";
}

function LigneRegime({
  vue,
  rang,
  peutInscrire,
}: {
  vue: SurveillanceDuDossier;
  rang: number;
  peutInscrire: boolean;
}) {
  // ⚠️ Des conclusions du backend, jamais un recalcul. L'ordre des tests suit
  // l'urgence : un reclassement déjà inscrit l'emporte sur tout, puisqu'il éteint
  // l'alerte.
  let statut: Statut | null = null;
  if (vue.reclassement_inscrit_au) statut = "Reclassement inscrit";
  else if (vue.reclassement_du) statut = "Reclassement dû";
  else if (vue.a_surveiller) statut = "À surveiller";

  const versChiffre = (m: SurveillanceDuDossier["acquis"]) =>
    m && { ...m.diagnostic, part_ecoulee: m.part_ecoulee, exercice: m.exercice };

  return (
    <LigneTableau
      colonnes={COLONNES_REGIME}
      ton={vue.reclassement_du ? "alerte" : rang % 2 ? "alterne" : "normal"}
    >
      <Cellule gras titre={vue.denomination}>
        {/* Pas 90 : la veille détaillée du dossier, clos et en cours. */}
        <Link href={`/obligations/veille-des-seuils?dossier=${encodeURIComponent(vue.niu)}`}>{vue.denomination}</Link>
        <span style={{ display: "block", font: "400 11.5px/1.4 var(--police-mono)", color: "var(--ink-500)" }}>
          {vue.niu}
        </span>
      </Cellule>
      <Cellule aDroite tabulaire>
        <Chiffre mesure={versChiffre(vue.acquis)} />
      </Cellule>
      <Cellule aDroite tabulaire>
        <Chiffre mesure={versChiffre(vue.en_cours)} />
      </Cellule>
      <Cellule>
        {statut ? <PastilleStatut statut={statut} /> : conclusionSansAlerte(vue)}
        {vue.reclassement_inscrit_au && (
          <span style={{ display: "block", font: "400 11.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
            au réel le {dateCourte(vue.reclassement_inscrit_au)}
          </span>
        )}
        {vue.reclassement_du && peutInscrire && (
          <InscrireReclassement dossier={vue.niu} dateProposee={dateDEffetProposee(vue)} />
        )}
      </Cellule>
    </LigneTableau>
  );
}

function LigneAdhesion({ revue, rang }: { revue: EligibiliteDeLAdherent; rang: number }) {
  let statut: Statut | null = null;
  if (revue.hors_champ) statut = "Hors champ";
  else if (revue.a_surveiller) statut = "À surveiller";

  return (
    <LigneTableau
      colonnes={COLONNES_ADHESION}
      ton={revue.hors_champ ? "alerte" : rang % 2 ? "alterne" : "normal"}
    >
      <Cellule gras titre={revue.denomination}>
        {revue.denomination}
        <span style={{ display: "block", font: "400 11.5px/1.4 var(--police-mono)", color: "var(--ink-500)" }}>
          {revue.niu}
          {revue.numero_adhesion && ` · ${revue.numero_adhesion}`}
        </span>
      </Cellule>
      <Cellule aDroite tabulaire>
        <Chiffre mesure={revue.acquis} />
      </Cellule>
      <Cellule aDroite tabulaire>
        <Chiffre mesure={revue.en_cours} />
      </Cellule>
      <Cellule>{statut ? <PastilleStatut statut={statut} /> : "Dans le champ"}</Cellule>
    </LigneTableau>
  );
}
