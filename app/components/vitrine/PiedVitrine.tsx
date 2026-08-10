import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { FORMES_JURIDIQUES, lienForme } from "@/app/lib/services-vitrine";
import { IconeVitrine } from "./IconeVitrine";
import { Infolettre } from "./Infolettre";

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
          <div>
            <p style={{ margin: "0 0 10px", font: "600 16px/1.3 var(--police-titre)", color: "#fff" }}>
              {commun("cabinet.nom")}
            </p>
            <p style={{ margin: 0, font: "400 13.5px/1.7 var(--police-texte)", maxWidth: "48ch" }}>
              {t("description")}
            </p>
            <p
              style={{
                margin: "16px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                font: "400 14px/1.5 var(--police-texte)",
              }}
            >
              <a href={`tel:${commun("cabinet.telephone").replace(/\s/g, "")}`}>
                {commun("cabinet.telephone")}
              </a>
              <a href={`mailto:${commun("cabinet.courriel")}`}>{commun("cabinet.courriel")}</a>
            </p>
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
              <li>
                <Link href="/contact">{t("domiciliation")}</Link>
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
              <li>
                <Link href="/contact">{t("contactezNous")}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pied-vitrine__lien">
          <Infolettre />

          <div>
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
            <p className="reseaux__numero">
              <a href="https://wa.me/237699902184" target="_blank" rel="noopener noreferrer">
                +237 699 902 184
              </a>
            </p>
          </div>
        </div>

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

        <p
          style={{
            margin: "18px 0 0",
            font: "400 12px/1.6 var(--police-texte)",
            color: "rgb(255 255 255 / 55%)",
          }}
        >
          {commun("cabinet.agrement")}
        </p>
      </div>
    </footer>
  );
}
