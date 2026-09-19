import { choisirMonEntreprise } from "@/app/lib/actions-portefeuille";
import type { Dossier } from "@/app/lib/portefeuille";

/**
 * Le sélecteur d'entreprise, sous le titre de l'accueil (pas 116, maquette vue A, note 4).
 *
 * N'apparaît que si le compte suit plusieurs entreprises. Un formulaire ordinaire, sans JavaScript :
 * choisir, puis « Afficher ».
 */
export function ChoisirMonEntreprise({ dossiers, principal }: { dossiers: Dossier[]; principal: string }) {
  if (dossiers.length < 2) return null;
  return (
    <form action={choisirMonEntreprise} className="adherent__filtres adherent__choix-entreprise" aria-label="Choisir l'entreprise">
      <label>
        <span>Entreprise affichée</span>
        {/* ⚠️ `key` : sans lui, après le choix, la page affichait la nouvelle entreprise et la liste
            gardait l'ancienne (un `defaultValue` n'est pas relu au rendu suivant ; vu à l'essai réel). */}
        <select key={principal} name="entreprise" defaultValue={principal}>
          {dossiers.map((d) => (
            <option key={d.niu} value={d.niu}>
              {d.denomination}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="adherent__quitter">
        Afficher
      </button>
    </form>
  );
}
