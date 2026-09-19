"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Dossier } from "@/app/lib/portefeuille";
import { Icone } from "./Icone";

/**
 * Sélecteur d'entreprise — § 8.0.
 *
 * « L'élément le plus sollicité : le collaborateur change de dossier en
 * permanence. Il doit être accessible en un geste depuis n'importe quel écran,
 * avec recherche instantanée sur la dénomination et le NIU, et un historique des
 * dossiers récents. »
 *
 * Trois conséquences concrètes :
 *
 * 1. Le champ de recherche prend le focus à l'ouverture — on tape sans viser.
 * 2. La recherche porte aussi sur le **NIU**, parce qu'un adhérent au téléphone
 *    lit son numéro fiscal, pas sa raison sociale exacte.
 * 3. Les dossiers récents sont en tête : dans les faits, un collaborateur
 *    alterne entre trois ou quatre dossiers dans une même demi-journée.
 */
export function SelecteurEntreprise({
  dossiers,
  repliee,
  entrepriseCourante,
  onChangement,
}: {
  repliee: boolean;
  dossiers: Dossier[];
  entrepriseCourante: Dossier | null;
  onChangement: (entreprise: Dossier | null) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const conteneur = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    champ.current?.focus();

    function auClic(evenement: MouseEvent) {
      if (!conteneur.current?.contains(evenement.target as Node)) setOuvert(false);
    }
    function auClavier(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  const resultats = useMemo(() => {
    const terme = requete.trim().toLocaleLowerCase("fr");
    if (!terme) return null;
    return dossiers.filter(
      (e) =>
        e.denomination.toLocaleLowerCase("fr").includes(terme) ||
        e.niu.toLocaleLowerCase("fr").includes(terme),
    );
  }, [requete, dossiers]);

  // ⚠️ La notion de « dossiers récents » a disparu avec le jeu de démonstration :
  // elle était une constante en dur. La rétablir suppose de savoir ce que **ce**
  // collaborateur a ouvert récemment, c'est-à-dire une préférence par compte —
  // affaire du contexte K, pas de cet écran. Inventer ici un ordre plausible
  // ferait croire à une mémoire qui n'existe pas.
  const recentes: Dossier[] = [];
  const autres = dossiers;

  function choisir(entreprise: Dossier | null) {
    onChangement(entreprise);
    setOuvert(false);
    setRequete("");
  }

  return (
    <div className="selecteur" ref={conteneur}>
      <button
        type="button"
        className="selecteur__declencheur"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        title={
          entrepriseCourante
            ? `${entrepriseCourante.denomination} — changer de dossier`
            : "Choisir un dossier"
        }
        onClick={() => setOuvert((o) => !o)}
      >
        {repliee ? (
          <span style={{ margin: "0 auto" }}>
            <Icone nom="portefeuille" taille={18} />
          </span>
        ) : (
          <>
            <span className="selecteur__identite">
              <span className="selecteur__denomination">
                {entrepriseCourante?.denomination ?? "Tous les dossiers"}
              </span>
              <span className="selecteur__niu">
                {entrepriseCourante ? entrepriseCourante.niu : "128 adhérents"}
              </span>
            </span>
            <span aria-hidden="true" style={{ flex: "none", opacity: 0.7 }}>
              ▾
            </span>
          </>
        )}
      </button>

      {ouvert && (
        <div className="selecteur__panneau" role="listbox" aria-label="Choisir un dossier">
          <input
            ref={champ}
            className="selecteur__recherche"
            type="search"
            placeholder="Dénomination ou NIU…"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
          />

          <div style={{ overflowY: "auto" }}>
            {resultats === null ? (
              <>
                <OptionTousDossiers actuel={entrepriseCourante === null} onChoix={choisir} />
                <div className="selecteur__section">Dossiers récents</div>
                {recentes.map((e) => (
                  <Option
                    key={e.niu}
                    entreprise={e}
                    actuel={e.niu === entrepriseCourante?.niu}
                    onChoix={choisir}
                  />
                ))}
                <div className="selecteur__section">Tout le portefeuille</div>
                {autres.map((e) => (
                  <Option
                    key={e.niu}
                    entreprise={e}
                    actuel={e.niu === entrepriseCourante?.niu}
                    onChoix={choisir}
                  />
                ))}
              </>
            ) : resultats.length === 0 ? (
              <p className="selecteur__vide">
                Aucun dossier ne correspond à «&nbsp;{requete}&nbsp;».
                <br />
                La recherche porte sur la dénomination et le NIU.
              </p>
            ) : (
              resultats.map((e) => (
                <Option
                  key={e.niu}
                  entreprise={e}
                  actuel={e.niu === entrepriseCourante?.niu}
                  onChoix={choisir}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionTousDossiers({
  actuel,
  onChoix,
}: {
  actuel: boolean;
  onChoix: (e: Dossier | null) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={actuel}
      className="selecteur__option"
      onClick={() => onChoix(null)}
    >
      <span style={{ font: "600 13px/1.3 var(--police-texte)", color: "var(--ink-900)" }}>
        Tous les dossiers
        <span
          style={{
            display: "block",
            font: "400 11.5px/1.4 var(--police-texte)",
            color: "var(--ink-500)",
          }}
        >
          Vue consolidée du portefeuille
        </span>
      </span>
    </button>
  );
}

function Option({
  entreprise,
  actuel,
  onChoix,
}: {
  entreprise: Dossier;
  actuel: boolean;
  onChoix: (e: Dossier) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={actuel}
      className="selecteur__option"
      onClick={() => onChoix(entreprise)}
    >
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            font: "500 13px/1.3 var(--police-texte)",
            color: "var(--ink-900)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entreprise.denomination}
        </span>
        <span
          className="tabulaire"
          style={{ font: "400 11.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}
        >
          {entreprise.niu}
          {entreprise.siege ? ` · ${entreprise.siege}` : ""}
        </span>
      </span>
      <span
        style={{
          flex: "none",
          padding: "2px 7px",
          borderRadius: "var(--rayon-pilule)",
          background:
            entreprise.regime === "REEL" ? "var(--brand-indigo-100)" : "var(--surface-alt)",
          color: entreprise.regime === "REEL" ? "var(--brand-indigo-700)" : "var(--ink-500)",
          border: entreprise.regime === "REEL" ? "none" : "1px solid var(--line-200)",
          font: "600 10.5px/1.4 var(--police-texte)",
        }}
      >
        {entreprise.regime === "REEL" ? "Réel" : "IGS"}
      </span>
    </button>
  );
}
