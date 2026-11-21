import { ADRESSE_API_ESSAI } from "./adresse";

/**
 * Le bandeau de la période d'essai (9 novembre 2026).
 *
 * Tant que le serveur déclare `CGA_PAIEMENTS_D_ESSAI`, les paiements se valident seuls et
 * aucun débit réel ne part : chaque écran le dit, pour que personne ne prenne un paiement
 * d'essai pour un vrai. Lu dans `/sante`, relu chaque minute ; une sonde qui ne répond pas
 * n'affiche rien (le serveur garde la règle, le bandeau n'est qu'une annonce).
 */
export async function BandeauEssai() {
  let essai = false;
  try {
    const reponse = await fetch(`${ADRESSE_API_ESSAI}/sante`, { next: { revalidate: 60 } });
    essai = reponse.ok && (await reponse.json())?.paiements_d_essai === true;
  } catch {
    essai = false;
  }
  if (!essai) return null;
  return (
    <div
      role="status"
      style={{
        background: "#8a5a00",
        color: "#fff",
        textAlign: "center",
        padding: "6px 12px",
        font: "600 13px/1.4 system-ui, sans-serif",
      }}
    >
      Période d&rsquo;essai : les paiements se valident automatiquement, aucun débit réel n&rsquo;est effectué.
    </div>
  );
}
