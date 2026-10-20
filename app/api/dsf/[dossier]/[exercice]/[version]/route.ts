import { servirUnPdf } from "@/app/lib/pdf-en-onglet";

/**
 * L'aperçu PDF d'une version de la DSF, ouvert dans son propre onglet (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI PAS DANS LA PAGE : la politique de contenu de la console pose
 * `object-src 'none'` (voir `proxy.ts`), délibérément : un PDF déposé par un adhérent
 * est du contenu venu du dehors, et il ne s'exécute pas dans la page. La DSF, elle, est
 * rendue par notre serveur ; elle s'ouvre donc en document à part, sur la même origine,
 * et la session est vérifiée par le backend comme pour tout appel.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function GET(
  _requete: Request,
  {
    params,
  }: {
    params: Promise<{ dossier: string; exercice: string; version: string }>;
  },
) {
  const { dossier, exercice, version } = await params;
  if (!/^\d+$/.test(version)) return new Response("Version invalide.", { status: 400 });
  return servirUnPdf(
    `/cloture/dossiers/${encodeURIComponent(dossier)}/dsf/${encodeURIComponent(exercice)}/${version}/document`,
  );
}
