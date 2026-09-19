import { redirect } from "@/i18n/navigation";

/**
 * La racine de la console.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI CE FICHIER EXISTE, ET CE QU'IL RÉPARE
 *
 * Avant la scission, une seule application servait le site public et l'espace de
 * travail : « / » était la page d'accueil de la vitrine. La vitrine est partie
 * dans son dépôt en emportant cette page, et la console s'est retrouvée sans
 * racine. Le symptôme est déroutant : chaque écran répond, l'adresse nue répond
 * 404, et « /fr » aussi — parce que `localePrefix: "as-needed"` renvoie « /fr »
 * sur « / », qui n'existait plus.
 *
 * Ce n'est pas un détail d'affichage. L'adresse nue est celle qu'on tape, celle
 * qu'on met en favori, celle que l'orchestrateur interroge pour savoir si le
 * service est vivant. C'est d'ailleurs la sonde de démarrage de la pile de
 * démonstration qui l'a trouvé, pas un test.
 *
 * ⚠️ `redirect` VIENT DE `@/i18n/navigation`, PAS DE `next/navigation`. Celui de
 * Next ne sait rien des langues : il enverrait un anglophone sur la version
 * française sans le dire.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Racine({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // La console n'a pas d'accueil à elle : ce qu'on y vient faire commence par
  // s'identifier. Le collaborateur déjà connecté est ensuite renvoyé sur son
  // tableau de bord par l'écran de connexion lui-même, qui sait, lui, quel espace
  // rendre — collaborateur ou adhérent.
  redirect({ href: "/connexion", locale });
}
