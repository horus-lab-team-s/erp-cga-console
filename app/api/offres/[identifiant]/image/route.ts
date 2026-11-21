import { ErreurApi, telecharger } from "@/app/lib/api";

/**
 * L'image d'une offre, brouillon compris, pour l'écran du cabinet (18 octobre 2026). Le
 * serveur a lu son type dans les octets à l'arrivée : seules JPEG et PNG passent.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ identifiant: string }> }) {
  const { identifiant } = await params;
  try {
    const f = await telecharger(`/vitrine/cabinet/offres/${encodeURIComponent(identifiant)}/image`);
    const type = f.typeMime === "image/png" ? "image/png" : "image/jpeg";
    return new Response(Buffer.from(f.octets), {
      headers: { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return new Response(erreur.message, { status: erreur.statut ?? 502 });
    throw erreur;
  }
}
