import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { Heros } from "@/app/components/vitrine/Heros";
import { IconeVitrine } from "@/app/components/vitrine/IconeVitrine";
import { RubanTemoignages } from "@/app/components/vitrine/RubanTemoignages";
import { SERVICES_VITRINE } from "@/app/lib/services-vitrine";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vitrine" });
  return {
    title: t("heros.slide1.titre"),
    description: t("services.detail"),
  };
}

/**
 * Accueil — maquette `Site vitrine CGA`, section « surAccueil ».
 *
 * Ordre du dessin, respecté : héros avec formulaire et chiffres, services, ce que
 * change l'adhésion, les trois étapes, les témoignages. Rien d'autre.
 *
 * En particulier : **pas de questions fréquentes ici**. Elles existent dans les
 * données mais ne sont rendues que sur la page Création. J'en avais ajouté sur
 * l'accueil, à tort.
 *
 * Le bandeau d'appel et le pied sont rendus par le layout, communs aux huit pages.
 */
export default async function Accueil({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Heros />
      <Services />
      <CeQueChangeLAdhesion />
      <Etapes />
      <RubanTemoignages />
    </>
  );
}

// ── Services ──────────────────────────────────────────────────────────────────

function Services() {
  const t = useTranslations("vitrine.services");

  return (
    <section className="section">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>
        <p className="chapeau">{t("detail")}</p>

        <div className="grille grille--3">
          {SERVICES_VITRINE.map((service) => (
            <Link
              key={service.cle}
              href={service.href}
              className={`carte${service.accent ? " carte--accent" : ""}`}
            >
              <div className="carte__media">
                <Image
                  src={service.image}
                  alt=""
                  width={800}
                  height={420}
                  className="carte__image"
                  sizes="(max-width: 980px) 100vw, 400px"
                />
                {/* L'icône du dessin est conservée, posée sur la photographie :
                    le repère du service reste le même dans le méga-menu, sur
                    l'accueil et dans le tiroir mobile. */}
                <span className="carte__pastille">
                  <IconeVitrine nom={service.icone} taille={20} epaisseur={1.6} />
                </span>
              </div>
              <div className="carte__corps">
                <h3 className="carte__titre">{t(`${service.cle}.titre`)}</h3>
                <p className="carte__detail">{t(`${service.cle}.detail`)}</p>
                <div className="carte__pied">
                  <span className="carte__prix">{t(`${service.cle}.prix`)}</span>
                  <span className="carte__action">
                    {t(`${service.cle}.action`)}
                    <IconeVitrine nom="fleche" taille={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Ce que change l'adhésion ──────────────────────────────────────────────────

const AVANTAGES = [
  { cle: "abattement", icone: "abattement" },
  { cle: "exoneration", icone: "exoneration" },
  { cle: "controle", icone: "controle" },
  { cle: "dialogue", icone: "dialogue" },
] as const;

function CeQueChangeLAdhesion() {
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
          {AVANTAGES.map((avantage) => (
            <article key={avantage.cle} className="avantage">
              <span className="avantage__icone">
                <IconeVitrine nom={avantage.icone} taille={20} epaisseur={1.6} />
              </span>
              <h3 className="avantage__titre">{t(`${avantage.cle}.titre`)}</h3>
              <p className="avantage__detail">{t(`${avantage.cle}.detail`)}</p>
            </article>
          ))}
        </div>

        <p style={{ marginTop: 30 }}>
          <Link href="/devenir-adherent" className="bouton bouton--clair bouton--large">
            {t("bouton")}
            <IconeVitrine nom="fleche" taille={16} />
          </Link>
        </p>
      </div>
    </section>
  );
}

// ── Comment ça se passe ───────────────────────────────────────────────────────

const ETAPES = ["etape1", "etape2", "etape3"] as const;

function Etapes() {
  const t = useTranslations("vitrine.etapes");

  return (
    <section className="section">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>

        <div className="grille grille--3">
          {ETAPES.map((cle, index) => (
            <article key={cle} className="etape">
              <div className="etape__entete">
                <span className="etape__rang" aria-hidden="true">
                  {index + 1}
                </span>
                {/* L'indicateur de progression du dessin : il situe l'étape dans
                    le parcours, il ne mesure rien de dynamique. */}
                <span className="etape__barre" aria-hidden="true">
                  <span
                    className="etape__progression"
                    style={{ width: `${((index + 1) / ETAPES.length) * 100}%` }}
                  />
                </span>
                <span className="etape__compte">
                  {index + 1} / {ETAPES.length}
                </span>
              </div>
              <h3 style={{ margin: 0, font: "600 17px/1.35 var(--police-titre)", color: "var(--ink-900)" }}>
                {t(`${cle}.titre`)}
              </h3>
              <p
                style={{
                  margin: 0,
                  font: "400 14px/1.65 var(--police-texte)",
                  color: "var(--ink-500)",
                  textWrap: "pretty",
                }}
              >
                {t(`${cle}.detail`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
