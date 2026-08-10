import { Suspense } from "react";
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
  return (
    <section className="section">
      <div className="bloc">
        {/* À FAIRE — le barème vit encore dans `lib/bareme-creation.ts`, pas
            dans le référentiel daté ; les montants viennent des proformas du
            cabinet et restent à faire valider par le fiscaliste. C'est une
            dette de conception, pas une information à afficher : l'estimateur
            porte déjà l'avertissement destiné au client, qui dit l'essentiel —
            l'estimation est indicative, le devis est confirmé après examen. */}
        {/* `useSearchParams` sort son composant de la prégénération : la limite
            Suspense confine ce coût à l'estimateur, et la page — bannière,
            en-tête, pied — reste servie en HTML statique. */}
        <Suspense fallback={null}>
          <Estimateur />
        </Suspense>
      </div>
    </section>
  );
}
