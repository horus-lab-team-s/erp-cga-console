import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { Heros } from "@/app/components/vitrine/Heros";
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
 * Page d'accueil de la vitrine.
 *
 * L'ordre des sections suit une question par section, dans l'ordre où un visiteur
 * se les pose : qui êtes-vous, que faites-vous, pourquoi un centre agréé, comment
 * ça se passe, qu'en disent vos clients, comment vous joindre.
 *
 * Aucune donnée n'est encore branchée sur le backend. Les tarifs affichés sont ceux
 * des proformas du cabinet ; ils passeront au référentiel daté avec l'estimateur —
 * voir Docs/architecture/02-referentiel-normatif.md.
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
      <Chiffres />
      <Services />
      <PourquoiUnCentreAgree />
      <Etapes />
      <Temoignages />
      <QuestionsFrequentes />
      <AppelAContact />
    </>
  );
}

// ── Chiffres clés ─────────────────────────────────────────────────────────────

function Chiffres() {
  const t = useTranslations("vitrine.chiffres");
  const cles = ["creation", "entrepreneurs", "agrement", "cible"] as const;

  return (
    <section className="section section--teinte">
      <div className="bloc">
        <h2 className="titre-section" style={{ fontSize: "clamp(20px, 2vw, 24px)" }}>
          {t("titre")}
        </h2>
        <div className="grille grille--4" style={{ marginTop: 24 }}>
          {cles.map((cle) => (
            <div key={cle} className="chiffre">
              <span className="chiffre__valeur">{t(`${cle}.valeur`)}</span>
              <span className="chiffre__label">{t(`${cle}.label`)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Services ──────────────────────────────────────────────────────────────────

const SERVICES = [
  { cle: "creation", href: "/creer-mon-entreprise", image: "/images/services/creation-entreprise.jpg" },
  { cle: "adhesion", href: "/devenir-adherent", image: "/images/services/suivi-comptable.jpg" },
  { cle: "ponctuel", href: "/contact", image: "/images/services/prestations-ponctuelles.jpg" },
  { cle: "domiciliation", href: "/contact", image: "/images/services/domiciliation.jpg" },
  { cle: "formations", href: "/formations", image: "/images/services/formations.jpg" },
  { cle: "conseil", href: "/contact", image: "/images/services/conseil.jpg" },
] as const;

function Services() {
  const t = useTranslations("vitrine.services");

  return (
    <section className="section" id="services">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>
        <p className="chapeau">{t("detail")}</p>

        <div className="grille grille--3">
          {SERVICES.map((service) => (
            <Link key={service.cle} href={service.href} className="carte carte--lien">
              <Image
                src={service.image}
                alt=""
                width={800}
                height={420}
                className="carte__image"
                sizes="(max-width: 900px) 100vw, 380px"
              />
              <div className="carte__corps">
                <h3 className="carte__titre">{t(`${service.cle}.titre`)}</h3>
                <p className="carte__detail">{t(`${service.cle}.detail`)}</p>
                <div className="carte__pied">
                  <span className="carte__prix">{t(`${service.cle}.prix`)}</span>
                  <span className="carte__action">{t(`${service.cle}.action`)} →</span>
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

function PourquoiUnCentreAgree() {
  const t = useTranslations("vitrine.cga");
  const commun = useTranslations("commun");
  const avantages = ["avantage1", "avantage2", "avantage3", "avantage4"] as const;

  return (
    <section className="section section--teinte">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>
        <p className="chapeau">{t("detail")}</p>

        <div className="grille grille--2">
          {avantages.map((cle) => (
            <article
              key={cle}
              style={{
                padding: 22,
                border: "1px solid var(--line-200)",
                borderRadius: 12,
                background: "var(--surface-alt)",
              }}
            >
              <h3 style={{ margin: 0, font: "600 17px/1.35 var(--police-titre)", color: "var(--ink-900)" }}>
                {t(`${cle}.titre`)}
              </h3>
              <p style={{ margin: "8px 0 0", font: "400 14.5px/1.65 var(--police-texte)", color: "var(--ink-500)" }}>
                {t(`${cle}.detail`)}
              </p>
            </article>
          ))}
        </div>

        <p style={{ marginTop: 28 }}>
          <Link href="/devenir-adherent" className="bouton bouton--secondaire">
            {t("action")}
          </Link>
        </p>

        <p
          style={{
            marginTop: 20,
            font: "400 12.5px/1.7 var(--police-texte)",
            color: "var(--ink-500)",
            maxWidth: "70ch",
          }}
        >
          {commun("cabinet.agrement")}
        </p>
      </div>
    </section>
  );
}

// ── Comment ça se passe ───────────────────────────────────────────────────────

function Etapes() {
  const t = useTranslations("vitrine.etapes");
  const etapes = ["etape1", "etape2", "etape3"] as const;

  return (
    <section className="section">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>

        <div className="grille grille--3">
          {etapes.map((cle, index) => (
            <article key={cle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span className="etape__rang" aria-hidden="true">
                {index + 1}
              </span>
              <h3 style={{ margin: 0, font: "600 17px/1.35 var(--police-titre)", color: "var(--ink-900)" }}>
                {t(`${cle}.titre`)}
              </h3>
              <p style={{ margin: 0, font: "400 14.5px/1.65 var(--police-texte)", color: "var(--ink-500)" }}>
                {t(`${cle}.detail`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Témoignages ───────────────────────────────────────────────────────────────

const TEMOINS = [
  { cle: "t1", portrait: "/images/temoignages/temoin-1.jpg" },
  { cle: "t2", portrait: "/images/temoignages/temoin-2.jpg" },
  { cle: "t3", portrait: "/images/temoignages/temoin-3.jpg" },
  { cle: "t4", portrait: "/images/temoignages/temoin-4.jpg" },
] as const;

function Temoignages() {
  const t = useTranslations("vitrine.temoins");

  return (
    <section className="section section--teinte">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>

        {/* Défilement horizontal contenu dans la bande : la page elle-même ne
            défile jamais latéralement. */}
        <div className="temoins" tabIndex={0} role="group" aria-label={t("titre")}>
          {TEMOINS.map((temoin) => (
            <figure key={temoin.cle} className="temoin">
              <blockquote className="temoin__citation">« {t(`${temoin.cle}.citation`)} »</blockquote>
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
                    {t(`${temoin.cle}.auteur`)}
                  </span>
                  <span
                    style={{
                      display: "block",
                      font: "400 12.5px/1.4 var(--police-texte)",
                      color: "var(--ink-500)",
                    }}
                  >
                    {t(`${temoin.cle}.entreprise`)}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p
          style={{
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: "var(--rayon)",
            border: "1px solid var(--warning)",
            background: "var(--warning-100)",
            font: "400 13px/1.6 var(--police-texte)",
            color: "var(--ink-900)",
            maxWidth: "76ch",
          }}
        >
          <strong>△ </strong>
          {t("note")}
        </p>
      </div>
    </section>
  );
}

// ── Questions fréquentes ──────────────────────────────────────────────────────

function QuestionsFrequentes() {
  const t = useTranslations("vitrine.faq");
  const questions = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

  return (
    <section className="section">
      <div className="bloc">
        <span className="kicker">{t("kicker")}</span>
        <h2 className="titre-section">{t("titre")}</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
          {questions.map((cle) => (
            <details key={cle} className="question">
              <summary>{t(`${cle}.question`)}</summary>
              <p className="question__reponse">{t(`${cle}.reponse`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Appel à contact ───────────────────────────────────────────────────────────

function AppelAContact() {
  const t = useTranslations("vitrine.cta");
  const commun = useTranslations("commun");
  const numero = commun("cabinet.whatsapp").replace(/[^\d]/g, "");

  return (
    <section className="appel">
      <div className="bloc appel__contenu">
        <div style={{ flex: "1 1 420px" }}>
          <h2 className="appel__titre">{t("titre")}</h2>
          <p className="appel__detail">{t("detail")}</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href={`https://wa.me/${numero}`}
            className="bouton bouton--principal"
            target="_blank"
            rel="noreferrer noopener"
          >
            {commun("actions.ecrireWhatsapp")}
          </a>
          <Link href="/contact" className="bouton bouton--clair">
            {commun("actions.prendreRendezVous")}
          </Link>
        </div>
      </div>
    </section>
  );
}
