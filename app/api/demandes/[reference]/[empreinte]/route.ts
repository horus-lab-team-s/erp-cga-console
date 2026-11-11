import { ErreurApi, telecharger } from "@/app/lib/api";
import { dispositionEnLigne } from "@/app/lib/pdf-en-onglet";

/**
 * Une pièce jointe par le visiteur à sa demande, ouverte dans un onglet (point 22).
 *
 * ⚠️ Le type est celui que le SERVEUR a lu dans le contenu au dépôt (PDF, JPEG, PNG),
 * jamais l'extension du nom : `nosniff` empêche le navigateur d'en deviner un autre.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ reference: string; empreinte: string }> },
) {
  const { reference, empreinte } = await params;
  try {
    const f = await telecharger(
      `/acquisition/dossiers/${encodeURIComponent(reference)}/pieces/${encodeURIComponent(empreinte)}`,
    );
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": f.typeMime,
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
