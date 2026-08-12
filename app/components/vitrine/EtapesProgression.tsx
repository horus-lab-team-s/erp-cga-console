"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Un parcours en étapes, dont la progression se ressent à la lecture.
 *
 * Les cartes ne se contentent pas d'être numérotées : elles **s'allument à
 * mesure qu'on les atteint**. Un rail continu relie les trois pastilles et se
 * remplit derrière le lecteur, si bien que la progression se ressent en lisant
 * au lieu de se déduire d'un « 2 / 3 ».
 *
 * Le franchissement est observé, pas calculé au défilement : un
 * `IntersectionObserver` ne réveille le fil principal qu'aux moments utiles,
 * là où un écouteur `scroll` recalculerait des positions à chaque image.
 *
 * La progression ne **redescend jamais** : remonter la page ne doit pas éteindre
 * ce qui a déjà été lu.
 */

export type Etape = { titre: string; detail: string };

/** Une étape compte comme atteinte quand elle est à plus de moitié visible. */
const SEUIL = 0.55;

const REQUETE_MOUVEMENT = "(prefers-reduced-motion: reduce)";

function sAbonnerAuMouvement(rappel: () => void) {
  const requete = window.matchMedia(REQUETE_MOUVEMENT);
  requete.addEventListener("change", rappel);
  return () => requete.removeEventListener("change", rappel);
}

const lireMouvement = () => window.matchMedia(REQUETE_MOUVEMENT).matches;

/** Au rendu serveur on suppose le mouvement autorisé ; le client tranche. */
const lireMouvementServeur = () => false;

export function EtapesProgression({ etapes }: { etapes: Etape[] }) {
  const cartes = useRef<Array<HTMLElement | null>>([]);
  const [franchies, setFranchies] = useState(0);

  const mouvementReduit = useSyncExternalStore(
    sAbonnerAuMouvement,
    lireMouvement,
    lireMouvementServeur,
  );

  useEffect(() => {
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue;
          const rang = Number((entree.target as HTMLElement).dataset.rang);
          setFranchies((atteintes) => Math.max(atteintes, rang));
        }
      },
      { threshold: SEUIL },
    );
    for (const carte of cartes.current) if (carte) observateur.observe(carte);
    return () => observateur.disconnect();
  }, []);

  // Sans animation, tout est donné d'emblée : la mise en scène disparaît, pas
  // l'information.
  const atteintes = mouvementReduit ? etapes.length : franchies;

  // Le rail court d'une pastille à l'autre : avec n étapes il a n − 1 segments,
  // et la première les laisse donc tous à zéro.
  const remplissage =
    etapes.length > 1 ? Math.max(0, (atteintes - 1) / (etapes.length - 1)) * 100 : 0;

  return (
    // Le nombre de colonnes est transmis au style : c'est lui qui cale les
    // extrémités du rail sur le centre des pastilles extrêmes, quel que soit le
    // nombre d'étapes.
    <div className="etapes" style={{ ["--colonnes" as string]: etapes.length }}>
      <span className="etapes__rail" aria-hidden="true">
        <span style={{ width: `${remplissage}%` }} />
      </span>

      {etapes.map((etape, index) => (
        <article
          key={etape.titre}
          ref={(element) => {
            cartes.current[index] = element;
          }}
          data-rang={index + 1}
          data-atteinte={index + 1 <= atteintes}
          className="etape"
        >
          <div className="etape__entete">
            <span className="etape__rang" aria-hidden="true">
              {index + 1}
            </span>
            <span className="etape__barre" aria-hidden="true">
              <span
                className="etape__progression"
                style={{ width: index + 1 <= atteintes ? "100%" : "0%" }}
              />
            </span>
            <span className="etape__compte">
              {index + 1} / {etapes.length}
            </span>
          </div>
          <h3
            style={{
              margin: 0,
              font: "600 17px/1.35 var(--police-titre)",
              color: "var(--ink-900)",
            }}
          >
            {etape.titre}
          </h3>
          <p
            style={{
              margin: 0,
              font: "400 14px/1.65 var(--police-texte)",
              color: "var(--ink-500)",
              textWrap: "pretty",
            }}
          >
            {etape.detail}
          </p>
        </article>
      ))}
    </div>
  );
}
