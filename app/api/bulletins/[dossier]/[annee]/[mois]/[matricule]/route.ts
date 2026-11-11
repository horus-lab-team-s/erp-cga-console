import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** Le bulletin de paie en PDF, dans son onglet (15 octobre 2026) : voir `app/api/dsf/…/route.ts`. */
export async function GET(
  requete: Request,
  {
    params,
  }: {
    params: Promise<{
      dossier: string;
      annee: string;
      mois: string;
      matricule: string;
    }>;
  },
) {
  const { dossier, annee, mois, matricule } = await params;
  if (!/^\d{4}$/.test(annee) || !/^\d{1,2}$/.test(mois)) return new Response("Période invalide.", { status: 400 });
  const groupe = new URL(requete.url).searchParams.get("groupe_risque");
  const suite = groupe && /^[ABC]$/.test(groupe) ? `?groupe_risque=${groupe}` : "";
  return servirUnPdf(
    `/social/dossiers/${encodeURIComponent(dossier)}/bulletins/${annee}/${mois}/${encodeURIComponent(matricule)}/pdf${suite}`,
  );
}
