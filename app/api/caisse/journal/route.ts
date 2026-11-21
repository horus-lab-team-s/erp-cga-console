import { ErreurApi, telecharger } from "@/app/lib/api";

/**
 * Le journal de caisse en Excel (18 octobre 2026). Le serveur filtre déjà les familles
 * que la matrice masque : l'export n'en contient pas plus que l'écran.
 */
export async function GET(requete: Request) {
  const entree = new URL(requete.url).searchParams;
  const params = new URLSearchParams();
  for (const cle of ["du", "au"]) {
    const valeur = entree.get(cle);
    if (valeur && /^\d{4}-\d{2}-\d{2}$/.test(valeur)) params.set(cle, valeur);
  }
  try {
    const f = await telecharger(`/souscription/caisse/journal.xlsx?${params}`);
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${f.nom.replace(/[^\w.-]/g, "") || "journal-de-caisse.xlsx"}"`,
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
