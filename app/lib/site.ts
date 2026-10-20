/**
 * L'adresse publique du site.
 *
 * Elle sert aux métadonnées de partage : une vignette Facebook ou WhatsApp exige
 * des adresses **absolues**. Un chemin relatif est simplement ignoré, et le lien
 * partagé apparaît nu, sans titre ni image — c'est-à-dire sans raison d'être
 * cliqué.
 *
 * `NEXT_PUBLIC_SITE_URL` permet de pointer une préproduction sans toucher au
 * code ; à défaut, le domaine de production. Jamais de barre oblique finale : les
 * chemins qu'on y accroche commencent par la leur.
 */
export const SITE_URL = (
  // `||` et non `??` : une image construite sans l'argument porte une chaîne vide.
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.cga-brcgroup.com"
).replace(/\/$/, "");
