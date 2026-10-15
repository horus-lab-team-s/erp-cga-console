import { ErreurApi, telecharger } from "@/app/lib/api";

/** Le livrable PDF d'une mission, dans son onglet : voir `app/api/dsf/…/route.ts` pour le pourquoi. */
export async function GET(_requete: Request, { params }: { params: Promise<{ identifiant: string }> }) {
  const { identifiant } = await params;
  try {
    const f = await telecharger(`/missions/${encodeURIComponent(identifiant)}/livrable`);
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${f.nom}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return new Response(erreur.message, { status: erreur.statut ?? 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    throw erreur;
  }
}
