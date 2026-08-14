import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

import { PageLegale } from "@/app/components/vitrine/PageLegale";

/**
 * Page légale — le contenu et le raisonnement sont dans `PageLegale`.
 *
 * ⚠️ À relire et compléter par le cabinet avant mise en ligne : plusieurs
 * mentions obligatoires ne sont pas connues du dépôt.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.legal.mentions" });
  return { title: t("titre"), description: t("detail") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PageLegale document="mentions" />;
}
