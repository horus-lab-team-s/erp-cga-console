"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";
import { FormulaireDemarche } from "./FormulaireDemarche";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Héros de l'accueil — maquette `Site vitrine CGA`.
 *
 * Trois vues qui défilent seules toutes les 5 secondes, **chacune avec son
 * propre bouton** vers une page différente : la création, l'adhésion, le
 * cabinet. C'est ce qui distingue ce carrousel d'un diaporama décoratif.
 *
 * Trois éléments sont posés par-dessus la photographie et gardent des fonds
 * fixes, sans jeton de thème : le formulaire, les cartes de chiffres et les
 * puces. Basculer en sombre ne doit pas changer ce qui se marie avec l'image.
 */

const VUES = [
  { cle: "slide1", href: "/creer-mon-entreprise", image: "/images/heros/slide-1.jpg" },
  { cle: "slide2", href: "/devenir-adherent", image: "/images/heros/slide-2.jpg" },
  { cle: "slide3", href: "/le-cabinet", image: "/images/heros/slide-3.jpg" },
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

  return (
    <section
      className="heros"
      aria-roledescription="carrousel"
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
    >
      {/* Les trois vues sont montées en permanence et se fondent l'une dans
          l'autre : les recharger à chaque passage ferait clignoter le fond sur
          connexion lente. */}
      {VUES.map((vue, i) => (
        <div
          key={vue.cle}
          className="heros__vue"
          style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 2 : 1 }}
          aria-hidden={i !== index}
        >
          <Image
            src={vue.image}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="heros__image"
          />
          <div className="heros__voile" />
        </div>
      ))}

      <div className="heros__contenu" style={{ zIndex: 4 }}>
        <div className="heros__texte">
          <span className="heros__kicker">{t(`${VUES[index].cle}.kicker`)}</span>
          <h1 className="heros__titre">{t(`${VUES[index].cle}.titre`)}</h1>
          <p className="heros__detail">{t(`${VUES[index].cle}.detail`)}</p>
          <Link
            href={VUES[index].href}
            className="bouton bouton--principal heros__action"
            onFocus={() => setEnPause(true)}
          >
            {t(`${VUES[index].cle}.action`)}
            <IconeVitrine nom="fleche" taille={17} />
          </Link>
        </div>

        <div className="heros__colonne-formulaire">
          <FormulaireDemarche onInteraction={() => setEnPause(true)} />
        </div>
      </div>

      {/* Cartes de chiffres, au bas de la bannière. */}
      <div className="heros__chiffres">
        {CHIFFRES.map((chiffre) => (
          <div key={chiffre.cle} className="chiffre">
            <span className="chiffre__icone">
              <IconeVitrine nom={chiffre.icone} taille={19} epaisseur={1.6} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="chiffre__valeur">{chiffres(`${chiffre.cle}.valeur`)}</span>
              <span className="chiffre__label">{chiffres(`${chiffre.cle}.label`)}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Puces centrées : la vue active s'allonge et respire. */}
      <div className="heros__puces" role="tablist" aria-label="Vues">
        {VUES.map((vue, i) => (
          <button
            key={vue.cle}
            type="button"
            role="tab"
            className="heros__puce"
            aria-current={i === index}
            aria-label={t(`${vue.cle}.titre`)}
            onClick={() => {
              setIndex(i);
              setEnPause(true);
            }}
          />
        ))}
      </div>
    </section>
  );
}
