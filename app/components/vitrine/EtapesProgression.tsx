"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/**
 * « Comment ça se passe » — les trois étapes du parcours.
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

const ETAPES = ["etape1", "etape2", "etape3"] as const;

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

export function EtapesProgression() {
  const t = useTranslations("vitrine.etapes");
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
  const atteintes = mouvementReduit ? ETAPES.length : franchies;

  // Le rail court d'une pastille à l'autre : avec trois étapes il a deux
  // segments, et la première étape le laisse donc à zéro.
  const remplissage = Math.max(0, (atteintes - 1) / (ETAPES.length - 1)) * 100;

  return (
    <div className="etapes">
      <span className="etapes__rail" aria-hidden="true">
        <span style={{ width: `${remplissage}%` }} />
      </span>

      {ETAPES.map((cle, index) => (
        <article
          key={cle}
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
              {index + 1} / {ETAPES.length}
            </span>
          </div>
          <h3
            style={{
              margin: 0,
              font: "600 17px/1.35 var(--police-titre)",
              color: "var(--ink-900)",
            }}
          >
            {t(`${cle}.titre`)}
          </h3>
          <p
            style={{
              margin: 0,
              font: "400 14px/1.65 var(--police-texte)",
              color: "var(--ink-500)",
              textWrap: "pretty",
            }}
          >
            {t(`${cle}.detail`)}
          </p>
        </article>
      ))}
    </div>
  );
}
