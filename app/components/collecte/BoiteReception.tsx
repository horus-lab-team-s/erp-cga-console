"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { ReponseControle } from "@/app/lib/api";
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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ PAS 75 : LA LIGNE EST UNE PIÈCE DE LA COLLECTE, PLUS UNE FACTURE SIMULÉE
 *
 * Le canal et le statut de chaque ligne venaient de `lib/collecte-demo.ts`, une
 * table écrite à la main « en attendant le contexte Collecte ». La collecte existait
 * depuis longtemps au backend. Mesure faite : sur 29 factures affichées, **17 canaux
 * et 16 statuts étaient faux**. F-2026-0412 s'affichait « Reçue », donc à traiter,
 * alors qu'elle était comptabilisée. Et les pièces sans facture extraite, celles
 * qu'il faut justement ouvrir, n'apparaissaient pas.
 *
 * Désormais la page construit les lignes côté serveur : une ligne par pièce reçue,
 * son canal et son état tels que la collecte les connaît, « Rectif. demandée » quand
 * une demande de rectificative est ouverte sur elle, et la conformité quand la
 * facture qu'elle porte a été contrôlée. Une pièce sans facture extraite n'a ni
 * référence ni verdict : elle se lit « à identifier », et ne s'ouvre pas en E02.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LignePiece = {
  /** L'identifiant de la pièce : la clé de la ligne. Deux pièces peuvent porter la même facture. */
  identifiant: string;
  /** La référence de la facture extraite, ou `null` pour une pièce à identifier. */
  reference: string | null;
  adherent: string;
  fournisseur: string;
  date: string;
  ttc: string | null;
  canal: string;
  statut: Statut;
  /** `null` : aucune facture contrôlée sur cette pièce. */
  severite: Severite | null;
  reponse: ReponseControle | null;
};

/** L'ordre de progression d'une pièce, pour les filtres. */
const STATUTS_PIECE: Statut[] = ["Reçue", "Lue", "Rapprochée", "Comptabilisée", "Archivée", "Rectif. demandée"];


/** Grille partagée par l'en-tête, les lignes et le pied : une seule déclaration.
 *
 * ⚠️ LA COLONNE DE RÉFÉRENCE A ÉTÉ DÉBORDÉE PAR LE MOBILE.
 *
 * Elle réservait 104 px, ce qui suffisait aux références du cabinet —
 * « PJ-2026-0028 », douze caractères. Les pièces déposées depuis l'application
 * de terrain portent une clé dérivée de l'empreinte du fichier :
 * « PJ-M08123-43815e8bebe4ad4a », vingt-six caractères, 124 px mesurés. Elles
 * arrivaient tronquées, c'est-à-dire indistinguables les unes des autres — deux
 * photos du même dossier se lisaient pareil.
 *
 * ⚠️ C'est la trace d'une fonctionnalité qui en déborde une autre. Le mobile a
 * été écrit et vérifié sans que personne ne regarde ce que ses références
 * deviennent à l'écran du comptable.
 */
const GRILLE = "32px 132px minmax(0,1.3fr) minmax(0,1.5fr) 82px 122px 92px 110px 108px";

/**
 * ⚠️ La largeur en dessous de laquelle ce tableau cesse d'être lisible.
 *
 * Mesuré dans un cadre de 390 px : 42 coupures, dont les EN-TÊTES eux-mêmes —
 * « Entreprise », « Fournisseur ». Neuf colonnes ne tiennent pas dans la
 * largeur d'un téléphone, et aucun repli n'y changera rien. Le tableau garde sa
 * largeur utile et défile ; les ombres du conteneur disent qu'il continue.
 *
 * Les colonnes fixes gardent leur valeur, les deux colonnes en fractions
 * reçoivent un plancher de 150 px, et l'on ajoute les huit écarts.
 */
const LARGEUR_MINIMALE = 32 + 132 + 150 + 150 + 82 + 122 + 92 + 110 + 108 + 8 * 8 + 24;

export function BoiteReception({ lignes }: { lignes: LignePiece[] }) {
  const routeur = useRouter();

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

  const basculerCoche = useCallback((identifiant: string) => {
    setCochees((actuelles) => {
      const suivantes = new Set(actuelles);
      if (suivantes.has(identifiant)) suivantes.delete(identifiant);
      else suivantes.add(identifiant);
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
          // Une pièce à identifier n'a pas de rapport à ouvrir.
          if (active?.reference) {
            evenement.preventDefault();
            routeur.push(`/pieces/${active.reference}`);
          }
          break;
        case " ":
          if (active) {
            evenement.preventDefault();
            basculerCoche(active.identifiant);
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
  const toutesCochees = visibles.length > 0 && visibles.every((l) => cochees.has(l.identifiant));

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
              minWidth: LARGEUR_MINIMALE,
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
                  toutesCochees ? new Set() : new Set(visibles.map((l) => l.identifiant)),
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

          <div
            ref={conteneur}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "auto",
              background:
                "linear-gradient(to right, var(--surface) 30%, rgb(0 0 0 / 0%)) left center / 24px 100% no-repeat local," +
                "linear-gradient(to left, var(--surface) 30%, rgb(0 0 0 / 0%)) right center / 24px 100% no-repeat local," +
                "radial-gradient(farthest-side at 0 50%, rgb(26 21 35 / 16%), rgb(0 0 0 / 0%)) left center / 12px 100% no-repeat scroll," +
                "radial-gradient(farthest-side at 100% 50%, rgb(26 21 35 / 16%), rgb(0 0 0 / 0%)) right center / 12px 100% no-repeat scroll",
            }}
          >
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
                  key={ligne.identifiant}
                  ligne={ligne}
                  actif={index === indexActif}
                  coche={cochees.has(ligne.identifiant)}
                  alterne={index % 2 === 1}
                  onSurvol={() => setIndexActif(index)}
                  onCocher={() => basculerCoche(ligne.identifiant)}
                  onOuvrir={() => ligne.reference && routeur.push(`/pieces/${ligne.reference}`)}
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
        minWidth: LARGEUR_MINIMALE,
        alignItems: "center",
        // ⚠️ `minHeight` et non `height` : une hauteur FIXE rognait la seconde
        // ligne des dénominations repliées, ce qui remplaçait une coupure par
        // une autre, moins visible. La marge verticale garde les deux lignes à
        // distance des filets, et les lignes d'une seule ligne gardent leur
        // hauteur d'avant.
        minHeight: 32,
        padding: "5px 12px",
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
        aria-label={`Sélectionner ${ligne.reference ?? ligne.identifiant}`}
        onChange={onCocher}
        onClick={(e) => e.stopPropagation()}
      />
      {ligne.reference ? (
        <button
          type="button"
          onClick={onOuvrir}
          className="tabulaire"
          title={ligne.identifiant}
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
      ) : (
        <span className="tabulaire" title="Aucune facture extraite : pièce à identifier" style={{ color: "var(--ink-500)" }}>
          {ligne.identifiant}
        </span>
      )}
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
        {ligne.ttc ? montantFcfa(ligne.ttc) : "—"}
      </span>
      <span style={{ color: "var(--ink-500)" }}>{ligne.canal}</span>
      <span>
        <PastilleStatut statut={ligne.statut} />
      </span>
      <span>
        {ligne.severite ? (
          <BadgeGravite severite={ligne.severite} court />
        ) : (
          <span style={{ color: "var(--ink-500)" }}>à identifier</span>
        )}
      </span>
    </div>
  );
}

/**
 * Une cellule qui se replie plutôt que de se couper.
 *
 * ⚠️ ELLE TRONQUAIT, ET LE NOM DIT CE QU'ELLE FAISAIT.
 *
 * « BOULANGERIE LA COLOMBE SARL » demande 216 px et la colonne en offre 190 :
 * la dénomination se lisait « BOULANGERIE LA COLOMBE … », impossible à
 * distinguer d'une autre boulangerie du portefeuille. C'est pourtant ce qui
 * identifie la ligne.
 *
 * `line-clamp` coupe à la LIGNE et non au caractère : le texte s'arrête sur un
 * mot entier, et les points de suspension ne paraissent qu'au-delà de deux
 * lignes. Le `title` reste : il donne le texte entier au survol et aux lecteurs
 * d'écran.
 */
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
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 2,
        lineHeight: 1.25,
        overflowWrap: "anywhere",
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
      {/* ⚠️ Pas 75 : trois boutons figuraient ici (« Marquer comme lues », « Demander
          une rectification », « Réaffecter ») sans aucune action ni route derrière. Ils
          sont retirés : un bouton qui ne fait rien apprend à cliquer au hasard. La
          rectification se demande pièce par pièce, sur E02, avec son motif. */}
      <span style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
        Aucune action groupée n&rsquo;est encore disponible : chaque pièce se traite sur son rapport.
      </span>
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
      const foin = `${l.identifiant} ${l.reference ?? ""} ${l.adherent} ${l.fournisseur}`.toLocaleLowerCase("fr");
      if (!foin.includes(terme)) return false;
    }
    return true;
  });
}

function compter(lignes: LignePiece[]): Compteurs {
  const parSeverite: Record<string, number> = {};
  const parStatut: Record<string, number> = {};
  for (const l of lignes) {
    if (l.severite) parSeverite[l.severite] = (parSeverite[l.severite] ?? 0) + 1;
    parStatut[l.statut] = (parStatut[l.statut] ?? 0) + 1;
  }
  return {
    parSeverite,
    parStatut,
    entreprises: [...new Set(lignes.map((l) => l.adherent))].sort((a, b) =>
      a.localeCompare(b, "fr"),
    ),
    canaux: [...new Set(lignes.map((l) => l.canal))].sort((a, b) => a.localeCompare(b, "fr")),
    statuts: STATUTS_PIECE.filter((s) => lignes.some((l) => l.statut === s)),
  };
}
