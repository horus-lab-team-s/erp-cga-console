import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { EcranOubli } from "@/app/components/vitrine/EcranOubli";
import "@/app/styles/vitrine.css";

export const metadata: Metadata = {
  title: "Mot de passe oublié — CGA Broad Range Consulting Group",
  description: "Recevez un lien pour choisir un nouveau mot de passe.",
};

/**
 * Demander un lien de réinitialisation.
 *
 * ⚠️ Le lien vaut **deux heures**, contre sept jours pour une activation. La
 * différence n'est pas arbitraire : une réinitialisation se demande au moment
 * où l'on en a besoin, là où une activation peut attendre le retour d'un
 * déplacement.
 */
export default async function MotDePasseOublie({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EcranOubli />;
}
