import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { EcranMotDePasse } from "@/app/components/vitrine/EcranMotDePasse";
import "@/app/styles/vitrine.css";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — CGA Broad Range Consulting Group",
  description: "Choisissez un nouveau mot de passe pour votre compte.",
  // ⚠️ Même raison qu'à l'activation : l'URL porte un secret d'usage unique.
  robots: { index: false, follow: false },
};

/**
 * Réparer un oubli de mot de passe.
 *
 * Le geste est celui de l'activation, le contexte non : ici le compte existe et
 * fonctionne, et son propriétaire a seulement perdu la clé. Le lien est plus
 * court — deux heures contre sept jours —, parce qu'une réinitialisation se
 * demande au moment où l'on en a besoin, là où une activation peut attendre le
 * retour d'un déplacement.
 */
export default async function Reinitialisation({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { jeton } = await searchParams;

  return (
    <EcranMotDePasse
      jeton={jeton}
      titre="Choisir un nouveau mot de passe"
      chapeau="Vos sessions ouvertes seront fermées : il faudra vous reconnecter, sur tous vos appareils."
      libelleAction="Enregistrer"
      note="Ce lien est valable deux heures et ne fonctionne qu'une fois."
    />
  );
}
