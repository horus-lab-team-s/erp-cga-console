import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** Le reçu de dépôt PDF d'un accusé, dans son onglet (18 octobre 2026). */
export async function GET(_requete: Request, { params }: { params: Promise<{ dossier: string; numero: string }> }) {
  const { dossier, numero } = await params;
  return servirUnPdf(
    `/obligations/dossiers/${encodeURIComponent(dossier)}/mes-documents/${encodeURIComponent(numero)}/recu`,
  );
}
