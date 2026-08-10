import Image from "next/image";
import { useTranslations } from "next-intl";

import { IconeVitrine } from "./IconeVitrine";

/**
 * Témoignages en ruban à défilement automatique.
 *
 * Le défilement est **purement CSS**, sans minuterie JavaScript : une animation
 * sur `transform` est exécutée par le compositeur du navigateur, ce qui la rend
 * fluide même sur un téléphone d'entrée de gamme — précisément le parc visé.
 *
 * La liste est **rendue deux fois**. L'animation translate le ruban de la moitié
 * exacte de sa largeur, ce qui ramène la seconde copie là où commençait la
 * première : la boucle se referme sans saut visible.
 *
 * Le ruban s'arrête au survol et au focus clavier — on ne lit pas un texte qui
 * glisse — et ne démarre pas si le visiteur a demandé de réduire les animations,
 * auquel cas la bande redevient simplement défilable au doigt.
 */

const TEMOINS = [
  { cle: "t1", portrait: "/images/temoignages/temoin-1.jpg" },
  { cle: "t2", portrait: "/images/temoignages/temoin-2.jpg" },
  { cle: "t3", portrait: "/images/temoignages/temoin-3.jpg" },
  { cle: "t4", portrait: "/images/temoignages/temoin-4.jpg" },
] as const;

/** Environ onze secondes par carte : assez lent pour être lu au passage. */
const SECONDES_PAR_CARTE = 11;

export function RubanTemoignages() {
  const t = useTranslations("vitrine.temoins");
  const duree = TEMOINS.length * SECONDES_PAR_CARTE;

  return (
    <section className="section section--teinte section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>

        <div
          className="temoins"
          style={{ ["--duree-defilement" as string]: `${duree}s` }}
          tabIndex={0}
          role="group"
          aria-label={t("titre")}
        >
          <div className="temoins__ruban">
            {[0, 1].map((copie) =>
              TEMOINS.map((temoin) => (
                <figure
                  key={`${copie}-${temoin.cle}`}
                  className="temoin"
                  /* La seconde copie est un doublon décoratif : la masquer aux
                     technologies d'assistance évite de lire deux fois la même
                     citation. */
                  aria-hidden={copie === 1}
                >
                  <span className="temoin__guillemet">
                    <IconeVitrine nom="guillemet" taille={26} epaisseur={1.5} />
                  </span>
                  <blockquote className="temoin__texte">{t(`${temoin.cle}.texte`)}</blockquote>
                  <figcaption className="temoin__auteur">
                    <Image
                      src={temoin.portrait}
                      alt=""
                      width={44}
                      height={44}
                      className="temoin__portrait"
                    />
                    <span>
                      <span
                        style={{
                          display: "block",
                          font: "600 13.5px/1.3 var(--police-texte)",
                          color: "var(--ink-900)",
                        }}
                      >
                        {t(`${temoin.cle}.nom`)}
                      </span>
                      <span
                        style={{
                          display: "block",
                          font: "400 12.5px/1.4 var(--police-texte)",
                          color: "var(--ink-500)",
                        }}
                      >
                        {t(`${temoin.cle}.role`)}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              )),
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
