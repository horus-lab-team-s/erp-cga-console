import Link from "next/link";
import type { Metadata } from "next";

import { BadgeGravite } from "@/app/components/Gravite";
import { Montant, PastilleStatut } from "@/app/components/Montant";
import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import {
  ANOMALIES,
  DOSSIERS_INCOMPLETS,
  ECHEANCES,
  INDICATEURS,
  PERIODE_COURANTE,
  UTILISATEUR,
  type Indicateur,
} from "@/app/lib/donnees-demo";
import { dateCourte, dateLongue, montantFcfa } from "@/app/lib/formats";

export const metadata: Metadata = {
  title: "Tableau de bord — Plateforme CGA",
};

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
 * ⚠️ Les données viennent de `lib/donnees-demo.ts` : les contextes B, C et F
 * n'existent pas encore côté backend. Seul E02 est branché sur le vrai moteur.
 */

const COLONNES_ECHEANCES: Colonne[] = [
  { cle: "date", libelle: "Date", largeur: "84px" },
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.5fr)" },
  { cle: "obligation", libelle: "Obligation", largeur: "minmax(0, 1.6fr)" },
  { cle: "montant", libelle: "Montant estimé", largeur: "128px", aDroite: true },
  { cle: "completude", libelle: "Complétude", largeur: "96px", aDroite: true },
  { cle: "statut", libelle: "Statut", largeur: "118px" },
];

const COLONNES_ANOMALIES: Colonne[] = [
  { cle: "gravite", libelle: "Gravité", largeur: "112px" },
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.4fr)" },
  { cle: "regle", libelle: "Règle", largeur: "minmax(0, 1.8fr)" },
  { cle: "enjeu", libelle: "Conséquence", largeur: "116px", aDroite: true },
  { cle: "age", libelle: "Depuis", largeur: "64px", aDroite: true },
];

const COLONNES_DOSSIERS: Colonne[] = [
  { cle: "entreprise", libelle: "Entreprise", largeur: "minmax(0, 1.5fr)" },
  { cle: "periode", libelle: "Période", largeur: "104px" },
  { cle: "manquantes", libelle: "Manquantes", largeur: "96px", aDroite: true },
  { cle: "restant", libelle: "Jours restants", largeur: "104px", aDroite: true },
];

export default function TableauDeBord() {
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Tableau de bord" }]} notifications={4} />

      <div className="contenu">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flex: "none" }}>
          <h1
            style={{
              margin: 0,
              font: "600 var(--taille-titre-page)/1.2 var(--police-titre)",
              color: "var(--ink-900)",
            }}
          >
            Bonjour {UTILISATEUR.nom.split(" ")[0]}
          </h1>
          <p style={{ margin: 0, font: "400 12.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
            {dateLongue("2026-08-09")} · période comptable {PERIODE_COURANTE} ·{" "}
            {UTILISATEUR.agence}
          </p>
        </div>

        <div
          style={{
            flex: "none",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          {INDICATEURS.map((indicateur) => (
            <Carte key={indicateur.libelle} indicateur={indicateur} />
          ))}
        </div>

        {/* Deux colonnes, deux rangées : les échéances occupent toute la hauteur à
            gauche, parce que c'est la liste la plus longue et la plus consultée. */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 16,
          }}
        >
          <Panneau
            titre="Échéances à venir"
            aide="7 prochains jours, puis au-delà"
            action={<LienPanneau href="/obligations/echeancier">Échéancier</LienPanneau>}
            style={{ gridRow: "span 2" }}
          >
          
            <EnteteTableau colonnes={COLONNES_ECHEANCES} />
            {ECHEANCES.map((echeance, index) => {
              const enRetard = echeance.joursRestants < 0;
              const complet = echeance.piecesRecues === echeance.piecesAttendues;
              return (
                <LigneTableau
                  key={`${echeance.entreprise}-${echeance.obligation}`}
                  colonnes={COLONNES_ECHEANCES}
                  ton={enRetard ? "alerte" : index % 2 ? "alterne" : "normal"}
                >
                  <Cellule tabulaire couleur={enRetard ? "var(--danger)" : "var(--ink-500)"}>
                    {dateCourte(echeance.date)}
                  </Cellule>
                  <Cellule couleur="var(--brand-indigo-700)" titre={echeance.entreprise}>
                    {echeance.entreprise}
                  </Cellule>
                  <Cellule couleur="var(--ink-500)" titre={echeance.obligation}>
                    {echeance.obligation}
                  </Cellule>
                  <Cellule aDroite tabulaire gras>
                    {montantFcfa(echeance.montant)}
                  </Cellule>
                  <Cellule
                    aDroite
                    tabulaire
                    couleur={complet ? "var(--success)" : "var(--warning)"}
                    titre={`${echeance.piecesRecues} pièces reçues sur ${echeance.piecesAttendues} attendues`}
                  >
                    {echeance.piecesRecues} / {echeance.piecesAttendues}
                  </Cellule>
                  <span>
                    <PastilleStatut statut={echeance.statut} />
                  </span>
                </LigneTableau>
              );
            })}
          </Panneau>

          <Panneau
            titre="Anomalies de conformité récentes"
            aide="par gravité, puis par enjeu"
            action={<LienPanneau href="/conformite">File complète</LienPanneau>}
          >
            <EnteteTableau colonnes={COLONNES_ANOMALIES} />
            {ANOMALIES.length === 0 ? (
              <EtatVide
                titre="Aucune anomalie ouverte"
                detail="Toutes les pièces contrôlées de la période sont conformes."
              />
            ) : (
              ANOMALIES.map((anomalie, index) => (
                <LigneTableau
                  key={`${anomalie.entreprise}-${anomalie.code}-${index}`}
                  colonnes={COLONNES_ANOMALIES}
                  ton={index % 2 ? "alterne" : "normal"}
                >
                  <span>
                    <BadgeGravite severite={anomalie.severite} court />
                  </span>
                  <Cellule couleur="var(--brand-indigo-700)" titre={anomalie.entreprise}>
                    {anomalie.piece ? (
                      <Link href={`/pieces/${anomalie.piece}`}>{anomalie.entreprise}</Link>
                    ) : (
                      anomalie.entreprise
                    )}
                  </Cellule>
                  <Cellule couleur="var(--ink-500)" titre={`${anomalie.regle} — ${anomalie.code}`}>
                    {anomalie.regle}
                  </Cellule>
                  {/* Un constat sans conséquence chiffrée n'affiche pas de montant :
                      inventer un zéro laisserait croire à un enjeu nul. */}
                  <Cellule aDroite tabulaire gras={anomalie.enjeu !== null}>
                    {anomalie.enjeu === null ? (
                      <span style={{ color: "var(--ink-500)" }}>à documenter</span>
                    ) : (
                      <Montant valeur={anomalie.enjeu} />
                    )}
                  </Cellule>
                  <Cellule aDroite tabulaire couleur="var(--ink-500)">
                    {anomalie.anciennete}
                  </Cellule>
                </LigneTableau>
              ))
            )}
          </Panneau>

          <Panneau
            titre="Dossiers incomplets"
            aide="dont l'échéance approche"
            action={<LienPanneau href="/pieces">Relancer</LienPanneau>}
          >
            <EnteteTableau colonnes={COLONNES_DOSSIERS} />
            {DOSSIERS_INCOMPLETS.map((dossier, index) => {
              const enRetard = dossier.joursRestants < 0;
              return (
                <LigneTableau
                  key={dossier.entreprise}
                  colonnes={COLONNES_DOSSIERS}
                  ton={enRetard ? "alerte" : index % 2 ? "alterne" : "normal"}
                >
                  <Cellule couleur="var(--brand-indigo-700)" titre={dossier.natureManquante}>
                    {dossier.entreprise}
                  </Cellule>
                  <Cellule couleur="var(--ink-500)">{dossier.periode}</Cellule>
                  <Cellule aDroite tabulaire gras couleur="var(--warning)">
                    {dossier.manquantes} / {dossier.attendues}
                  </Cellule>
                  <Cellule
                    aDroite
                    tabulaire
                    gras
                    couleur={enRetard ? "var(--danger)" : "var(--ink-900)"}
                  >
                    {enRetard
                      ? `${Math.abs(dossier.joursRestants)} j de retard`
                      : `${dossier.joursRestants} j`}
                  </Cellule>
                </LigneTableau>
              );
            })}
          </Panneau>
        </div>
      </div>
    </>
  );
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
