import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** Le reçu de ce que la cliente d'une création a réglé, dans son onglet (15 octobre 2026). */
export async function GET(_requete: Request, { params }: { params: Promise<{ dossier: string }> }) {
  const { dossier } = await params;
  return servirUnPdf(`/mes-documents/creation/${encodeURIComponent(dossier)}/recu`);
}
