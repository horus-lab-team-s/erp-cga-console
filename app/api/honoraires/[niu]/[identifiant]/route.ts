import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** Le reçu PDF d'un règlement d'honoraires, dans son onglet (15 octobre 2026). */
export async function GET(_requete: Request, { params }: { params: Promise<{ niu: string; identifiant: string }> }) {
  const { niu, identifiant } = await params;
  return servirUnPdf(
    `/souscription/honoraires/${encodeURIComponent(niu)}/reglements/${encodeURIComponent(identifiant)}/recu`,
  );
}
