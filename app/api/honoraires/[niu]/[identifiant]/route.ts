import { ErreurApi, telecharger } from "@/app/lib/api";

/** Le reçu PDF d'un règlement d'honoraires, dans son onglet (15 octobre 2026). */
export async function GET(_requete: Request, { params }: { params: Promise<{ niu: string; identifiant: string }> }) {
  const { niu, identifiant } = await params;
  try {
    const f = await telecharger(
      `/souscription/honoraires/${encodeURIComponent(niu)}/reglements/${encodeURIComponent(identifiant)}/recu`,
    );
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
