"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { ReponseControle } from "@/app/lib/api";
import { CANAUX, STATUTS_PIECE, metaCollecte, type Canal } from "@/app/lib/collecte-demo";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { BadgeGravite, type Severite } from "../Gravite";
import { PastilleStatut, type Statut } from "../Montant";
import { ApercuPiece } from "./ApercuPiece";
import { BarreFiltres, FILTRES_VIDES, type Compteurs, type Filtres } from "./BarreFiltres";

/**
 * E03 · Boîte de réception des pièces — fiche au § 8.3.
 *
 * Utilisateur : comptable traitant le flux entrant.
 * **Objectif : traiter en file, sans quitter le clavier.**
 *
 * Cette dernière phrase commande toute la conception. Le comptable ne clique pas
 * ligne à ligne : il descend la file aux flèches, ouvre à Entrée, coche à Espace.
 * Le panneau d'aperçu suit la ligne survolée au clavier — d'où le choix d'un
 * panneau latéral plutôt que d'une navigation vers E02 : changer de page à chaque
 * ligne casserait la file.
 *
 * Contrainte de densité : **au moins 25 lignes visibles sans défilement** en
 * 1440 × 900. La hauteur de ligne est donc à 32 px ici, plus serrée que les 36 px
 * habituels, et la barre de filtres tient sur une seule ligne.
 */

export type LignePiece = {
  reference: string;
  adherent: string;
  fournisseur: string;
  date: string;
  ttc: string;
  canal: Canal;
  statut: Statut;
  severite: Severite;
  reponse: ReponseControle;
};

const ORDRE_SEVERITE: Record<string, number> = {
  BLOQUANT: 4,
  MAJEUR: 3,
  AVERTISSEMENT: 2,
  INFORMATION: 1,
  CONFORME: 0,
};

/** Grille partagée par l'en-tête, les lignes et le pied : une seule déclaration. */
const GRILLE = "32px 104px minmax(0,1.35fr) minmax(0,1.5fr) 82px 122px 92px 118px 116px";

export function BoiteReception({ rapports }: { rapports: ReponseControle[] }) {
  const routeur = useRouter();

  const lignes = useMemo<LignePiece[]>(
    () =>
      rapports.map(({ facture, rapport }) => {
        const meta = metaCollecte(facture.document.reference);
        const severite = (rapport.constats.length
          ? rapport.constats.reduce((pire, c) =>
              ORDRE_SEVERITE[c.severite] > ORDRE_SEVERITE[pire.severite] ? c : pire,
            ).severite
          : "CONFORME") as Severite;
        return {
          reference: facture.document.reference,
          adherent: facture.destinataire.denomination ?? "—",
          fournisseur: facture.emetteur.denomination ?? "—",
          date: facture.document.date_emission,
          ttc: facture.montants.total_ttc,
          canal: meta.canal,
          statut: meta.statut,
          severite,
          reponse: { facture, rapport, verdict: rapportVerdictFactice(severite) },
        };
      }),
    [rapports],
  );

  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [cochees, setCochees] = useState<Set<string>>(new Set());
  const [indexSouhaite, setIndexActif] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);

  const visibles = useMemo(() => appliquer(lignes, filtres), [lignes, filtres]);

  // Un filtre qui rétrécit la liste ne doit pas laisser le curseur hors bornes.
  // Borner au rendu plutôt que corriger dans un effet : l'effet produirait un
  // second rendu, et le premier afficherait brièvement une ligne inexistante.
  const indexActif = Math.min(indexSouhaite, Math.max(0, visibles.length - 1));
  const active = visibles[indexActif] ?? null;

  const basculerCoche = useCallback((reference: string) => {
    setCochees((actuelles) => {
      const suivantes = new Set(actuelles);
      if (suivantes.has(reference)) suivantes.delete(reference);
      else suivantes.add(reference);
      return suivantes;
    });
  }, []);

  // Navigation clavier — § 8.3 : « flèches pour parcourir, entrée pour ouvrir,
  // raccourcis pour les actions ». Les raccourcis sont annotés en pied d'écran.
  useEffect(() => {
    function auClavier(evenement: KeyboardEvent) {
      const cible = evenement.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;

      switch (evenement.key) {
        case "ArrowDown":
        case "j":
          evenement.preventDefault();
          setIndexActif((i) => Math.min(i + 1, visibles.length - 1));
          break;
        case "ArrowUp":
        case "k":
          evenement.preventDefault();
          setIndexActif((i) => Math.max(i - 1, 0));
          break;
        case "Home":
          evenement.preventDefault();
          setIndexActif(0);
          break;
        case "End":
          evenement.preventDefault();
          setIndexActif(Math.max(0, visibles.length - 1));
          break;
        case "Enter":
          if (active) {
            evenement.preventDefault();
            routeur.push(`/pieces/${active.reference}`);
          }
          break;
        case " ":
          if (active) {
            evenement.preventDefault();
            basculerCoche(active.reference);
          }
          break;
        case "Escape":
          evenement.preventDefault();
          setCochees(new Set());
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [active, visibles.length, basculerCoche, routeur]);

  // Garder la ligne active dans le champ de vision quand on descend la file.
  useEffect(() => {
    conteneur.current
      ?.querySelector<HTMLElement>('[data-actif="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [indexActif]);

  const compteurs = useMemo(() => compter(lignes), [lignes]);
  const toutesCochees = visibles.length > 0 && visibles.every((l) => cochees.has(l.reference));

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <BarreFiltres
          filtres={filtres}
          onChangement={setFiltres}
          compteurs={compteurs}
          nbResultats={visibles.length}
          nbTotal={lignes.length}
        />

        {cochees.size > 0 && <ActionsGroupees nombre={cochees.size} onAnnuler={() => setCochees(new Set())} />}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--line-200)",
            borderRadius: "var(--rayon)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <div
            role="row"
            style={{
              flex: "none",
              display: "grid",
              gridTemplateColumns: GRILLE,
              alignItems: "center",
              height: 30,
              padding: "0 12px",
              gap: 8,
              background: "var(--brand-indigo-100)",
              borderBottom: "1px solid var(--line-200)",
              font: "600 12px/1 var(--police-texte)",
              letterSpacing: "var(--interlettrage-entete)",
              textTransform: "uppercase",
              color: "var(--ink-500)",
            }}
          >
            <input
              type="checkbox"
              checked={toutesCochees}
              aria-label="Tout sélectionner"
              onChange={() =>
                setCochees(
                  toutesCochees ? new Set() : new Set(visibles.map((l) => l.reference)),
                )
              }
            />
            <span>Référence</span>
            <span>Entreprise</span>
            <span>Fournisseur</span>
            <span>Date</span>
            <span style={{ textAlign: "right" }}>Montant TTC</span>
            <span>Canal</span>
            <span>Statut</span>
            <span>Conformité</span>
          </div>

          <div ref={conteneur} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            {visibles.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "36px 24px",
                  textAlign: "center",
                  font: "400 13px/1.7 var(--police-texte)",
                  color: "var(--ink-500)",
                }}
              >
                <strong style={{ display: "block", color: "var(--ink-900)" }}>
                  Aucune pièce ne correspond aux filtres
                </strong>
                Retirez une puce ci-dessus pour élargir la recherche.
              </p>
            ) : (
              visibles.map((ligne, index) => (
                <Ligne
                  key={ligne.reference}
                  ligne={ligne}
                  actif={index === indexActif}
                  coche={cochees.has(ligne.reference)}
                  alterne={index % 2 === 1}
                  onSurvol={() => setIndexActif(index)}
                  onCocher={() => basculerCoche(ligne.reference)}
                  onOuvrir={() => routeur.push(`/pieces/${ligne.reference}`)}
                />
              ))
            )}
          </div>

          <Raccourcis nbVisibles={visibles.length} nbTotal={lignes.length} />
        </div>
      </div>

      <ApercuPiece ligne={active} />
    </div>
  );
}

function Ligne({
  ligne,
  actif,
  coche,
  alterne,
  onSurvol,
  onCocher,
  onOuvrir,
}: {
  ligne: LignePiece;
  actif: boolean;
  coche: boolean;
  alterne: boolean;
  onSurvol: () => void;
  onCocher: () => void;
  onOuvrir: () => void;
}) {
  const fond = actif
    ? "var(--brand-magenta-100)"
    : coche
      ? "var(--brand-indigo-100)"
      : alterne
        ? "var(--surface-alt)"
        : "var(--surface)";

  return (
    <div
      role="row"
      data-actif={actif}
      onMouseEnter={onSurvol}
      onDoubleClick={onOuvrir}
      style={{
        display: "grid",
        gridTemplateColumns: GRILLE,
        alignItems: "center",
        height: 32,
        padding: "0 12px",
        gap: 8,
        borderBottom: "1px solid var(--line-100)",
        borderLeft: actif ? "3px solid var(--brand-magenta-600)" : "3px solid transparent",
        background: fond,
        font: "400 12.5px/1 var(--police-texte)",
        color: "var(--ink-900)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={coche}
        aria-label={`Sélectionner ${ligne.reference}`}
        onChange={onCocher}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onOuvrir}
        className="tabulaire"
        style={{
          border: 0,
          background: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          color: "var(--brand-indigo-700)",
          font: "500 12.5px/1 var(--police-texte)",
        }}
      >
        {ligne.reference}
      </button>
      <Tronque titre={ligne.adherent} couleur="var(--brand-indigo-700)">
        {ligne.adherent}
      </Tronque>
      <Tronque titre={ligne.fournisseur}>{ligne.fournisseur}</Tronque>
      <span className="tabulaire" style={{ color: "var(--ink-500)" }}>
        {dateCourte(ligne.date)}
      </span>
      <span
        className="tabulaire"
        style={{ textAlign: "right", fontWeight: 500, whiteSpace: "nowrap" }}
      >
        {montantFcfa(ligne.ttc)}
      </span>
      <span style={{ color: "var(--ink-500)" }}>{ligne.canal}</span>
      <span>
        <PastilleStatut statut={ligne.statut} />
      </span>
      <span>
        <BadgeGravite severite={ligne.severite} court />
      </span>
    </div>
  );
}

function Tronque({
  children,
  titre,
  couleur,
}: {
  children: React.ReactNode;
  titre: string;
  couleur?: string;
}) {
  return (
    <span
      title={titre}
      style={{
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: couleur,
      }}
    >
      {children}
    </span>
  );
}

function ActionsGroupees({ nombre, onAnnuler }: { nombre: number; onAnnuler: () => void }) {
  return (
    <div
      role="toolbar"
      aria-label="Actions groupées"
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderRadius: "var(--rayon)",
        background: "var(--brand-indigo-100)",
        border: "1px solid var(--brand-indigo-700)",
      }}
    >
      <strong
        className="tabulaire"
        style={{ font: "600 12.5px/1 var(--police-texte)", color: "var(--brand-indigo-700)" }}
      >
        {nombre} pièce{nombre > 1 ? "s" : ""} sélectionnée{nombre > 1 ? "s" : ""}
      </strong>
      {/* Une action groupée qui comptabiliserait en masse contournerait le contrôle
          pièce à pièce. Seules les actions sans conséquence fiscale directe sont
          proposées ici — le reste passe par E02. */}
      <button type="button" className="action-secondaire">
        Marquer comme lues
      </button>
      <button type="button" className="action-secondaire">
        Demander une rectification
      </button>
      <button type="button" className="action-secondaire">
        Réaffecter
      </button>
      <button
        type="button"
        onClick={onAnnuler}
        style={{
          marginLeft: "auto",
          border: 0,
          background: "none",
          cursor: "pointer",
          font: "500 12px/1 var(--police-texte)",
          color: "var(--brand-indigo-700)",
          textDecoration: "underline",
        }}
      >
        Tout désélectionner · Échap
      </button>
    </div>
  );
}

/** Annotation des raccourcis, exigée par la fiche § 8.3. */
function Raccourcis({ nbVisibles, nbTotal }: { nbVisibles: number; nbTotal: number }) {
  return (
    <div
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "7px 12px",
        borderTop: "1px solid var(--line-200)",
        background: "var(--surface-alt)",
        font: "400 11.5px/1 var(--police-texte)",
        color: "var(--ink-500)",
      }}
    >
      <span className="tabulaire">
        {nbVisibles} ligne{nbVisibles > 1 ? "s" : ""} affichée{nbVisibles > 1 ? "s" : ""} sur{" "}
        {nbTotal}
      </span>
      <span style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Touche combinaison="↑ ↓" role="parcourir" />
        <Touche combinaison="Entrée" role="ouvrir le rapport" />
        <Touche combinaison="Espace" role="sélectionner" />
        <Touche combinaison="Échap" role="tout désélectionner" />
      </span>
    </div>
  );
}

function Touche({ combinaison, role }: { combinaison: string; role: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <kbd className="raccourci" style={{ margin: 0 }}>
        {combinaison}
      </kbd>
      {role}
    </span>
  );
}

// ── Filtrage et comptage ──────────────────────────────────────────────────────

function appliquer(lignes: LignePiece[], filtres: Filtres): LignePiece[] {
  const terme = filtres.recherche.trim().toLocaleLowerCase("fr");
  return lignes.filter((l) => {
    if (filtres.entreprise && l.adherent !== filtres.entreprise) return false;
    if (filtres.canal && l.canal !== filtres.canal) return false;
    if (filtres.statut && l.statut !== filtres.statut) return false;
    if (filtres.severite && l.severite !== filtres.severite) return false;
    if (terme) {
      const foin = `${l.reference} ${l.adherent} ${l.fournisseur}`.toLocaleLowerCase("fr");
      if (!foin.includes(terme)) return false;
    }
    return true;
  });
}

function compter(lignes: LignePiece[]): Compteurs {
  const parSeverite: Record<string, number> = {};
  const parStatut: Record<string, number> = {};
  for (const l of lignes) {
    parSeverite[l.severite] = (parSeverite[l.severite] ?? 0) + 1;
    parStatut[l.statut] = (parStatut[l.statut] ?? 0) + 1;
  }
  return {
    parSeverite,
    parStatut,
    entreprises: [...new Set(lignes.map((l) => l.adherent))].sort((a, b) =>
      a.localeCompare(b, "fr"),
    ),
    canaux: CANAUX.filter((c) => lignes.some((l) => l.canal === c)),
    statuts: STATUTS_PIECE.filter((s) => lignes.some((l) => l.statut === s)),
  };
}

/**
 * Le verdict complet est calculé côté serveur pour E02. L'aperçu latéral n'en a
 * besoin que du strict minimum, reconstitué ici plutôt que retransporté.
 */
function rapportVerdictFactice(severite: Severite) {
  return {
    glyphe: "",
    titre: "",
    detail: "",
    jeton_fond: "",
    comptabilisation_interdite: severite === "BLOQUANT",
    avertissement_validation: null,
  };
}
