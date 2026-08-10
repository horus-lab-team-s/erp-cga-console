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
  const t = await getTranslations({ locale, namespace: "pages.adherent" });
  return { title: t("titre"), description: t("detail") };
}

/** Page « Devenir adhérent » — maquette, section `surAdherent`. */
export default async function DevenirAdherent({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Ouverture />
      <Avantages />
      <Formules />
      <Parcours />
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
      image="/images/pages/adherent-b.jpg"
      enfants={
        <Link href="/contact" className="bouton bouton--principal heros__action">
          {t("bulletin")}
          <IconeVitrine nom="fleche" taille={17} />
        </Link>
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
    <section className="section section-cga">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>
        <p className="chapeau">
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
    <section className="section">
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
              <Link
                href="/contact"
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
    <section className="section section--teinte">
      <div className="bloc">
        <span className="kicker">{t("parcoursKicker")}</span>
        <h2 className="titre-section">{t("parcoursTitre")}</h2>
        <div className="grille grille--4">
          {etapes.map((e, i) => (
            <article key={e.titre} className="etape">
              <span className="etape__rang" aria-hidden="true">
                {i + 1}
              </span>
              <h3 style={{ margin: 0, font: "600 16px/1.35 var(--police-titre)", color: "var(--ink-900)" }}>
                {e.titre}
              </h3>
              <p style={{ margin: 0, font: "400 13.5px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
                {e.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
