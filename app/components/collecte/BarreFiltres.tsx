"use client";

import type { Canal } from "@/app/lib/collecte-demo";
import { APPARENCE, type Severite } from "../Gravite";
import type { Statut } from "../Montant";

/**
 * Barre de filtres de la boîte de réception — § 8.3.
 *
 * « Les filtres actifs s'affichent en puces supprimables, avec le compte de
 * résultats. » Deux principes en découlent :
 *
 * 1. **Un filtre actif se voit et se retire d'un clic.** Un filtre appliqué mais
 *    invisible est la première cause de « il manque des pièces » : le comptable
 *    croit voir tout son flux alors qu'il en regarde le tiers.
 * 2. **Les compteurs par gravité sont eux-mêmes des filtres.** Cliquer sur « 4
 *    bloquantes » restreint la liste. Afficher un nombre sans permettre d'y aller
 *    oblige à le retrouver à la main.
 */

export type Filtres = {
  recherche: string;
  entreprise: string | null;
  canal: Canal | null;
  statut: Statut | null;
  severite: Severite | null;
};

export const FILTRES_VIDES: Filtres = {
  recherche: "",
  entreprise: null,
  canal: null,
  statut: null,
  severite: null,
};

export type Compteurs = {
  parSeverite: Record<string, number>;
  parStatut: Record<string, number>;
  entreprises: string[];
  canaux: Canal[];
  statuts: Statut[];
};

/** Ordre d'affichage : ce qui bloque d'abord, ce qui est réglé en dernier. */
const GRAVITES: Severite[] = ["BLOQUANT", "MAJEUR", "AVERTISSEMENT", "CONFORME"];

export function BarreFiltres({
  filtres,
  onChangement,
  compteurs,
  nbResultats,
  nbTotal,
}: {
  filtres: Filtres;
  onChangement: (filtres: Filtres) => void;
  compteurs: Compteurs;
  nbResultats: number;
  nbTotal: number;
}) {
  function modifier<C extends keyof Filtres>(cle: C, valeur: Filtres[C]) {
    onChangement({ ...filtres, [cle]: valeur });
  }

  const actifs = puces(filtres);

  return (
    <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Compteurs par gravité, cliquables. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {GRAVITES.map((severite) => {
          const nombre = compteurs.parSeverite[severite] ?? 0;
          if (nombre === 0) return null;
          const actif = filtres.severite === severite;
          const a = APPARENCE[severite];
          return (
            <button
              key={severite}
              type="button"
              aria-pressed={actif}
              onClick={() => modifier("severite", actif ? null : severite)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 28,
                padding: "0 11px",
                borderRadius: "var(--rayon)",
                cursor: "pointer",
                border: `1px solid ${actif ? a.bordure : "var(--line-200)"}`,
                background: actif ? a.fond : "var(--surface)",
                color: actif ? a.texte : "var(--ink-900)",
                font: "600 12px/1 var(--police-texte)",
              }}
            >
              <span aria-hidden="true">{a.glyphe}</span>
              {a.libelle}
              <span
                className="tabulaire"
                style={{
                  padding: "1px 6px",
                  borderRadius: "var(--rayon-pilule)",
                  background: actif ? "rgb(255 255 255 / 25%)" : "var(--surface-alt)",
                  color: actif ? "inherit" : "var(--ink-500)",
                }}
              >
                {nombre}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sélecteurs. Tout tient sur une ligne : la fiche exige 25 lignes de
          tableau visibles, chaque pixel pris ici en retire une. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          value={filtres.recherche}
          onChange={(e) => modifier("recherche", e.target.value)}
          placeholder="Référence, entreprise ou fournisseur…"
          aria-label="Rechercher dans le flux entrant"
          style={{
            flex: "1 1 240px",
            minWidth: 200,
            maxWidth: 340,
            height: "var(--hauteur-controle)",
            padding: "0 12px",
            border: "1px solid var(--line-200)",
            borderRadius: "var(--rayon)",
            background: "var(--surface)",
            font: "400 13px/1 var(--police-texte)",
            color: "var(--ink-900)",
          }}
        />

        <Selecteur
          etiquette="Entreprise"
          valeur={filtres.entreprise}
          options={compteurs.entreprises}
          onChangement={(v) => modifier("entreprise", v)}
        />
        <Selecteur
          etiquette="Canal"
          valeur={filtres.canal}
          options={compteurs.canaux}
          onChangement={(v) => modifier("canal", v as Canal | null)}
        />
        <Selecteur
          etiquette="Statut"
          valeur={filtres.statut}
          options={compteurs.statuts}
          onChangement={(v) => modifier("statut", v as Statut | null)}
        />

        <span
          className="tabulaire"
          style={{
            marginLeft: "auto",
            font: "400 12px/1 var(--police-texte)",
            color: "var(--ink-500)",
            whiteSpace: "nowrap",
          }}
        >
          {nbResultats} résultat{nbResultats > 1 ? "s" : ""}
          {nbResultats !== nbTotal && ` sur ${nbTotal}`}
        </span>
      </div>

      {/* Puces des filtres actifs. */}
      {actifs.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {actifs.map(({ cle, etiquette, valeur }) => (
            <button
              key={cle}
              type="button"
              onClick={() => modifier(cle, (cle === "recherche" ? "" : null) as never)}
              aria-label={`Retirer le filtre ${etiquette} : ${valeur}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 10px",
                borderRadius: "var(--rayon-pilule)",
                border: 0,
                cursor: "pointer",
                background: "var(--brand-indigo-100)",
                color: "var(--brand-indigo-700)",
                font: "600 11.5px/1 var(--police-texte)",
              }}
            >
              {etiquette} : {valeur}
              <span aria-hidden="true" style={{ fontWeight: 400 }}>
                ✕
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChangement(FILTRES_VIDES)}
            style={{
              border: 0,
              background: "none",
              cursor: "pointer",
              font: "500 11.5px/1 var(--police-texte)",
              color: "var(--brand-indigo-700)",
              textDecoration: "underline",
            }}
          >
            Tout retirer
          </button>
        </div>
      )}
    </div>
  );
}

function Selecteur({
  etiquette,
  valeur,
  options,
  onChangement,
}: {
  etiquette: string;
  valeur: string | null;
  options: readonly string[];
  onChangement: (valeur: string | null) => void;
}) {
  return (
    <select
      aria-label={etiquette}
      value={valeur ?? ""}
      onChange={(e) => onChangement(e.target.value || null)}
      style={{
        height: "var(--hauteur-controle)",
        maxWidth: 190,
        padding: "0 8px",
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: valeur ? "var(--brand-indigo-100)" : "var(--surface)",
        color: valeur ? "var(--brand-indigo-700)" : "var(--ink-900)",
        font: `${valeur ? 600 : 400} 12.5px/1 var(--police-texte)`,
        cursor: "pointer",
      }}
    >
      <option value="">{etiquette} : tous</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function puces(filtres: Filtres) {
  const liste: { cle: keyof Filtres; etiquette: string; valeur: string }[] = [];
  if (filtres.recherche.trim())
    liste.push({ cle: "recherche", etiquette: "Recherche", valeur: filtres.recherche.trim() });
  if (filtres.entreprise)
    liste.push({ cle: "entreprise", etiquette: "Entreprise", valeur: filtres.entreprise });
  if (filtres.canal) liste.push({ cle: "canal", etiquette: "Canal", valeur: filtres.canal });
  if (filtres.statut) liste.push({ cle: "statut", etiquette: "Statut", valeur: filtres.statut });
  if (filtres.severite)
    liste.push({
      cle: "severite",
      etiquette: "Gravité",
      valeur: APPARENCE[filtres.severite].libelle,
    });
  return liste;
}
