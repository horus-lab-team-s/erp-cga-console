import { ErreurApi, telecharger } from "@/app/lib/api";

/**
 * La liste à jour des adhérents en Excel (CGI art. 119 (4), 10 novembre 2026) : l'annexe des
 * déclarations mensuelles du promoteur. La direction seule (le serveur l'exige).
 */
export async function GET(requete: Request) {
  const au = new URL(requete.url).searchParams.get("au");
  const params = new URLSearchParams();
  if (au && /^\d{4}-\d{2}-\d{2}$/.test(au)) params.set("au", au);
  try {
    const f = await telecharger(`/pilotage/liste-des-adherents.xlsx?${params}`);
    return new Response(Buffer.from(f.octets), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${f.nom.replace(/[^\w.-]/g, "") || "liste-des-adherents.xlsx"}"`,
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
