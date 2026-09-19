import Link from "next/link";
import type { Metadata } from "next";

import { BadgeGravite, type Severite } from "@/app/components/Gravite";
import { Montant, PastilleStatut, type Statut } from "@/app/components/Montant";
import {
  Cellule,
  EnteteTableau,
  EtatErreur,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { controlerToutLeFlux, type Constat } from "@/app/lib/api";
import { lireDemandes, lirePieces } from "@/app/lib/collecte";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { dateCourte, dateLongue, montantFcfa } from "@/app/lib/formats";
import { lireEcheancier, type LigneEcheance } from "@/app/lib/obligations";
import { aujourdhui, lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = {
  title: "Tableau de bord — Plateforme CGA",
};

// Tout ce qui s'affiche ici dépend du jour : un rendu figé serait faux dès le lendemain.
export const dynamic = "force-dynamic";

/**
 * E01 · Tableau de bord collaborateur — fiche au § 8.1.
 *
 * Utilisateur : chargé de clientèle, à l'ouverture de sa journée.
 * Objectif : savoir immédiatement où porter son attention.
 *
 * Trois contraintes de la fiche, qui expliquent la forme :
 *
 * 1. **Des tableaux denses, pas des cartes espacées.** Un chargé de clientèle
 *    veut compter ses lignes, pas admirer des vignettes.
 * 2. **Tout tient en 1440 × 900 sans défilement.** D'où la grille en hauteur
 *    fixe : les panneaux défilent à l'intérieur, la page jamais.
 * 3. Quatre indicateurs, pas dix. Ce qui reste est dans les vues détaillées.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ PAS 76 : PLUS RIEN N'EST INVENTÉ SUR CETTE PAGE
 *
 * Jusqu'ici, seul le prénom était vrai. Les quatre indicateurs, les échéances,
 * les anomalies et les « dossiers incomplets » venaient de `lib/donnees-demo.ts`,
 * au motif que « le contexte J · Pilotage n'existe pas ». Il existait, comme les
 * obligations, la collecte et la conformité. La page d'accueil de chaque
 * collaborateur montrait donc, à tous et quel que soit leur portefeuille, les
 * mêmes chiffres écrits à la main, datés du 9 août 2026 : « 6 échéances sous
 * 7 jours », « 3 anomalies bloquantes, 1 depuis 22 jours », et une échéance du
 * 15 août affichée « 24 jours de retard » le 9 août.
 *
 * Désormais :
 *
 *   dossiers suivis          GET /portefeuille/entreprises
 *   échéances                GET /obligations/dossiers/{niu}/echeancier, par dossier
 *   pièces en attente        GET /collecte/pieces   (`traitee` faux)
 *   anomalies                le contrôle du flux, sur les pièces non comptabilisées
 *   pièces attendues         GET /collecte/demandes, ouvertes, par dossier
 *
 * ⚠️ LA PAGE COMPTE, ELLE NE DÉCIDE PAS
 *
 * « En retard », « jours restants », « en attente de traitement », la gravité d'un
 * constat : tout arrive résolu par le backend. La page compte des lignes et en
 * choisit l'ordre. Aucune règle métier n'y est recopiée.
 *
 * Le panneau « Dossiers incomplets » disparaît : il affichait des pièces
 * « manquantes sur attendues » que rien ne calcule. Ce que le système sait, ce sont
 * les pièces **demandées** ; le panneau les montre sous ce nom.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Indicateur = {
  libelle: string;
  valeur: string;
  detail: string;
  ton: "neutre" | "attention" | "alerte";
};

const COLONNES_ECHEANCES: Colonne[] = [
  { cle: "date", libelle: "Date", largeur: "84px" },
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.5fr)" },
  { cle: "obligation", libelle: "Obligation", largeur: "minmax(0, 1.6fr)" },
  { cle: "montant", libelle: "Montant estimé", largeur: "128px", aDroite: true },
  { cle: "restant", libelle: "Jours restants", largeur: "104px", aDroite: true },
  { cle: "statut", libelle: "Statut", largeur: "118px" },
];

const COLONNES_ANOMALIES: Colonne[] = [
  { cle: "gravite", libelle: "Gravité", largeur: "112px" },
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.4fr)" },
  { cle: "regle", libelle: "Règle", largeur: "minmax(0, 1.8fr)" },
  { cle: "enjeu", libelle: "Conséquence", largeur: "116px", aDroite: true },
  { cle: "piece", libelle: "Facture", largeur: "96px" },
];

const COLONNES_ATTENDUES: Colonne[] = [
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.5fr)" },
  { cle: "demandes", libelle: "Demandées", largeur: "90px", aDroite: true },
  { cle: "bloquantes", libelle: "Bloquantes", largeur: "90px", aDroite: true },
  { cle: "depuis", libelle: "Plus ancienne", largeur: "104px" },
];

/** Horizon des échéances affichées. Au-delà, l'échéancier du dossier. */
const HORIZON_JOURS = 30;

const STATUT_OBLIGATION: Record<LigneEcheance["obligation"]["statut"], Statut> = {
  A_FAIRE: "À faire",
  EN_PREPARATION: "En préparation",
  PRETE: "Prête",
  DECLAREE: "Déclarée",
  PAYEE: "Payée",
};

const ORDRE_GRAVITE: Record<string, number> = { BLOQUANT: 2, MAJEUR: 1 };

export default async function TableauDeBord() {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403 et le visiteur voit un 500.
  if (!detient(acces, "LIRE_DOSSIER")) {
    return <EcranReserve titre="Tableau de bord" permission="LIRE_DOSSIER" acces={acces} />;
  }
  const jour = aujourdhui();
  const exercice = exerciceCourant();

  let donnees: Awaited<ReturnType<typeof lireLaJournee>> | null = null;
  let erreur: string | null = null;
  try {
    donnees = await lireLaJournee(jour, exercice, detient(acces, "LIRE_PIECE"));
  } catch (cause) {
    erreur = cause instanceof Error ? cause.message : String(cause);
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Tableau de bord" }]} />

      <div className="contenu">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flex: "none" }}>
          <h1
            style={{
              margin: 0,
              font: "600 var(--taille-titre-page)/1.2 var(--police-titre)",
              color: "var(--ink-900)",
            }}
          >
            Bonjour {acces.nom_complet.split(" ")[0]}
          </h1>
          <p style={{ margin: 0, font: "400 12.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
            {dateLongue(jour)} · exercice {exercice} ·{" "}
            {acces.dossiers === null
              ? "tout le portefeuille"
              : `${acces.dossiers.length} dossier${acces.dossiers.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {!donnees ? (
          <EtatErreur titre="La journée ne se lit pas" detail={erreur ?? ""} />
        ) : (
          <>
            {/* Classe et non style en ligne : un `gridTemplateColumns` écrit dans
                l'attribut `style` ne peut être repris par aucune requête média, la
                grille resterait à quatre colonnes sur un téléphone. */}
            <div className="grille-indicateurs">
              {donnees.indicateurs.map((indicateur) => (
                <Carte key={indicateur.libelle} indicateur={indicateur} />
              ))}
            </div>

            <div className="grille-panneaux">
              <Panneau
                titre="Échéances à venir"
                aide={`non déposées, en retard ou sous ${HORIZON_JOURS} jours`}
                action={<LienPanneau href="/obligations">Obligations</LienPanneau>}
                style={{ gridRow: "span 2" }}
              >
                <EnteteTableau colonnes={COLONNES_ECHEANCES} />
                {donnees.echeances.length === 0 ? (
                  <EtatVide
                    titre="Rien à déposer"
                    detail={`Aucune obligation non déposée d'ici ${HORIZON_JOURS} jours sur votre portefeuille.`}
                  />
                ) : (
                  donnees.echeances.map(({ ligne, denomination }, index) => (
                    <LigneTableau
                      key={`${ligne.obligation.entreprise}-${ligne.obligation.code_obligation}-${ligne.obligation.periode_debut}`}
                      colonnes={COLONNES_ECHEANCES}
                      ton={ligne.en_retard ? "alerte" : index % 2 ? "alterne" : "normal"}
                    >
                      <Cellule tabulaire couleur={ligne.en_retard ? "var(--danger)" : "var(--ink-500)"}>
                        {dateCourte(ligne.obligation.echeance)}
                      </Cellule>
                      <Cellule couleur="var(--brand-indigo-700)" titre={denomination}>
                        {denomination}
                      </Cellule>
                      <Cellule couleur="var(--ink-500)" titre={ligne.obligation.libelle}>
                        {ligne.obligation.libelle}
                      </Cellule>
                      {/* Un montant que le backend n'estime pas ne s'affiche pas : un zéro
                          inventé laisserait croire à une obligation sans enjeu. */}
                      <Cellule aDroite tabulaire gras={ligne.obligation.montant_estime !== null}>
                        {ligne.obligation.montant_estime === null ? (
                          <span style={{ color: "var(--ink-500)" }}>non estimé</span>
                        ) : (
                          montantFcfa(ligne.obligation.montant_estime)
                        )}
                      </Cellule>
                      <Cellule
                        aDroite
                        tabulaire
                        gras
                        couleur={ligne.en_retard ? "var(--danger)" : "var(--ink-900)"}
                      >
                        {ligne.en_retard ? `${Math.abs(ligne.jours_restants)} j de retard` : `${ligne.jours_restants} j`}
                      </Cellule>
                      <span>
                        <PastilleStatut statut={ligne.en_retard ? "En retard" : STATUT_OBLIGATION[ligne.obligation.statut]} />
                      </span>
                    </LigneTableau>
                  ))
                )}
              </Panneau>

              <Panneau
                titre="Anomalies à traiter"
                aide="bloquantes puis majeures, sur les pièces non comptabilisées"
                action={<LienPanneau href="/pieces">Boîte de réception</LienPanneau>}
              >
                <EnteteTableau colonnes={COLONNES_ANOMALIES} />
                {donnees.anomalies === null ? (
                  <EtatVide titre="Hors de votre rôle" detail="La lecture des pièces n'est pas ouverte à votre rôle." />
                ) : donnees.anomalies.length === 0 ? (
                  <EtatVide
                    titre="Aucune anomalie ouverte"
                    detail="Aucune pièce en attente ne porte de constat bloquant ou majeur."
                  />
                ) : (
                  donnees.anomalies.map(({ constat, reference, denomination }, index) => (
                    <LigneTableau
                      key={`${reference}-${constat.code_regle}`}
                      colonnes={COLONNES_ANOMALIES}
                      ton={index % 2 ? "alterne" : "normal"}
                    >
                      <span>
                        <BadgeGravite severite={constat.severite as Severite} court />
                      </span>
                      <Cellule couleur="var(--brand-indigo-700)" titre={denomination}>
                        {denomination}
                      </Cellule>
                      <Cellule couleur="var(--ink-500)" titre={`${constat.libelle} — ${constat.code_regle}`}>
                        {constat.libelle}
                      </Cellule>
                      {/* Un constat sans conséquence chiffrée n'affiche pas de montant :
                          inventer un zéro laisserait croire à un enjeu nul. */}
                      <Cellule aDroite tabulaire gras={constat.enjeu !== null}>
                        {constat.enjeu === null ? (
                          <span style={{ color: "var(--ink-500)" }}>à documenter</span>
                        ) : (
                          <Montant valeur={Number(constat.enjeu)} />
                        )}
                      </Cellule>
                      <Cellule tabulaire>
                        <Link href={`/pieces/${reference}`}>{reference}</Link>
                      </Cellule>
                    </LigneTableau>
                  ))
                )}
              </Panneau>

              <Panneau
                titre="Pièces attendues"
                aide="demandes ouvertes, par dossier"
                action={<LienPanneau href="/pieces/attendues">Suivre</LienPanneau>}
              >
                <EnteteTableau colonnes={COLONNES_ATTENDUES} />
                {donnees.attendues === null ? (
                  <EtatVide titre="Hors de votre rôle" detail="La lecture des pièces n'est pas ouverte à votre rôle." />
                ) : donnees.attendues.length === 0 ? (
                  <EtatVide titre="Rien n'est attendu" detail="Aucune demande de pièce ouverte sur votre portefeuille." />
                ) : (
                  donnees.attendues.map((ligne, index) => (
                    <LigneTableau
                      key={ligne.niu}
                      colonnes={COLONNES_ATTENDUES}
                      ton={ligne.bloquantes > 0 ? "alerte" : index % 2 ? "alterne" : "normal"}
                    >
                      <Cellule couleur="var(--brand-indigo-700)" titre={ligne.denomination}>
                        {ligne.denomination}
                      </Cellule>
                      <Cellule aDroite tabulaire gras>
                        {ligne.demandes}
                      </Cellule>
                      <Cellule aDroite tabulaire gras couleur={ligne.bloquantes > 0 ? "var(--danger)" : "var(--ink-500)"}>
                        {ligne.bloquantes}
                      </Cellule>
                      <Cellule tabulaire couleur="var(--ink-500)">
                        {dateCourte(ligne.plusAncienne)}
                      </Cellule>
                    </LigneTableau>
                  ))
                )}
              </Panneau>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/**
 * Tout ce que la journée affiche, lu en une fois (pas 76).
 *
 * ⚠️ Un échéancier par dossier : il n'existe pas de lecture consolidée du
 * portefeuille. Sur un portefeuille de cabinet (quelques dizaines de dossiers), les
 * appels partent en parallèle. Le jour où il en faudra des centaines, c'est une
 * route consolidée au backend qu'il faudra, pas un cache ici.
 *
 * ⚠️ Un échéancier illisible (un dossier sans exercice ouvert, par exemple) ne fait
 * pas tomber la page : il est ignoré, et l'indicateur le dit.
 */
async function lireLaJournee(jour: string, exercice: string, lirePiecesPermis: boolean) {
  const dossiers = await lireDossiers(jour);
  const noms = new Map(dossiers.map((d) => [d.niu, d.denomination]));
  const nom = (niu: string) => noms.get(niu) ?? niu;

  const lectures = await Promise.allSettled(dossiers.map((d) => lireEcheancier(d.niu, exercice, jour)));
  const illisibles = lectures.filter((l) => l.status === "rejected").length;
  const toutes = lectures.flatMap((l) => (l.status === "fulfilled" ? l.value : []));
  const aDeposer = toutes.filter((l) => !l.obligation.deposee);
  const echeances = aDeposer
    .filter((l) => l.en_retard || l.jours_restants <= HORIZON_JOURS)
    .sort((a, b) => a.obligation.echeance.localeCompare(b.obligation.echeance))
    .map((ligne) => ({ ligne, denomination: nom(ligne.obligation.entreprise) }));
  const sousSept = aDeposer.filter((l) => !l.en_retard && l.jours_restants <= 7).length;
  const enRetard = aDeposer.filter((l) => l.en_retard).length;

  let anomalies: { constat: Constat; reference: string; denomination: string }[] | null = null;
  let attendues: { niu: string; denomination: string; demandes: number; bloquantes: number; plusAncienne: string }[] | null =
    null;
  let enAttente: number | null = null;
  let aIdentifier = 0;
  if (lirePiecesPermis) {
    const [pieces, rapports, demandes] = await Promise.all([lirePieces({ a_la_date: jour }), controlerToutLeFlux(), lireDemandes()]);
    enAttente = pieces.filter((p) => !p.traitee).length;
    aIdentifier = pieces.filter((p) => !p.traitee && !p.identifiee).length;
    // Une anomalie est « à traiter » tant que la pièce qui la porte n'est ni
    // comptabilisée ni archivée. Une pièce sur laquelle le constat a déjà produit
    // sa conséquence n'est plus une question pour ce matin.
    const ouvertes = new Map<string, string>();
    for (const p of pieces) {
      if (p.reference_document && p.etat !== "COMPTABILISEE" && p.etat !== "ARCHIVEE") {
        ouvertes.set(p.reference_document, p.entreprise);
      }
    }
    anomalies = rapports
      .filter((r) => ouvertes.has(r.facture.document.reference))
      .flatMap((r) =>
        r.rapport.constats
          .filter((c) => c.severite in ORDRE_GRAVITE)
          .map((constat) => ({
            constat,
            reference: r.facture.document.reference,
            denomination: nom(ouvertes.get(r.facture.document.reference)!),
          })),
      )
      .sort(
        (a, b) =>
          ORDRE_GRAVITE[b.constat.severite] - ORDRE_GRAVITE[a.constat.severite] ||
          Number(b.constat.enjeu ?? 0) - Number(a.constat.enjeu ?? 0),
      );
    const parDossier = new Map<string, { demandes: number; bloquantes: number; plusAncienne: string }>();
    for (const d of demandes) {
      const cumul = parDossier.get(d.entreprise) ?? { demandes: 0, bloquantes: 0, plusAncienne: d.demandee_le };
      cumul.demandes += 1;
      if (d.bloquante) cumul.bloquantes += 1;
      if (d.demandee_le < cumul.plusAncienne) cumul.plusAncienne = d.demandee_le;
      parDossier.set(d.entreprise, cumul);
    }
    attendues = [...parDossier.entries()]
      .map(([niu, c]) => ({ niu, denomination: nom(niu), ...c }))
      .sort((a, b) => b.bloquantes - a.bloquantes || a.plusAncienne.localeCompare(b.plusAncienne));
  }

  const bloquantes = anomalies?.filter((a) => a.constat.severite === "BLOQUANT") ?? [];
  const indicateurs: Indicateur[] = [
    {
      libelle: "Dossiers suivis",
      valeur: String(dossiers.length),
      detail: illisibles > 0 ? `${illisibles} échéancier${illisibles > 1 ? "s" : ""} illisible${illisibles > 1 ? "s" : ""}` : `exercice ${exercice}`,
      ton: illisibles > 0 ? "attention" : "neutre",
    },
    {
      libelle: "Échéances sous 7 jours",
      valeur: String(sousSept),
      detail: enRetard > 0 ? `et ${enRetard} en retard` : "aucune en retard",
      ton: enRetard > 0 ? "alerte" : sousSept > 0 ? "attention" : "neutre",
    },
    {
      libelle: "Pièces en attente",
      valeur: enAttente === null ? "—" : String(enAttente),
      detail: enAttente === null ? "hors de votre rôle" : `dont ${aIdentifier} à identifier`,
      ton: "neutre",
    },
    {
      libelle: "Anomalies bloquantes",
      valeur: anomalies === null ? "—" : String(new Set(bloquantes.map((a) => a.reference)).size),
      detail: anomalies === null ? "hors de votre rôle" : "pièces non comptabilisables en l'état",
      ton: bloquantes.length > 0 ? "alerte" : "neutre",
    },
  ];

  return { indicateurs, echeances, anomalies, attendues };
}

function Carte({ indicateur }: { indicateur: Indicateur }) {
  const tons = {
    neutre: { bordure: "var(--line-200)", fond: "var(--surface)", valeur: "var(--ink-900)" },
    attention: {
      bordure: "var(--warning)",
      fond: "var(--warning-100)",
      valeur: "var(--ink-900)",
    },
    alerte: { bordure: "var(--danger)", fond: "var(--danger-100)", valeur: "var(--danger)" },
  }[indicateur.ton];

  return (
    <article
      style={{
        border: `1px solid ${tons.bordure}`,
        borderRadius: "var(--rayon)",
        background: tons.fond,
        padding: "13px 16px",
      }}
    >
      <h2
        style={{
          margin: 0,
          font: "600 var(--taille-entete-colonne)/1.3 var(--police-texte)",
          letterSpacing: "var(--interlettrage-entete)",
          textTransform: "uppercase",
          color: "var(--ink-500)",
        }}
      >
        {indicateur.libelle}
      </h2>
      <p
        className="tabulaire"
        style={{
          margin: 0,
          font: "600 var(--taille-grand-chiffre)/1.25 var(--police-titre)",
          color: tons.valeur,
        }}
      >
        {indicateur.valeur}
      </p>
      <p style={{ margin: 0, font: "400 11.5px/1.45 var(--police-texte)", color: "var(--ink-500)" }}>
        {indicateur.detail}
      </p>
    </article>
  );
}

function LienPanneau({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      style={{ font: "500 12px/1 var(--police-texte)", textDecoration: "underline" }}
    >
      {children}
    </Link>
  );
}
