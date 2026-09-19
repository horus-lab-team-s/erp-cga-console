"use client";

import { useActionState } from "react";

import { repondreAuCabinet } from "@/app/lib/actions-collecte";
import type { ReglagesDesReponses } from "@/app/lib/espace-adherent";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Répondre à une demande du cabinet, depuis l'accueil de l'adhérent (pas 112, vue C).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX BOUTONS ET UN MESSAGE, SANS RIEN À CHOISIR AVANT
 *
 * « Trois réponses toutes faites couvrent 90 % des cas et évitent la frappe au clavier sur un
 * téléphone d'entrée de gamme. » La première, « Envoyer la pièce », est le dépôt (plus haut sur
 * la page) : ici, les deux autres, et le message libre replié. Chaque bouton porte sa nature
 * (`name="nature"`) : un appui suffit, sans case à cocher ni confirmation.
 *
 * ⚠️ « Votre réponse arrive directement dans le dossier, sans passer par WhatsApp » : la phrase
 * est reprise de la maquette parce qu'elle est vraie. Le comptable reçoit un avis.
 *
 * Le texte des boutons vient du référentiel (`collecte/reponses_adherent.yaml`), passé par la page.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function RepondreAuCabinet({
  demande,
  reponses,
}: {
  demande: string;
  reponses: ReglagesDesReponses["reponses"];
}) {
  const [etat, agir, enCours] = useActionState(repondreAuCabinet, ETAT_ACTE_INITIAL);
  return (
    <form action={agir} className="adherent__repondre" aria-label={`Répondre à la demande ${demande}`}>
      <input type="hidden" name="demande" value={demande} />
      <div className="adherent__repondre-choix">
        {reponses.map((r) => (
          <button key={r.nature} type="submit" name="nature" value={r.nature} disabled={enCours}>
            {r.libelle}
          </button>
        ))}
      </div>
      <details className="adherent__repondre-message">
        <summary>Écrire un message au cabinet</summary>
        <textarea name="message" rows={3} maxLength={1000} placeholder="Écrire un message…" aria-label="Votre message au cabinet" />
        <button type="submit" name="nature" value="MESSAGE" disabled={enCours}>
          Envoyer le message
        </button>
      </details>
      <small>Votre réponse arrive directement dans le dossier, sans passer par WhatsApp.</small>
      {(etat.echec || etat.fait) && (
        <p className="adherent__depot-retour" data-ton={etat.echec ? "echec" : "fait"} role="status">
          {etat.echec ?? etat.fait}
        </p>
      )}
    </form>
  );
}
