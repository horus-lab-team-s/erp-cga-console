import { ErreurApi, telecharger } from "@/app/lib/api";

/**
 * Le projet de contrat en Word (18 octobre 2026, point 23), en téléchargement : un `.docx`
 * ne s'affiche pas dans un onglet, il s'ouvre dans le traitement de texte.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ identifiant: string }> }) {
  const { identifiant } = await params;
  try {
    const f = await telecharger(`/missions/${encodeURIComponent(identifiant)}/livrable/word`);
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${identifiant.replace(/[^\w.-]/g, "_")}.docx"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return new Response(erreur.message, { status: erreur.statut ?? 502 });
    throw erreur;
  }
}
