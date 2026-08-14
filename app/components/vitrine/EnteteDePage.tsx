"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Bandeau d'ouverture des pages intérieures.
 *
 * Même écriture que le héros de l'accueil — photographie sous voile, kicker,
 * titre, chapeau — mais **à la moitié de sa hauteur**. L'accueil doit accrocher ;
 * une page intérieure doit annoncer, puis laisser lire. Lui donner tout l'écran
 * repoussait le contenu sous la ligne de flottaison à chaque visite.
 *
 * Les vues défilent seules, comme sur l'accueil. Seule l'image change : le titre
 * est celui de la page et n'a aucune raison de bouger. C'est ce qui distingue ce
 * bandeau du carrousel de l'accueil, où chaque vue porte son propre message et
 * son propre bouton.
 *
 * Une seule image, et le bandeau redevient fixe : ni puces, ni minuterie.
 */

/** Cadence du défilement. Plus lente que l'accueil : rien n'y est à cliquer. */
const CADENCE = 6500;

export function EnteteDePage({
  kicker,
  titre,
  detail,
  images,
  enfants,
  detailSurDeuxLignes = false,
}: {
  kicker: string;
  titre: string;
  detail: string;
  images: string[];
  enfants?: React.ReactNode;
  /**
   * Force le chapeau à tenir sur **deux lignes** sur grand écran.
   *
   * Le nombre de lignes ne se décrète pas, il se règle par la largeur de ligne
   * disponible : on élargit donc la colonne de lecture et on demande à
   * `text-wrap: balance` de répartir les deux lignes à longueur voisine. Sur
   * mobile, la contrainte tombe d'elle-même et le texte se replie sur ce qu'il
   * faut de lignes — trois ou quatre selon l'appareil, ce qui est le bon
   * comportement : deux lignes sur un téléphone donneraient des caractères
   * minuscules.
   */
  detailSurDeuxLignes?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const anime = images.length > 1;

  useEffect(() => {
    if (!anime) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const minuterie = window.setTimeout(
      () => setIndex((i) => (i + 1) % images.length),
      CADENCE,
    );
    return () => window.clearTimeout(minuterie);
  }, [anime, index, images.length]);

  return (
    <section
      className="entete-page"
      aria-roledescription={anime ? "carrousel" : undefined}
    >
      {/* Toutes les vues restent montées et se fondent l'une dans l'autre : les
          recharger à chaque passage ferait clignoter le fond sur connexion
          lente. */}
      {images.map((source, i) => (
        <div
          key={source}
          className="heros__vue"
          style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 2 : 1 }}
          aria-hidden={i !== index}
        >
          <Image
            src={source}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="heros__image"
          />
          <div className="heros__voile" />
        </div>
      ))}

      <div className="bloc entete-page__contenu">
        <span className="heros__kicker">{kicker}</span>
        <h1 className="heros__titre">{titre}</h1>
        <p
          className={`heros__detail${detailSurDeuxLignes ? " heros__detail--deux-lignes" : ""}`}
        >
          {detail}
        </p>
        {enfants}
      </div>

      {anime && (
        <div className="heros__puces" role="tablist" aria-label={titre}>
          {images.map((source, i) => (
            <button
              key={source}
              type="button"
              role="tab"
              className="heros__puce"
              aria-current={i === index}
              aria-label={`${titre}, vue ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
