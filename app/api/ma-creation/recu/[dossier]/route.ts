import { ErreurApi, telecharger } from "@/app/lib/api";

/** Le reçu de ce que la cliente d'une création a réglé, dans son onglet (15 octobre 2026). */
export async function GET(_requete: Request, { params }: { params: Promise<{ dossier: string }> }) {
  const { dossier } = await params;
  try {
    const f = await telecharger(
      `/mes-documents/creation/${encodeURIComponent(dossier)}/recu`,
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
