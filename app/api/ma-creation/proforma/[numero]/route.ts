import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** La proforma de la cliente d'une création, sous session et dans son onglet (15 octobre 2026). */
export async function GET(_requete: Request, { params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  return servirUnPdf(`/mes-documents/creation/proformas/${encodeURIComponent(numero)}/document`);
}
