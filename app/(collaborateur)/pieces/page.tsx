import Link from "next/link";
import type { Metadata } from "next";

import { BadgeGravite, type Severite } from "../../components/Gravite";
import { Cellule, EnteteTableau, EtatErreur, LigneTableau, Panneau, type Colonne } from "../../components/Tableau";
import { EnteteTravail } from "../../components/coquille/EnteteTravail";
import {
  ErreurApi,
  controlerPieceDemonstration,
  listerPiecesDemonstration,
  type ReponseControle,
} from "../../lib/api";
import { dateCourte, montantFcfa } from "../../lib/formats";

export const metadata: Metadata = { title: "Pièces justificatives — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Amorce de **E03 · Boîte de réception des pièces** — fiche au § 8.3.
 *
 * ⚠️ ÉBAUCHE, pas l'écran final. E03 exige une barre de filtres à puces
 * supprimables, la sélection multiple avec actions groupées, un panneau latéral
 * d'aperçu sans changement de page, des compteurs par statut, au moins 25 lignes
 * visibles en 1440 × 900 et une navigation complète au clavier.
 *
 * Cette page assure pour l'instant la seule chose dont E01 et E02 ont besoin : une
 * liste qui mène au rapport de conformité. Le reste vient avec le contexte
 * C · Collecte, qui possédera le canal de réception, le statut du cycle de vie et
 * la miniature du document — aucune de ces trois données n'existe aujourd'hui.
 */

const COLONNES: Colonne[] = [
  { cle: "reference", libelle: "Référence", largeur: "118px" },
  { cle: "adherent", libelle: "Entreprise", largeur: "minmax(0, 1.4fr)" },
  { cle: "fournisseur", libelle: "Fournisseur", largeur: "minmax(0, 1.5fr)" },
  { cle: "date", libelle: "Date", largeur: "88px" },
  { cle: "ttc", libelle: "Montant TTC", largeur: "132px", aDroite: true },
  { cle: "reglement", libelle: "Règlement", largeur: "116px" },
  { cle: "conformite", libelle: "Conformité", largeur: "132px" },
];

export default async function ListePieces() {
  let rapports: ReponseControle[] = [];
  let erreur: string | null = null;

  try {
    const references = await listerPiecesDemonstration();
    rapports = await Promise.all(references.map(controlerPieceDemonstration));
  } catch (cause) {
    erreur =
      cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  const aTraiter = rapports.filter((r) => r.rapport.constats.length > 0).length;

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Flux entrant" }, { libelle: "Pièces justificatives" }]}
        notifications={4}
      />

      <div className="contenu">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <h1
            style={{
              margin: 0,
              font: "600 var(--taille-titre-page)/1.2 var(--police-titre)",
              color: "var(--ink-900)",
            }}
          >
            Pièces justificatives
          </h1>
          {!erreur && (
            <span
              style={{
                padding: "6px 12px",
                borderRadius: "var(--rayon-pilule)",
                background: "var(--brand-indigo-100)",
                color: "var(--brand-indigo-700)",
                font: "600 12px/1.2 var(--police-texte)",
              }}
            >
              {rapports.length} pièces · {aTraiter} à traiter
            </span>
          )}
          <button type="button" className="action-principale" style={{ marginLeft: "auto" }}>
            Importer des pièces
          </button>
        </div>

        <Panneau
          titre="Réception de juillet 2026"
          aide="cliquez une ligne pour ouvrir le rapport de conformité"
          style={{ flex: 1 }}
        >
          {erreur ? (
            <EtatErreur titre="Contrôle de conformité indisponible" detail={erreur} />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES} />
              {rapports.map(({ facture, rapport }, index) => {
                const severite = pireSeverite(rapport.constats.map((c) => c.severite));
                const enEspeces = facture.reglement.mode === "ESPECES";
                return (
                  <LigneTableau
                    key={facture.document.reference}
                    colonnes={COLONNES}
                    ton={index % 2 ? "alterne" : "normal"}
                    hauteur="44px"
                  >
                    <Cellule tabulaire>
                      <Link href={`/pieces/${facture.document.reference}`}>
                        {facture.document.reference}
                      </Link>
                    </Cellule>
                    <Cellule
                      couleur="var(--brand-indigo-700)"
                      titre={facture.destinataire.denomination ?? undefined}
                    >
                      {facture.destinataire.denomination}
                    </Cellule>
                    <Cellule titre={facture.emetteur.denomination ?? undefined}>
                      {facture.emetteur.denomination}
                    </Cellule>
                    <Cellule tabulaire couleur="var(--ink-500)">
                      {dateCourte(facture.document.date_emission)}
                    </Cellule>
                    <Cellule aDroite tabulaire gras>
                      {montantFcfa(facture.montants.total_ttc)}
                    </Cellule>
                    <Cellule couleur={enEspeces ? "var(--warning)" : "var(--ink-500)"}>
                      {facture.reglement.mode.toLocaleLowerCase("fr").replace(/_/g, " ")}
                    </Cellule>
                    <span>
                      <BadgeGravite severite={severite} court />
                    </span>
                  </LigneTableau>
                );
              })}
            </>
          )}
        </Panneau>
      </div>
    </>
  );
}

const ORDRE: Record<string, number> = {
  BLOQUANT: 4,
  MAJEUR: 3,
  AVERTISSEMENT: 2,
  INFORMATION: 1,
};

function pireSeverite(severites: string[]): Severite {
  if (severites.length === 0) return "CONFORME";
  return severites.reduce((pire, s) =>
    (ORDRE[s] ?? 0) > (ORDRE[pire] ?? 0) ? s : pire,
  ) as Severite;
}
