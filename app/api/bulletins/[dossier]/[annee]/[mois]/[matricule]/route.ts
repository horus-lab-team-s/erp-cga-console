import { ErreurApi, telecharger } from "@/app/lib/api";

/** Le bulletin de paie en PDF, dans son onglet (15 octobre 2026) : voir `app/api/dsf/…/route.ts`. */
export async function GET(
  requete: Request,
  { params }: { params: Promise<{ dossier: string; annee: string; mois: string; matricule: string }> },
) {
  const { dossier, annee, mois, matricule } = await params;
  if (!/^\d{4}$/.test(annee) || !/^\d{1,2}$/.test(mois)) return new Response("Période invalide.", { status: 400 });
  const groupe = new URL(requete.url).searchParams.get("groupe_risque");
  const suite = groupe && /^[ABC]$/.test(groupe) ? `?groupe_risque=${groupe}` : "";
  try {
    const f = await telecharger(
      `/social/dossiers/${encodeURIComponent(dossier)}/bulletins/${annee}/${mois}/${encodeURIComponent(matricule)}/pdf${suite}`,
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
