/**
 * La politique de contenu de la console. Le pourquoi de chaque directive est dans l'en-tête
 * de `proxy.ts`, qui la pose sur chaque réponse ; elle vit ici pour être éprouvée par les
 * tests sans charger l'intergiciel.
 */
export function politiqueDeContenu(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Voir l'en-tête : les styles en attribut sont la façon d'écrire du produit.
    "style-src 'self' 'unsafe-inline'",
    // `data:` pour les images en ligne, `blob:` pour un justificatif qu'on
    // prévisualise avant de l'envoyer.
    "img-src 'self' data: blob:",
    // `next/font` héberge les polices localement : aucune origine externe.
    "font-src 'self'",
    "connect-src 'self'",
    // Voir l'en-tête : `blob:` seul, jamais `'self'`, `*` ni une origine.
    "object-src blob:",
    // ⚠️ Et `frame-src blob:` : Chrome monte son lecteur PDF dans un CADRE, même sous
    // `<object>`. Sans elle, `default-src 'self'` le refusait et l'ouverture précédente
    // n'avait aucun effet (vu dans la console du navigateur, 15 octobre 2026).
    "frame-src blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // ⚠️ Pas de `upgrade-insecure-requests` : la démonstration est servie en
    // clair, et la directive ferait échouer chaque requête de la page.
  ].join("; ");
}
