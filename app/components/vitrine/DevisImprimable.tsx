"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import type { Estimation, FormeJuridique } from "@/app/lib/bareme-creation";
import { dateLongue, montantFcfa } from "@/app/lib/formats";
import { Link } from "@/i18n/navigation";
import { IconeVitrine } from "./IconeVitrine";

/**
 * Le devis mis en page, à l'écran comme sur le papier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN SEUL DOCUMENT, DEUX RENDUS
 *
 * La même page sert à lire à l'écran et à produire un PDF. Il n'y a pas de
 * seconde mise en page à tenir à jour : la feuille de style d'impression retire
 * ce qui n'a pas de sens sur papier — en-tête de navigation, pied, boutons — et
 * le reste s'imprime tel quel.
 *
 * `window.print()` ouvre la boîte d'impression du navigateur, où « Enregistrer
 * au format PDF » est proposé sur toutes les plateformes visées, Android et iOS
 * compris. C'est ce qui permet d'obtenir un PDF sans embarquer de bibliothèque
 * de génération : quelques centaines de kilo-octets épargnés à chaque visiteur,
 * sur des connexions où le kilo-octet compte.
 *
 * POURQUOI UN COMPOSANT CLIENT
 *
 * Pour la seule ligne qui appelle `window.print()`. Tout le reste — le calcul,
 * les montants, les libellés — vient du serveur et n'a besoin de rien.
 *
 * CE QUE LE DOCUMENT DOIT DIRE, ET QUI N'EST PAS NÉGOCIABLE
 *
 * Sa date, et le fait que **ce n'est pas une facture**. Un document chiffré,
 * daté, au nom du cabinet, sera lu comme un engagement s'il ne dit pas le
 * contraire ; les frais officiels dépendent du dossier réel et le barème bouge.
 * La mention est donc en clair, dans le corps, et non en petits caractères.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function DevisImprimable({
  forme,
  capital,
  associes,
  ville,
  domiciliation,
  suivi,
  estimation,
  fraisDomiciliation,
  suiviMensuel,
}: {
  forme: FormeJuridique;
  capital: number;
  associes: number;
  ville: string;
  domiciliation: boolean;
  suivi: boolean;
  estimation: Estimation;
  fraisDomiciliation: number;
  suiviMensuel: number;
}) {
  const t = useTranslations("pages.estimation");
  const commun = useTranslations("commun");

  /**
   * La date du jour, calculée à l'affichage.
   *
   * Un devis sans date ne vaut rien : le lecteur doit pouvoir juger si le barème
   * qui l'a produit est encore d'actualité. Elle est prise chez le visiteur et
   * non au serveur — c'est le jour où *il* consulte qui l'intéresse.
   */
  const aujourdhui = dateLongue(new Date());

  return (
    <main className="devis">
      <div className="bloc bloc--etroit">
        {/* Barre d'actions : elle disparaît à l'impression, elle n'a de sens
            qu'à l'écran. */}
        <div className="devis__actions">
          <Link href="/estimation" className="article__retour">
            <IconeVitrine nom="retour" taille={15} />
            {t("devisRetour")}
          </Link>
          <button
            type="button"
            className="bouton bouton--principal"
            onClick={() => window.print()}
          >
            <IconeVitrine nom="ponctuel" taille={16} />
            {t("devisImprimer")}
          </button>
        </div>

        <article className="devis__feuille">
          <header className="devis__entete">
            {/* Le logo en couleur, et non la version blanche : ce document est
                destiné au papier, où le fond est blanc. */}
            <Image
              src="/marque/cga-logo-couleur.jpg"
              alt={commun("cabinet.nom")}
              width={120}
              height={67}
              style={{ width: 120, height: "auto" }}
            />
            <div className="devis__coordonnees">
              <strong>{commun("cabinet.nom")}</strong>
              <span>{commun("cabinet.agrement")}</span>
              <span>{commun("cabinet.telephone")}</span>
              <span>{commun("cabinet.courriel")}</span>
              <span>{commun("cabinet.siteWeb")}</span>
            </div>
          </header>

          <div className="devis__titre-zone">
            <h1 className="devis__titre">{t("devisTitre")}</h1>
            <p className="devis__date tabulaire">{t("devisDate", { date: aujourdhui })}</p>
          </div>

          <p className="devis__chapeau">{t("devisSousTitre")}</p>

          {/* ── Ce que le visiteur a répondu ── */}
          <h2 className="devis__section">{t("devisHypotheses")}</h2>
          <dl className="devis__hypotheses">
            <div>
              <dt>{t("q1")}</dt>
              <dd>{t(`formes.${forme.code}`)}</dd>
            </div>
            {forme.capitalMin > 0 && (
              <div>
                <dt>{t("q2")}</dt>
                <dd className="tabulaire">{montantFcfa(capital)}</dd>
              </div>
            )}
            {forme.associesMax > 1 && (
              <div>
                <dt>{t("q3")}</dt>
                <dd className="tabulaire">{associes}</dd>
              </div>
            )}
            <div>
              <dt>{t("q4")}</dt>
              <dd>{ville}</dd>
            </div>
          </dl>

          {/* ── Le détail chiffré ── */}
          <h2 className="devis__section">{t("devisDetail")}</h2>
          <table className="devis__table">
            <tbody>
              <tr className="devis__groupe">
                <th colSpan={2}>{t("fraisOfficiels")}</th>
              </tr>
              {estimation.detailOfficiels.map((ligne) => (
                <tr key={ligne.cle}>
                  <td>{t(`lignes.${ligne.cle}`)}</td>
                  <td className="tabulaire devis__montant">{montantFcfa(ligne.montant)}</td>
                </tr>
              ))}
              <tr className="devis__sous-total">
                <td>{t("sousTotal")}</td>
                <td className="tabulaire devis__montant">
                  {montantFcfa(estimation.totalOfficiels)}
                </td>
              </tr>

              <tr className="devis__groupe">
                <th colSpan={2}>{t("nosHonoraires")}</th>
              </tr>
              {/* Les mêmes libellés que l'estimateur : un devis qui nommerait
                  autrement les lignes qu'on vient de lire à l'écran donnerait
                  l'impression de ne pas parler du même dossier. */}
              <tr>
                <td>{t("lignes.honorairesBase")}</td>
                <td className="tabulaire devis__montant">
                  {montantFcfa(estimation.honorairesBase)}
                </td>
              </tr>
              {estimation.majorationAssocies > 0 && (
                <tr>
                  <td>{t("lignes.majorationAssocies")}</td>
                  <td className="tabulaire devis__montant">
                    {montantFcfa(estimation.majorationAssocies)}
                  </td>
                </tr>
              )}
              {domiciliation && (
                <tr>
                  <td>{t("lignes.domiciliation")}</td>
                  <td className="tabulaire devis__montant">{montantFcfa(fraisDomiciliation)}</td>
                </tr>
              )}
              <tr className="devis__sous-total">
                <td>{t("sousTotal")}</td>
                <td className="tabulaire devis__montant">
                  {montantFcfa(estimation.totalHonoraires)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="devis__total">
                <td>{t("totalRegler")}</td>
                <td className="tabulaire devis__montant">{montantFcfa(estimation.total)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="devis__delai">
            {t("delaiAnnonce")} : <strong>{estimation.semaines}</strong> {t("semaines")}
          </p>

          {/* L'abonnement se règle au mois : il ne peut pas entrer dans un total
              à régler une fois, sans quoi le montant du haut serait faux. */}
          {suivi && (
            <p className="devis__option">
              {t("suiviComptable")} — <strong className="tabulaire">
                {montantFcfa(suiviMensuel)}
              </strong>{" "}
              {t("parMois")}. {t("devisSuiviNote")}
            </p>
          )}

          <p className="devis__avertissement">{t("devisAvertissement")}</p>

          <footer className="devis__pied">{t("devisPied")}</footer>
        </article>
      </div>
    </main>
  );
}
