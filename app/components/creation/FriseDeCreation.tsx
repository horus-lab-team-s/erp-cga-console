import { ETAPES_DE_CREATION, type PositionDansLaCreation } from "@/app/lib/etapes-de-creation";

/**
 * La frise des étapes : où elle en est, ce qui est fait, ce qui vient.
 *
 * ⚠️ UNE LISTE ORDONNÉE, ET NON DES PASTILLES DÉCORATIVES : un lecteur d'écran
 * annonce « étape 3 sur 6, en cours », ce qu'une rangée de cercles colorés ne
 * dirait à personne.
 */
export function FriseDeCreation({ position }: { position: PositionDansLaCreation }) {
  return (
    <ol className="jalons" aria-label="Les étapes de votre création">
      {ETAPES_DE_CREATION.map((etape, i) => {
        const etat =
          position.terminee || i < position.courante ? "faite" : i === position.courante ? "en-cours" : "a-venir";
        return (
          <li key={etape.code} className="jalons__etape" data-etat={etat} aria-current={etat === "en-cours" ? "step" : undefined}>
            <span className="jalons__pastille" aria-hidden="true">
              {etat === "faite" ? "✓" : i + 1}
            </span>
            <span className="jalons__nom">
              {etape.nom}
              <span className="creation__invisible">
                {etat === "faite" ? " : fait" : etat === "en-cours" ? " : en cours" : " : à venir"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
