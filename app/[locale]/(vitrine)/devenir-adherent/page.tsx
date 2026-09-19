import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { EtapesProgression } from "@/app/components/vitrine/EtapesProgression";
import { FormulaireService } from "@/app/components/vitrine/FormulaireService";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.adherent" });
  return { title: t("titre"), description: t("detail") };
}

/**
 * Page « Devenir adhérent » — maquette, section `surAdherent`.
 *
 * L'adhésion est l'engagement le plus lourd que le site demande : elle se vend en
 * quatre temps, et l'ordre est l'argumentaire.
 *
 * 1. `Avantages` — ce que le centre agréé apporte, y compris ce qu'aucun cabinet
 *    ordinaire ne peut offrir : l'assistance d'un inspecteur des impôts et les
 *    formations du centre.
 * 2. `Formules` — les niveaux et leurs prix. Après les avantages : un tarif lu
 *    avant ce qu'il achète paraît toujours cher.
 * 3. `Parcours` — les quatre étapes de l'adhésion, rendues par
 *    `EtapesProgression`. Le même dispositif que l'accueil, et pour la même
 *    raison : une adhésion se déroule dans le temps, et c'est ce déroulé qu'il
 *    faut faire sentir — pas quatre encadrés posés côte à côte.
 *
 * `#formules` est une ancre publique : elle est visée depuis le pied de page et
 * depuis le méga-menu. La renommer casserait ces liens.
 */
export default async function DevenirAdherent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { service } = await searchParams;

  return (
    <>
      <Ouverture />
      <Avantages />
      <Formules />
      <Parcours />
      <Demande formuleChoisie={service} />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.adherent");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      images={["/images/pages/adherent-b.jpg", "/images/heros/slide-2.jpg"]}
      enfants={
        <>
          <a href="#demande" className="bouton bouton--principal heros__action">
            {t("bulletin")}
            <IconeVitrine nom="fleche" taille={17} />
          </a>
          {/* Pas 83 : le devis et le paiement en ligne, au barème du backend. Le
              bulletin reste pour qui préfère être rappelé. Texte en français : la
              traduction de la page de souscription reste à faire. */}
          <Link href="/souscrire?service=ADHESION" className="bouton bouton--secondaire heros__action">
            Souscrire en ligne
          </Link>
        </>
      }
    />
  );
}

const AVANTAGES = [
  { cle: "abattement", icone: "abattement" },
  { cle: "exoneration", icone: "exoneration" },
  { cle: "controle", icone: "controle" },
  { cle: "dialogue", icone: "dialogue" },
] as const;

function Avantages() {
  const t = useTranslations("vitrine.cga");
  return (
    <section className="section section-cga section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>
        <p className="chapeau chapeau--deux-lignes">
          {t("detail1")} {t("detail2")}
        </p>
        <div className="grille grille--4">
          {AVANTAGES.map((a) => (
            <article key={a.cle} className="avantage">
              <span className="avantage__icone">
                <IconeVitrine nom={a.icone} taille={20} epaisseur={1.6} />
              </span>
              <h3 className="avantage__titre">{t(`${a.cle}.titre`)}</h3>
              <p className="avantage__detail">{t(`${a.cle}.detail`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Formules() {
  const t = useTranslations("pages.adherent");
  const formules = t.raw("formules") as {
    nom: string;
    cible: string;
    prix: string;
    unite: string;
    marque: string;
    inclus: string[];
  }[];
  const conditions = t.raw("conditions") as { libelle: string; valeur: string }[];

  return (
    <section id="formules" className="section section--centre">
      <div className="bloc">
        <span className="kicker">{t("formulesKicker")}</span>
        <h2 className="titre-section">{t("formulesTitre")}</h2>
        <p className="chapeau">{t("formulesDetail")}</p>

        <div className="grille grille--3">
          {formules.map((f) => (
            <article
              key={f.nom}
              className={`formule${f.marque ? " formule--accent" : ""}`}
            >
              {f.marque && <span className="formule__marque">{f.marque}</span>}
              <h3 style={{ margin: 0, font: "600 18px/1.3 var(--police-titre)", color: "var(--ink-900)" }}>
                {f.nom}
              </h3>
              <p style={{ margin: 0, font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                {f.cible}
              </p>
              <p style={{ margin: 0 }}>
                <span className="formule__prix">{f.prix}</span>
                <span style={{ display: "block", font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                  {f.unite}
                </span>
              </p>
              <ul className="formule__inclus">
                {f.inclus.map((ligne) => (
                  <li key={ligne}>
                    <span className="formule__coche" aria-hidden="true">
                      <IconeVitrine nom="exoneration" taille={15} />
                    </span>
                    {ligne}
                  </li>
                ))}
              </ul>
              {/* Vers le formulaire de la **même page**, la formule déjà
                  nommée. Renvoyer vers Contact obligeait le visiteur à
                  retrouver, dans une liste, la formule qu'il venait de choisir. */}
              <Link
                href={`/devenir-adherent?service=${encodeURIComponent(f.nom)}#demande`}
                className={`bouton bouton--${f.marque ? "principal" : "secondaire"} bouton--large`}
              >
                {t("bulletin")}
              </Link>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 40 }}>
          <h3 style={{ margin: 0, font: "600 18px/1.3 var(--police-titre)", color: "var(--ink-900)" }}>
            {t("quiPeut")}
          </h3>
          <div className="grille grille--4" style={{ marginTop: 18 }}>
            {conditions.map((c) => (
              <div key={c.libelle} className="chiffre" style={{ background: "var(--surface)", border: "1px solid var(--line-200)", backdropFilter: "none" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", font: "600 11.5px/1.4 var(--police-texte)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-500)" }}>
                    {c.libelle}
                  </span>
                  <span style={{ display: "block", font: "600 15px/1.35 var(--police-texte)", color: "var(--ink-900)" }}>
                    {c.valeur}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="chapeau">{t("quiPeutNote")}</p>
        </div>
      </div>
    </section>
  );
}

function Parcours() {
  const t = useTranslations("pages.adherent");
  const etapes = t.raw("parcours") as { titre: string; detail: string }[];
  return (
    <section className="section section--teinte section--centre section--filigrane">
      <div className="bloc">
        <span className="kicker">{t("parcoursKicker")}</span>
        <h2 className="titre-section">{t("parcoursTitre")}</h2>
        {/* Même dispositif que « Comment ça se passe » sur l'accueil : un rail
            qui se remplit derrière le lecteur et des cartes qui s'allument. Une
            adhésion se déroule en quatre temps, et c'est ce déroulé qu'il faut
            faire sentir, pas quatre encadrés côte à côte. */}
        <EtapesProgression etapes={etapes} />
      </div>
    </section>
  );
}

/**
 * Le bulletin d'adhésion, en bas de page, pré-rempli sur la formule choisie.
 *
 * La formule voyage dans l'adresse plutôt que dans un état client : « Demander
 * mon bulletin » reste un simple lien, la page demeure rendue par le serveur, et
 * une demande portant sur une formule précise se partage telle quelle.
 */
function Demande({ formuleChoisie }: { formuleChoisie?: string }) {
  const t = useTranslations("pages.adherent");
  const commun = useTranslations("commun");

  return (
    <section className="section section--centre">
      <div className="bloc bloc--etroit">
        <FormulaireService
          sujetInitial={formuleChoisie ? `${t("titre")} — ${formuleChoisie}` : t("titre")}
          numeroWhatsapp={commun("cabinet.whatsapp").replace(/\D/g, "")}
        />
      </div>
    </section>
  );
}
