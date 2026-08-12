import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { lireInstitutions } from "@/app/lib/contenu-vitrine";

/**
 * Ruban des institutions, à défilement automatique.
 *
 * La liste vient du backend — le cabinet peut donc en ajouter une, ou en retirer
 * une, sans qu'on recompile. Le composant est asynchrone pour cela : il lit son
 * contenu lui-même plutôt que d'obliger chaque page qui l'affiche à le lui
 * passer.
 *
 * Même mécanique que les témoignages : animation CSS sur `transform`, exécutée
 * par le compositeur, donc fluide sur un téléphone d'entrée de gamme. La liste
 * est rendue deux fois et le ruban translate de la moitié de sa largeur, ce qui
 * ramène la seconde copie là où commençait la première : la boucle se referme
 * sans saut.
 *
 * Chaque logo est un lien vers le site de l'institution, ouvert dans un nouvel
 * onglet — on ne fait pas quitter la vitrine à un visiteur en cours de lecture.
 *
 * Les logos sont en niveaux de gris au repos et reprennent leurs couleurs au
 * survol. Ce n'est pas un effet : quatre chartes graphiques différentes alignées
 * en pleine couleur sur une même bande tirent l'œil dans quatre directions et
 * écrasent le reste de la page.
 */

const SECONDES_PAR_LOGO = 6;

export async function RubanPartenaires() {
  const t = await getTranslations("vitrine.partenaires");
  const institutions = await lireInstitutions();
  const duree = institutions.length * SECONDES_PAR_LOGO;

  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>
        <p className="chapeau chapeau--une-ligne">{t("detail")}</p>

        <div
          className="marque-ruban"
          style={{ ["--duree-defilement" as string]: `${duree}s` }}
        >
          <div className="marque-ruban__piste">
            {[0, 1].map((copie) =>
              institutions.map((institution) => (
                <a
                  key={`${copie}-${institution.cle}`}
                  className="marque"
                  href={institution.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={institution.nom}
                  /* La seconde copie est un doublon décoratif : la masquer aux
                     technologies d'assistance évite d'annoncer huit liens là où
                     il n'y en a que quatre, et la retire du parcours clavier. */
                  aria-hidden={copie === 1}
                  tabIndex={copie === 1 ? -1 : undefined}
                >
                  <Image
                    src={institution.logo}
                    alt={institution.nom}
                    width={220}
                    height={110}
                    className="marque__logo"
                    style={
                      institution.rognageBas
                        ? { clipPath: `inset(0 0 ${institution.rognageBas}% 0)` }
                        : undefined
                    }
                  />
                </a>
              )),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
