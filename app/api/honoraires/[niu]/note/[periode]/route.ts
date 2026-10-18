import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/** La note d'honoraires PDF d'une échéance, dans son onglet (18 octobre 2026, points 19 et 20). */
export async function GET(_requete: Request, { params }: { params: Promise<{ niu: string; periode: string }> }) {
  const { niu, periode } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periode)) return new Response("période illisible", { status: 400 });
  return servirUnPdf(`/souscription/honoraires/${encodeURIComponent(niu)}/echeances/${periode}/note`);
}
