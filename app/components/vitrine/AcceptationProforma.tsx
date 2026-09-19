"use client";

import { useActionState } from "react";

import { accepterLaProforma } from "@/app/lib/actions-acquisition";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Le geste d'accord du client (pas 67).
 *
 * ⚠️ **Il vaut engagement.** D'où deux exigences avant l'envoi : que le client écrive
 * qui il est et à quel titre, et qu'il coche une case qui dit ce qu'il fait. Le backend
 * fige ensuite le montant, la date, la version du document et l'origine de la requête.
 */
export function AcceptationProforma({
  numero,
  version,
  expireLe,
  sceau,
}: {
  numero: string;
  version: string;
  expireLe: string;
  sceau: string;
}) {
  const [etat, accepter, enCours] = useActionState(accepterLaProforma, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return <p role="status" style={{ color: "var(--success, #1d6b50)", fontWeight: 600 }}>{etat.fait}</p>;
  }
  return (
    <form action={accepter} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
      <input type="hidden" name="numero" value={numero} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="expire_le" value={expireLe} />
      <input type="hidden" name="sceau" value={sceau} />
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontWeight: 600 }}>
        Votre nom et votre qualité
        <input name="identite_declaree" required minLength={2} maxLength={120} placeholder="Ex. : Jean Mbida, gérant" style={{ padding: "8px 10px", fontSize: 15 }} />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" name="engagement" value="oui" required />
        <span>J&rsquo;accepte cette proposition au montant indiqué ; mon accord engage l&rsquo;entreprise que je représente.</span>
      </label>
      <div>
        <button type="submit" className="bouton bouton--primaire" disabled={enCours}>
          {enCours ? "…" : "J’accepte la proposition"}
        </button>
      </div>
      {etat.echec && <p role="alert" style={{ color: "#94302a" }}>{etat.echec}</p>}
    </form>
  );
}
