import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

import { EnteteDePage } from "@/app/components/vitrine/EnteteDePage";
import { Estimateur } from "@/app/components/vitrine/Estimateur";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.estimation" });
  return { title: t("titre"), description: t("detail") };
}

/** Page « Estimation » — maquette, section `surEstimation`. */
export default async function Estimation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Ouverture />
      <Calcul />
    </>
  );
}

function Ouverture() {
  const t = useTranslations("pages.estimation");
  return (
    <EnteteDePage
      kicker={t("kicker")}
      titre={t("titre")}
      detail={t("detail")}
      image="/images/pages/creation-b.jpg"
    />
  );
}

function Calcul() {
  const t = useTranslations("pages.estimation");
  return (
    <section className="section">
      <div className="bloc">
        {/* Le barème n'est pas encore adossé au référentiel daté : le dire à
            l'écran vaut mieux que de laisser croire à un devis ferme. */}
        <p
          style={{
            margin: "0 0 28px",
            padding: "12px 14px",
            borderRadius: "var(--rayon)",
            border: "1px solid var(--warning)",
            background: "var(--warning-100)",
            font: "400 13px/1.6 var(--police-texte)",
            color: "var(--ink-900)",
            maxWidth: "82ch",
          }}
        >
          <strong>△ </strong>
          {t("avertissement")}
        </p>
        <Estimateur />
      </div>
    </section>
  );
}
