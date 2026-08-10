"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

const SLIDES = ["slide1", "slide2", "slide3"] as const;

/** Durée d'affichage d'une vue avant passage à la suivante. */
const CADENCE = 7000;

/**
 * Carrousel d'ouverture.
 *
 * Il avance seul, mais **s'arrête dès qu'on interagit avec lui** — survol, focus
 * clavier, ou choix explicite d'une vue. Un carrousel qui reprend sa course pendant
 * qu'on lit le texte est une des façons les plus sûres de faire quitter une page.
 *
 * Le défilement automatique est également désactivé si le visiteur a demandé de
 * réduire les animations.
 */
export function Heros() {
  const t = useTranslations("vitrine.heros");
  const commun = useTranslations("commun");
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);

  useEffect(() => {
    if (enPause) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const minuterie = window.setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      CADENCE,
    );
    return () => window.clearInterval(minuterie);
  }, [enPause]);

  const cle = SLIDES[index];

  return (
    <section
      className="heros"
      aria-roledescription="carrousel"
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocusCapture={() => setEnPause(true)}
    >
      {/* Toutes les vues sont montées, seule l'active est visible : recharger une
          photo à chaque passage ferait clignoter le fond sur connexion lente. */}
      {SLIDES.map((slide, i) => (
        <Image
          key={slide}
          src={t(`${slide}.image`)}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className="heros__image"
          style={{ opacity: i === index ? 1 : 0, transition: "opacity .6s ease" }}
        />
      ))}
      <div className="heros__voile" />

      <div className="bloc heros__contenu">
        <span className="kicker heros__kicker">{t(`${cle}.kicker`)}</span>
        <h1 className="heros__titre">{t(`${cle}.titre`)}</h1>
        <p className="heros__detail">{t(`${cle}.detail`)}</p>

        <div className="heros__actions">
          <Link href="/estimation" className="bouton bouton--principal">
            {commun("actions.estimerProjet")}
          </Link>
          <Link href="/nos-services" className="bouton bouton--clair">
            {commun("actions.decouvrir")}
          </Link>
        </div>

        <div className="heros__puces" role="tablist" aria-label="Vues">
          {SLIDES.map((slide, i) => (
            <button
              key={slide}
              type="button"
              role="tab"
              className="heros__puce"
              aria-current={i === index}
              aria-label={t(`${slide}.titre`)}
              onClick={() => {
                setIndex(i);
                setEnPause(true);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
