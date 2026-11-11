import { ErreurApi, telecharger } from "./api";

/**
 * Servir un PDF du backend dans son propre onglet, sur la même origine (15 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Six routes `app/api/…/route.ts` (DSF, bulletin, reçus, proforma, livrable) recopiaient
 * le même corps à l'URL près. Elles n'ont plus que leur chemin et leurs contrôles.
 *
 * ⚠️ POURQUOI UN ONGLET : la politique de contenu interdit le PDF dans la page (voir
 * `politique-de-contenu.ts`). La session est vérifiée par le backend, comme pour tout appel.
 *
 * ⚠️ LE NOM DU FICHIER EST ENCODÉ (RFC 6266) : un nom choisi par un utilisateur, accentué
 * ou portant un guillemet, cassait l'en-tête. Un repli ASCII l'accompagne.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function servirUnPdf(chemin: string): Promise<Response> {
  try {
    const f = await telecharger(chemin);
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": dispositionEnLigne(f.nom),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return new Response(erreur.message, {
        status: erreur.statut ?? 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    throw erreur;
  }
}

export function dispositionEnLigne(nom: string): string {
  const ascii =
    nom
      .normalize("NFD")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/["\\]/g, "") || "document.pdf";
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nom)}`;
}
