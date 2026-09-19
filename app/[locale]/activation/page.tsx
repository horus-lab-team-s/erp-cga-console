import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { EcranMotDePasse } from "@/app/components/vitrine/EcranMotDePasse";
import "@/app/styles/vitrine.css";

export const metadata: Metadata = {
  title: "Activer mon espace — CGA Broad Range Consulting Group",
  description: "Définissez le mot de passe de votre espace adhérent.",
  // ⚠️ L'URL porte un secret d'usage unique. Un moteur qui l'indexerait le
  // rendrait public ; un aperçu de lien le ferait consommer avant son
  // destinataire.
  robots: { index: false, follow: false },
};

/**
 * Le point d'arrivée du parcours de souscription.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CETTE PAGE MANQUAIT, ET LA CHAÎNE ÉTAIT ROMPUE
 *
 * Le paiement validé faisait partir un courriel dont le lien menait ici. Ici
 * n'existait pas : un adhérent qui venait de payer tombait sur un **404**, et
 * le seul chemin vers son espace était mort.
 *
 * Les deux extrémités étaient pourtant complètes — le backend émettait le
 * jeton, traçait l'audit, exposait la route de définition ; le front avait sa
 * page de connexion. Chaque moitié fonctionnait, les tests de chaque moitié
 * passaient, et personne n'avait parcouru le chemin entier.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Activation({
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
      titre="Bienvenue — activez votre espace"
      chapeau="Votre souscription est encaissée et votre espace est ouvert. Il reste à choisir votre mot de passe."
      libelleAction="Activer mon espace"
      note="Ce lien ne fonctionne qu'une fois. S'il a expiré, demandez-en un nouveau depuis la page de connexion."
    />
  );
}
