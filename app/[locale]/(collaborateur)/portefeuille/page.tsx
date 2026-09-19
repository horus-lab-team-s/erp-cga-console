import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { Admission, Resiliation } from "@/app/components/portefeuille/GestesDAdhesion";
import { dateCourte } from "@/app/lib/formats";
import { aujourdhui, lireDossiers, type Dossier } from "@/app/lib/portefeuille";
import { lireAnomaliesDuPortefeuille } from "@/app/lib/fiche-dossier";
import { ErreurApi } from "@/app/lib/api";
import { Link } from "@/i18n/navigation";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Portefeuille — Plateforme CGA" };

/**
 * E-B01 · Le portefeuille du collaborateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA LISTE EST DÉJÀ RESTREINTE, ET L'ÉCRAN LE DIT
 *
 * Un comptable voit ses dossiers, pas ceux du cabinet. Ce n'est pas un filtre
 * d'affichage : la route elle-même ne rend que le périmètre de la session. Le
 * sous-titre l'annonce, sans quoi un collaborateur qui compte trois lignes
 * croirait à une panne.
 *
 * TOUT EST RÉSOLU À UNE DATE, ET LA DATE EST AFFICHÉE
 *
 * Le régime, le centre, l'assujettissement et l'adhésion ne sont pas des
 * attributs : ce sont des statuts datés. La colonne « au » n'est pas décorative —
 * c'est elle qui rend la ligne relisable, et qui empêche de croire qu'une
 * entreprise « est » au réel.
 *
 * ⚠️ L'ADHÉSION S'ADMET ET SE RÉSILIE ICI (pas 57)
 *
 * Pour qui détient `INSCRIRE_STATUT`, la colonne propose le seul geste que le
 * dossier admet, décidé sur les dates rendues par le backend : la fin déjà
 * inscrite et l'adhésion à venir. Voir `GestesDAdhesion.tsx`.
 *
 * ⚠️ LES IDENTIFIANTS DOUTEUX EN TÊTE, ET LA FICHE D'UN CLIC (pas 86)
 *
 * Un NIU ou un RCCM hors format se découvre ici, lors d'une revue, plutôt que le jour où
 * l'administration refuse une déclaration. Chaque dénomination mène à la fiche 360°.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "denomination", libelle: "Dénomination", largeur: "minmax(0, 2fr)" },
  { cle: "niu", libelle: "NIU", largeur: "150px" },
  { cle: "forme", libelle: "Forme", largeur: "80px" },
  { cle: "regime", libelle: "Régime", largeur: "96px" },
  { cle: "centre", libelle: "Centre", largeur: "80px" },
  { cle: "tva", libelle: "TVA", largeur: "84px" },
  { cle: "adhesion", libelle: "Adhésion", largeur: "230px" },
  { cle: "exercice", libelle: "Exercice", largeur: "84px", aDroite: true },
];

export default async function Portefeuille() {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403 et le visiteur voit un 500.
  if (!detient(acces, "LIRE_DOSSIER")) {
    return <EcranReserve titre="Portefeuille" permission="LIRE_DOSSIER" acces={acces} />;
  }
  const jour = aujourdhui();
  const dossiers = await lireDossiers(jour);
  // Une anomalie illisible ne doit pas empêcher la liste : le panneau le dit.
  let anomalies: Awaited<ReturnType<typeof lireAnomaliesDuPortefeuille>> | string;
  try {
    anomalies = await lireAnomaliesDuPortefeuille(jour);
  } catch (erreur) {
    if (!(erreur instanceof ErreurApi)) throw erreur;
    anomalies = erreur.message;
  }
  const peutInscrire = detient(acces, "INSCRIRE_STATUT");

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Portefeuille" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Portefeuille</h1>
          <p>
            {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""}
            {acces.dossiers === null
              ? " — vous couvrez tout le cabinet"
              : " affecté" + (dossiers.length > 1 ? "s" : "") + " à votre portefeuille"}
            {" · statuts résolus au "}
            {new Date(jour).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {typeof anomalies === "string" ? (
          <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
            Le contrôle des identifiants ne se lit pas : {anomalies}
          </div>
        ) : (
          anomalies.length > 0 && (
            <div className="avertissement-ecran" role="alert">
              <strong style={{ display: "block", fontWeight: 600 }}>
                {anomalies.length} identifiant{anomalies.length > 1 ? "s" : ""} douteux dans le portefeuille
              </strong>
              {anomalies.map((a) => (
                <span key={`${a.niu_entreprise}-${a.champ}-${a.motif}`} style={{ display: "block" }}>
                  <Link href={`/portefeuille/${encodeURIComponent(a.niu_entreprise)}`}>{a.denomination}</Link> ·{" "}
                  {a.champ.toUpperCase()} {a.valeur ? `« ${a.valeur} »` : "absent"}
                  {a.bloquante ? " (bloquant)" : ""} : {a.motif}
                </span>
              ))}
            </div>
          )
        )}

        <Panneau
          titre="Dossiers suivis"
          aide="Régime, centre et assujettissement sont résolus à la date du jour. Ils ont pu être différents l'an dernier."
        >
          {dossiers.length === 0 ? (
            <EtatVide
              titre="Aucun dossier"
              detail="Aucun dossier ne vous est affecté. La direction répartit les portefeuilles depuis l'écran des habilitations."
            />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES} />
              {dossiers.map((dossier, rang) => (
                <Ligne
                  key={dossier.niu}
                  dossier={dossier}
                  rang={rang}
                  jour={jour}
                  peutInscrire={peutInscrire}
                />
              ))}
            </>
          )}
        </Panneau>
      </div>
    </>
  );
}

function Ligne({
  dossier,
  rang,
  jour,
  peutInscrire,
}: {
  dossier: Dossier;
  rang: number;
  jour: string;
  peutInscrire: boolean;
}) {
  return (
    <LigneTableau colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"}>
      <Cellule gras titre={dossier.siege ?? undefined}>
        <Link href={`/portefeuille/${encodeURIComponent(dossier.niu)}`}>{dossier.denomination}</Link>
      </Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">
        {dossier.niu}
      </Cellule>
      <Cellule couleur="var(--ink-500)">{dossier.forme_juridique}</Cellule>
      <Cellule>
        <Etiquette
          texte={dossier.regime === "REEL" ? "Réel" : "IGS"}
          accent={dossier.regime === "REEL"}
        />
      </Cellule>
      <Cellule couleur="var(--ink-500)">{dossier.centre}</Cellule>
      <Cellule couleur={dossier.assujettie_tva ? "var(--ink-900)" : "var(--ink-500)"}>
        {dossier.assujettie_tva ? "Assujettie" : "Non"}
      </Cellule>
      {/* ⚠️ « Non adhérente » n'est pas une anomalie : une entreprise peut être
          suivie par le cabinet sans avoir adhéré au centre agréé, et l'adhésion
          admet des trous — un adhérent part et revient. */}
      <Cellule couleur={dossier.adherente ? "var(--ink-900)" : "var(--ink-500)"}>
        <Adhesion dossier={dossier} jour={jour} peutInscrire={peutInscrire} />
      </Cellule>
      <Cellule aDroite tabulaire couleur="var(--ink-500)">
        {dossier.exercice_courant ?? "—"}
      </Cellule>
    </LigneTableau>
  );
}

function Etiquette({ texte, accent }: { texte: string; accent: boolean }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "var(--rayon-pilule)",
        background: accent ? "var(--brand-indigo-100)" : "var(--surface-alt)",
        color: accent ? "var(--brand-indigo-700)" : "var(--ink-500)",
        border: accent ? "none" : "1px solid var(--line-200)",
        font: "600 10.5px/1.5 var(--police-texte)",
      }}
    >
      {texte}
    </span>
  );
}

/**
 * L'état de l'adhésion au jour, et le seul geste qu'il admet.
 *
 * ⚠️ L'ordre des tests suit les dates du backend, jamais une règle refaite ici :
 * une fin déjà inscrite ou une adhésion déjà à venir ne proposent rien.
 */
function Adhesion({
  dossier,
  jour,
  peutInscrire,
}: {
  dossier: Dossier;
  jour: string;
  peutInscrire: boolean;
}) {
  const detail = { display: "block", font: "400 11.5px/1.4 var(--police-texte)", color: "var(--ink-500)" };
  if (dossier.adherente) {
    return (
      <span style={{ display: "block" }}>
        En cours
        {dossier.numero_adhesion && <span style={detail}>{dossier.numero_adhesion}</span>}
        {dossier.adhesion_jusqu_au ? (
          <span style={detail}>plus adhérent le {dateCourte(dossier.adhesion_jusqu_au)}</span>
        ) : (
          peutInscrire && <Resiliation dossier={dossier.niu} />
        )}
        {/* ⚠️ Une réadhésion déjà inscrite se montre aussi sur un dossier encore
            adhérent : sinon « plus adhérent le 24/09 » se lit comme un départ, alors
            qu'un nouveau contrat prend le relais. Deux contrats jointifs restent
            deux contrats, et l'abattement CGA de l'exercice en dépend (section 53). */}
        {dossier.adhesion_a_venir && (
          <span style={detail}>nouvelle adhésion le {dateCourte(dossier.adhesion_a_venir)}</span>
        )}
      </span>
    );
  }
  if (dossier.adhesion_a_venir) {
    return (
      <span style={{ display: "block" }}>
        Non
        <span style={detail}>adhérent à compter du {dateCourte(dossier.adhesion_a_venir)}</span>
      </span>
    );
  }
  return (
    <span style={{ display: "block" }}>
      Non
      {peutInscrire && <Admission dossier={dossier.niu} aujourdhui={jour} />}
    </span>
  );
}
