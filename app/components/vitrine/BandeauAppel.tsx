import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";
import { Infolettre } from "./Infolettre";

/**
 * Bandeau d'appel à contact — « Parlons de votre projet dès aujourd'hui ».
 *
 * Dans la maquette il vit **hors des pages**, entre le contenu et le pied : il
 * apparaît donc au bas de chacune des pages. Le placer dans l'accueil, comme je
 * l'avais fait, le faisait disparaître partout ailleurs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSITION SUR L'AXE CENTRAL
 *
 * Titre, phrase, puis les deux boutons **en dessous**, centrés. La version
 * précédente posait le texte à gauche et les boutons à droite : sur un écran
 * large, un mètre séparait la phrase de l'action qu'elle appelait, et le regard
 * devait traverser le vide pour les relier. Empilés et centrés, ils se lisent
 * d'un seul mouvement descendant.
 *
 * La phrase tient sur **une ligne au-delà de 1100 px** — classe
 * `chapeau--une-ligne`, qui interdit le retour à la ligne et lie la taille du
 * texte à la largeur de la fenêtre. En dessous, elle se replie d'elle-même sur
 * deux ou trois lignes selon la place.
 *
 * DEUX BOUTONS, DEUX POIDS
 *
 * WhatsApp en magenta : c'est le canal par lequel arrivent la plupart des
 * demandes. Le rendez-vous en clair : même taille, moins de poids. Deux boutons
 * de la même couleur ne hiérarchiseraient plus rien.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BandeauAppel() {
  const t = useTranslations("vitrine.cta");
  const commun = useTranslations("commun");
  const numero = commun("cabinet.whatsapp").replace(/[^\d]/g, "");

  return (
    <section className="appel">
      <div className="bloc appel__contenu">
        <h2 className="appel__titre">{t("titre")}</h2>
        <p className="appel__detail chapeau--une-ligne">{t("detail")}</p>

        <div className="appel__actions">
          <a
            href={`https://wa.me/${numero}`}
            className="bouton bouton--principal bouton--large"
            target="_blank"
            rel="noreferrer noopener"
          >
            <IconeVitrine nom="whatsapp" taille={16} />
            {t("whatsapp")}
          </a>
          <Link href="/contact" className="bouton bouton--clair bouton--large">
            {t("rendezVous")}
          </Link>
        </div>

        {/* L'infolettre, ici et nulle part ailleurs.
            Elle occupait la moitié du pied de page, sur chaque page, avec un
            titre et deux lignes d'explication. Elle arrive mieux à cet endroit :
            après qu'on a donné une raison d'écrire, et sous une forme réduite au
            strict nécessaire — un champ, un bouton. */}
        <Infolettre />
      </div>
    </section>
  );
}
