import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.creation" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page « Créer mon entreprise » — maquette, section `surCreation`.
 *
 * C'est le produit d'appel du cabinet : la moitié des visiteurs arrivent par là.
 * Elle répond donc aux deux questions du porteur de projet, dans l'ordre où il se
 * les pose, et à aucune autre :
 *
 * 1. `PiecesDuDossier` — « que dois-je fournir ? ». La liste est nommée,
 *    concrète, sans renvoi vers un conseiller : un visiteur qui ne sait pas ce
 *    qu'on va lui demander ne va pas plus loin.
 * 2. `Questions` — la foire aux questions, en `<details>` natifs. Posée au milieu
 *    de la page mais lue au fer à gauche (`pile-centree`) : une réponse de quatre
 *    lignes centrée se lit mal, ses débuts de ligne ne s'alignent plus.
 *
 * Le prix n'est pas sur cette page : il est à l'estimateur, où il se calcule sur
 * la situation réelle du visiteur. Un montant affiché ici serait forcément faux
 * pour la moitié des lecteurs.
 */
export default async function CreerMonEntreprise({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Ouverture />
      <PiecesDuDossier />
      <Questions />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.creation");
  const commun = useTranslations("commun");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      images={["/images/pages/creation-a.jpg", "/images/pages/creation-b.jpg"]}
      enfants={
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <Link href="/estimation" className="bouton bouton--principal heros__action">
            {commun("actions.estimerProjet")}
            <IconeVitrine nom="fleche" taille={17} />
          </Link>
          <Link href="/contact" className="bouton bouton--clair heros__action">
            {commun("actions.etreRappele")}
          </Link>
        </div>
      }
    />
  );
}

function PiecesDuDossier() {
  const t = useTranslations("pages.creation");
  const pieces = t.raw("pieces") as string[];
  return (
    <section className="section section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("piecesKicker")}</span>
        <h2 className="titre-section">{t("piecesTitre")}</h2>
        <ol className="liste-numerotee">
          {pieces.map((piece, i) => (
            <li key={piece}>
              <span className="liste-numerotee__rang" aria-hidden="true">
                {i + 1}
              </span>
              {piece}
            </li>
          ))}
        </ol>
        <p className="chapeau">{t("piecesNote")}</p>
      </div>
    </section>
  );
}

function Questions() {
  const t = useTranslations("pages.creation");
  const faq = t.raw("faq") as { q: string; r: string }[];
  return (
    <section className="section section--teinte section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("faqKicker")}</span>
        <h2 className="titre-section">{t("faqTitre")}</h2>
        {/* Posée au milieu, mais au fer à gauche à l'intérieur : une réponse de
            quatre lignes centrée se lit mal. */}
        <div
          className="pile-centree"
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}
        >
          {faq.map((item) => (
            <details key={item.q} className="question">
              <summary>{item.q}</summary>
              <p className="question__reponse">{item.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
