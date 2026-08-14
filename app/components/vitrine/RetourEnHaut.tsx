"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { IconeVitrine } from "./IconeVitrine";

/**
 * La flèche de retour en haut de page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI ELLE EXISTE
 *
 * Les pages de la vitrine sont longues — l'accueil compte six sections, un
 * article de blog davantage. Arrivé au pied, le visiteur qui veut changer de
 * rubrique n'a que le défilement inverse, et sur un téléphone cela fait plusieurs
 * secondes de balayage. La flèche le ramène à l'en-tête d'un geste.
 *
 * QUAND ELLE APPARAÎT
 *
 * Au-delà d'un écran et demi de défilement, pas avant. Un bouton « remonter »
 * affiché alors qu'on est déjà en haut ne sert à rien et masque du contenu. Le
 * seuil est exprimé en hauteurs de fenêtre plutôt qu'en pixels : il vaut alors
 * la même chose sur un téléphone et sur un grand écran.
 *
 * OÙ ELLE SE POSE
 *
 * En bas à droite, et **au-dessus du bandeau d'annonce** en hauteur : les deux
 * occupent le bas de la fenêtre, et il ne faut pas que la flèche recouvre le
 * bouton de fermeture de l'annonce. C'est réglé par la marge basse dans la
 * feuille de style, pas ici.
 *
 * LE MOUVEMENT
 *
 * `scrollTo` avec `behavior: "smooth"`, sauf si le visiteur a demandé moins
 * d'animation — auquel cas le saut est immédiat. Un défilement animé de plusieurs
 * écrans est précisément ce que ce réglage vise.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Seuil d'apparition, en hauteurs de fenêtre. */
const SEUIL_ECRANS = 1.5;

export function RetourEnHaut() {
  const t = useTranslations("commun.actions");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const surDefilement = () => setVisible(window.scrollY > window.innerHeight * SEUIL_ECRANS);
    surDefilement();
    // `passive` : l'écouteur ne bloque jamais le défilement, ce qui se sent sur
    // un téléphone d'entrée de gamme.
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
    };
  }, []);

  function remonter() {
    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: mouvementReduit ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className="retour-haut"
      data-visible={visible ? "oui" : "non"}
      onClick={remonter}
      /* Retirée du parcours clavier tant qu'elle est invisible : sans cela, la
         tabulation s'arrêterait sur un bouton que personne ne voit. */
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label={t("retourHaut")}
      title={t("retourHaut")}
    >
      <IconeVitrine nom="chevronBas" taille={20} epaisseur={2} />
    </button>
  );
}
