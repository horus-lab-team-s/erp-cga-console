"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";
import { FormulaireDemarche } from "./FormulaireDemarche";

/**
 * Héros de l'accueil — maquette `Site vitrine CGA`.
 *
 * Trois vues, **chacune avec son propre bouton** vers une page différente : la
 * création, l'adhésion, le cabinet. C'est ce qui distingue ce carrousel d'un
 * diaporama décoratif — chaque vue a une destination.
 *
 * Le formulaire « Lancer une démarche » est posé à droite, dans le héros, et les
 * quatre chiffres clés courent sous le texte.
 */

const VUES = [
  {
    cle: "slide1",
    href: "/creer-mon-entreprise",
    image: "/images/heros/reunion-equipe.jpg",
  },
  {
    cle: "slide2",
    href: "/devenir-adherent",
    image: "/images/heros/mains-levees.jpg",
  },
  {
    cle: "slide3",
    href: "/le-cabinet",
    image: "/images/heros/rue-commercante.jpg",
  },
] as const;

const CHIFFRES = [
  { cle: "creation", icone: "immeuble" },
  { cle: "entrepreneurs", icone: "equipe" },
  { cle: "agrement", icone: "agrement" },
  { cle: "cible", icone: "boutique" },
] as const;

/** Cadence du dessin : une vue toutes les 5 secondes. */
const CADENCE = 5000;

export function Heros() {
  const t = useTranslations("vitrine.heros");
  const chiffres = useTranslations("vitrine.chiffres");
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);

  useEffect(() => {
    if (enPause) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const minuterie = window.setInterval(() => setIndex((i) => (i + 1) % VUES.length), CADENCE);
    return () => window.clearInterval(minuterie);
  }, [enPause]);

  const vue = VUES[index];

  return (
    <section
      className="heros"
      aria-roledescription="carrousel"
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocusCapture={() => setEnPause(true)}
    >
      {/* Les trois photographies sont montées en permanence, seule l'active est
          visible : les recharger à chaque passage ferait clignoter le fond sur
          connexion lente. */}
      {VUES.map((v, i) => (
        <Image
          key={v.cle}
          src={v.image}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className="heros__image"
          style={{ opacity: i === index ? 1 : 0, transition: "opacity .6s ease" }}
        />
      ))}
      <div className="heros__voile" />

      <div className="bloc heros__corps">
        <div className="heros__texte">
          <span className="kicker heros__kicker">{t(`${vue.cle}.kicker`)}</span>
          <h1 className="heros__titre">{t(`${vue.cle}.titre`)}</h1>
          <p className="heros__detail">{t(`${vue.cle}.detail`)}</p>

          <Link href={vue.href} className="bouton bouton--principal bouton--large heros__action">
            {t(`${vue.cle}.action`)}
            <IconeVitrine nom="fleche" taille={16} />
          </Link>

          <div className="heros__chiffres">
            {CHIFFRES.map((chiffre) => (
              <div key={chiffre.cle} className="chiffre">
                <span className="chiffre__icone">
                  <IconeVitrine nom={chiffre.icone} taille={18} epaisseur={1.6} />
                </span>
                <span>
                  <span className="chiffre__valeur">{chiffres(`${chiffre.cle}.valeur`)}</span>
                  <span className="chiffre__label">{chiffres(`${chiffre.cle}.label`)}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="heros__puces" role="tablist" aria-label="Vues">
            {VUES.map((v, i) => (
              <button
                key={v.cle}
                type="button"
                role="tab"
                className="heros__puce"
                aria-current={i === index}
                aria-label={t(`${v.cle}.titre`)}
                onClick={() => {
                  setIndex(i);
                  setEnPause(true);
                }}
              />
            ))}
          </div>
        </div>

        <FormulaireDemarche />
      </div>
    </section>
  );
}
