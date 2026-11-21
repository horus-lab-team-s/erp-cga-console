import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** Le livrable PDF d'une mission, dans son onglet : voir `app/api/dsf/…/route.ts` pour le pourquoi. */
export async function GET(_requete: Request, { params }: { params: Promise<{ identifiant: string }> }) {
  const { identifiant } = await params;
  return servirUnPdf(`/missions/${encodeURIComponent(identifiant)}/livrable`);
}
