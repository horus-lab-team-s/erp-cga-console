"use client";

import { useActionState } from "react";

import { donnerMonAccordDeLecture, reglerLaLectureAuDepot } from "@/app/lib/actions-lecture-au-depot";
import type { AccordDuDossier, EtatDeLaLecture } from "@/app/lib/lecture-au-depot-etats";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * La lecture automatique au dépôt (18 octobre 2026, point 13) : le cabinet l'active, chaque
 * adhérent y consent pour son dossier. Elle ne bloque jamais un dépôt, et elle ne décide de
 * rien : elle prépare la facture et signale ce qu'il faut vérifier.
 */

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <p role="alert" className="lecture-depot__retour" data-ton="echec">{etat.echec}</p>;
  if (etat.fait) return <p role="status" className="lecture-depot__retour" data-ton="fait">{etat.fait}</p>;
  return null;
}

export function InterrupteurDeLaLecture({ etat: lecture }: { etat: EtatDeLaLecture }) {
  const [etat, regler, enCours] = useActionState(reglerLaLectureAuDepot, ETAT_ACTE_INITIAL);
  return (
    <form action={regler} className="lecture-depot">
      <p className="lecture-depot__etat">
        {lecture.actif ? "Activée" : "Coupée"}
        {!lecture.agent_disponible && " · la clé de l'agent n'est pas posée : rien ne sera lu, la saisie reste ouverte"}
      </p>
      <input type="hidden" name="actif" value={lecture.actif ? "non" : "oui"} />
      <label>
        Motif
        <input name="motif" required minLength={10} maxLength={500} />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : lecture.actif ? "Couper la lecture au dépôt" : "Activer la lecture au dépôt"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function MonAccordDeLecture({ niu, accord }: { niu: string; accord: AccordDuDossier }) {
  const [etat, donner, enCours] = useActionState(donnerMonAccordDeLecture, ETAT_ACTE_INITIAL);
  return (
    <form action={donner} className="lecture-depot">
      <p className="adherent__texte">
        {accord.accorde
          ? "Vos pièces sont lues automatiquement dès leur dépôt, pour que le cabinet les traite plus vite."
          : "Le cabinet peut lire automatiquement vos pièces dès leur dépôt, pour les traiter plus vite."}{" "}
        La lecture est faite par un service d&rsquo;intelligence artificielle (Anthropic), à qui le document est
        transmis ; un collaborateur du cabinet vérifie toujours ce qui a été lu. Vous pouvez changer d&rsquo;avis à
        tout moment.
      </p>
      <input type="hidden" name="niu" value={niu} />
      <input type="hidden" name="accorde" value={accord.accorde ? "non" : "oui"} />
      <button type="submit" className={accord.accorde ? "bouton-discret" : "bouton-primaire"} disabled={enCours}>
        {enCours ? "…" : accord.accorde ? "Ne plus lire mes pièces automatiquement" : "J'accepte la lecture automatique"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}
