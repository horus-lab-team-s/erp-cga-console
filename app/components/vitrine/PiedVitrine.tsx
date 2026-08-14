import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { FORMES_JURIDIQUES, lienForme } from "@/app/lib/services-vitrine";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Pied de page.
 *
 * Il porte l'agrément ministériel en toutes lettres : c'est ce qui distingue un
 * centre de gestion agréé d'un cabinet ordinaire, et un visiteur qui compare deux
 * prestataires le cherche.
 *
 * Il porte aussi les deux façons de rester en lien : l'infolettre, qui aboutit
 * dans la boîte du cabinet, et les comptes publics.
 */

/**
 * Comptes publics du cabinet. Le numéro WhatsApp est écrit deux fois : sans
 * espaces pour `wa.me`, qui n'accepte rien d'autre, et lisiblement à l'écran.
 */
const RESEAUX = [
  {
    cle: "facebook",
    icone: "facebook",
    libelle: "Facebook",
    href: "https://web.facebook.com/CGABroadRangeConsulting/?locale=fr_FR",
  },
  {
    cle: "linkedin",
    icone: "linkedin",
    libelle: "LinkedIn",
    href: "https://cm.linkedin.com/company/cga-broad-range-consulting",
  },
  {
    cle: "whatsapp",
    icone: "whatsappPlein",
    libelle: "WhatsApp",
    href: "https://wa.me/237699902184",
  },
] as const;
export function PiedVitrine() {
  const t = useTranslations("vitrine.pied");
  const nav = useTranslations("vitrine.nav");
  const mega = useTranslations("vitrine.megaMenu");
  const commun = useTranslations("commun");
  const annee = 2026;

  return (
    <footer className="pied-vitrine">
      <div className="bloc">
        <div className="pied-vitrine__grille">
          {/* ── Première colonne : le nom, la phrase, et les comptes publics ──
              Elle portait aussi le téléphone fixe et le courriel du cabinet. Ils
              en sont retirés : la barre utilitaire les affiche déjà en haut de
              chaque page, et elle est désormais **fixe** — donc visible à tout
              moment, y compris au bas d'un article. Les répéter ici ne servait
              qu'à allonger le pied.

              Les réseaux, eux, remontent dans cette colonne : ils occupaient
              plus bas une bande à eux seuls, encadrée de deux filets, pour trois
              logos et un numéro. */}
          <div className="pied-vitrine__identite">
            <p className="pied-vitrine__nom">{commun("cabinet.nom")}</p>
            <p className="pied-vitrine__description">{t("description")}</p>

            <h2 className="pied-vitrine__titre">{t("reseaux")}</h2>
            <ul className="reseaux" aria-label={t("reseaux")}>
              {RESEAUX.map((reseau) => (
                <li key={reseau.cle}>
                  <a
                    className="reseaux__lien"
                    href={reseau.href}
                    target="_blank"
                    /* `noreferrer` autant que `noopener` : on n'envoie pas
                       l'adresse de la page consultée à un tiers. */
                    rel="noopener noreferrer"
                    aria-label={reseau.libelle}
                    title={reseau.libelle}
                  >
                    <IconeVitrine nom={reseau.icone} taille={19} plein />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Créer — les six formes, chacune vers l'estimateur pré-rempli. */}
          <div>
            <h2 className="pied-vitrine__titre">{t("creerTitre")}</h2>
            <ul className="pied-vitrine__liste">
              {FORMES_JURIDIQUES.map((forme) => (
                <li key={forme.cle}>
                  <Link href={lienForme(forme)}>{mega(`formes.${forme.cle}`)}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Gérer — la vie de l'entreprise une fois créée. Suivi comptable et
              déclaration annuelle sont deux volets de l'adhésion : ils pointent
              sur les formules, pas sur des pages qui n'existent pas. */}
          <div>
            <h2 className="pied-vitrine__titre">{t("gererTitre")}</h2>
            <ul className="pied-vitrine__liste">
              <li>
                <Link href="/devenir-adherent">{nav("adherent")}</Link>
              </li>
              <li>
                <Link href="/devenir-adherent#formules">{t("suiviComptable")}</Link>
              </li>
              <li>
                <Link href="/devenir-adherent#formules">{t("declarationAnnuelle")}</Link>
              </li>
              {/* La domiciliation a désormais sa fiche : elle renvoyait vers
                  Contact du temps où elle n'en avait pas. */}
              <li>
                <Link href="/services/domiciliation">{t("domiciliation")}</Link>
              </li>
              <li>
                <Link href="/formations">{nav("formations")}</Link>
              </li>
              <li>
                <Link href="/estimation">{nav("estimation")}</Link>
              </li>
              <li>
                <Link href="/connexion">{commun("actions.espaceClient")}</Link>
              </li>
            </ul>
          </div>

          {/* Le cabinet — les quatre sections de la page, atteintes par ancre. */}
          <div>
            <h2 className="pied-vitrine__titre">{t("cabinetTitre")}</h2>
            <ul className="pied-vitrine__liste">
              <li>
                <Link href="/le-cabinet#histoire">{t("notreHistoire")}</Link>
              </li>
              <li>
                <Link href="/le-cabinet#equipe">{t("notreEquipe")}</Link>
              </li>
              <li>
                <Link href="/le-cabinet#agences">{t("nousTrouver")}</Link>
              </li>
              <li>
                <Link href="/le-cabinet#partenaires">{t("nosPartenaires")}</Link>
              </li>
              {/* Le blog est aussi au pied : c'est là que descend un lecteur qui
                  a fini un article et cherche le suivant. */}
              <li>
                <Link href="/blog">{nav("blog")}</Link>
              </li>
              <li>
                <Link href="/contact">{t("contactezNous")}</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* La bande qui portait ici « Suivez-nous », trois logos et un numéro —
            encadrée de deux filets, sur toute la largeur — a été supprimée. Les
            logos ont rejoint la première colonne ; le numéro WhatsApp est déjà
            dans la barre utilitaire, désormais fixe et donc lisible à tout
            moment. Une bande entière pour trois icônes ne se justifiait pas.

            L'agrément ministériel, qui suivait, est parti pour la même raison :
            il figurait pour la troisième fois de la page. */}
        <div className="pied-vitrine__bas">
          <span>
            © {annee} {commun("cabinet.nom")}. {t("droits")}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/mentions-legales">{t("mentions")}</Link>
            <Link href="/confidentialite">{t("confidentialite")}</Link>
            <Link href="/conditions-generales">{t("cgv")}</Link>
          </span>
        </div>

        {/* La signature de l'atelier qui a réalisé le site, centrée en dernière
            ligne. Lien sortant : `noopener noreferrer` comme partout ailleurs. */}
        <p className="pied-vitrine__signature">
          <a href="https://horus-lab.com" target="_blank" rel="noopener noreferrer">
            Powered by <strong>BïdaSoft</strong>
          </a>
        </p>
      </div>
    </footer>
  );
}
