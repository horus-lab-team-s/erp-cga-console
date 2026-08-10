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
  const t = await getTranslations({ locale, namespace: "pages.formations" });
  return { title: t("titre"), description: t("detail") };
}

/** Page « Formations » — maquette, section `surFormations`. */
export default async function Formations({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Ouverture />
      <Catalogue />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.formations");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      image="/images/pages/formations-a.jpg"
    />
  );
}

type Session = {
  titre: string;
  duree: string;
  public: string;
  prix: string;
  places: string;
  date: string;
  programme: string[];
};

function Catalogue() {
  const t = useTranslations("pages.formations");
  const commun = useTranslations("commun");
  const sessions = t.raw("catalogue") as Session[];

  return (
    <section className="section">
      <div className="bloc">
        <span className="kicker">{t("calendrierKicker")}</span>
        <h2 className="titre-section">{t("calendrierTitre")}</h2>

        <div className="grille grille--2">
          {sessions.map((session) => (
            <article key={session.titre} className="formule">
              <h3
                style={{
                  margin: 0,
                  font: "600 18px/1.3 var(--police-titre)",
                  color: "var(--ink-900)",
                }}
              >
                {session.titre}
              </h3>
              <p
                className="tabulaire"
                style={{
                  margin: 0,
                  font: "400 12.5px/1.6 var(--police-texte)",
                  color: "var(--ink-500)",
                }}
              >
                {session.date} · {session.duree} · {session.places}
                <span style={{ display: "block" }}>{session.public}</span>
              </p>

              <div>
                <span
                  style={{
                    display: "block",
                    marginBottom: 6,
                    font: "600 11.5px/1.4 var(--police-texte)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--ink-500)",
                  }}
                >
                  {t("programme")}
                </span>
                <ul className="formule__inclus">
                  {session.programme.map((point) => (
                    <li key={point}>
                      <span className="formule__coche" aria-hidden="true">
                        <IconeVitrine nom="exoneration" taille={15} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className="formule__prix" style={{ fontSize: 24 }}>
                  {session.prix}
                </span>
                <span
                  style={{ font: "400 12.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}
                >
                  {t("parPersonne")}
                </span>
                <Link
                  href="/contact"
                  className="bouton bouton--principal"
                  style={{ marginLeft: "auto" }}
                >
                  {t("reserver")}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: 34,
            padding: 24,
            borderRadius: 14,
            background: "var(--brand-indigo-100)",
            display: "flex",
            gap: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px" }}>
            <h3
              style={{
                margin: 0,
                font: "600 18px/1.3 var(--police-titre)",
                color: "var(--ink-900)",
              }}
            >
              {t("surMesure")}
            </h3>
            <p
              style={{
                margin: "6px 0 0",
                font: "400 14px/1.65 var(--police-texte)",
                color: "var(--ink-500)",
              }}
            >
              {t("surMesureDetail")}
            </p>
          </div>
          <Link href="/contact" className="bouton bouton--principal bouton--large">
            {commun("actions.demanderDevis")}
          </Link>
        </div>
      </div>
    </section>
  );
}
