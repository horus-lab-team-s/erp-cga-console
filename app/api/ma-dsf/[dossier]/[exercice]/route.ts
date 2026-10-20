import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/**
 * La copie de la DSF déposée, pour l'adhérent (18 octobre 2026, point 24). Le backend ne la
 * rend qu'une fois l'accusé de la DGI consigné, et sans les noms des collaborateurs.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ dossier: string; exercice: string }> }) {
  const { dossier, exercice } = await params;
  return servirUnPdf(
    `/cloture/dossiers/${encodeURIComponent(dossier)}/ma-dsf/${encodeURIComponent(exercice)}/document`,
  );
}
