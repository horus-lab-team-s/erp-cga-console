import { ErreurApi, telecharger } from "@/app/lib/api";

/**
 * L'attestation d'adhésion au Centre, en PDF (11 novembre 2026). Le cabinet et l'adhérent,
 * pour son seul dossier : le serveur l'exige.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ niu: string }> }) {
  const { niu } = await params;
  if (!/^[A-Z]\d{12}[A-Z]$/.test(niu)) return new Response("NIU invalide", { status: 400 });
  try {
    const f = await telecharger(`/souscription/dossiers/${encodeURIComponent(niu)}/attestation-d-adhesion`);
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${f.nom.replace(/[^\w.-]/g, "") || `attestation-adhesion-${niu}.pdf`}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return new Response(erreur.message, { status: erreur.statut ?? 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    throw erreur;
  }
}
