import { LIBELLES_SITUATION, TON_SITUATION, type SituationDeReglement } from "@/app/lib/honoraires-etats";

/**
 * L'état de règlement d'un dossier, en une pastille (18 octobre 2026). Le libellé est
 * toujours écrit : la couleur seule ne dit rien à qui ne la distingue pas.
 */
export function PastilleDeSituation({ situation }: { situation: SituationDeReglement }) {
  return (
    <span className="pastille-situation" data-ton={TON_SITUATION[situation.etat]}>
      {LIBELLES_SITUATION[situation.etat]}
    </span>
  );
}
