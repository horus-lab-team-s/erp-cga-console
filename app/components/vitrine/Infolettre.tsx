"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { IconeVitrine } from "./IconeVitrine";

/**
 * Inscription à l'infolettre, dans le pied de page.
 *
 * L'inscription **arrive par courriel à l'adresse du cabinet**. Tant qu'aucun
 * point d'entrée n'existe côté FastAPI, le formulaire compose un message et
 * ouvre le client de messagerie du visiteur : la demande part réellement, à la
 * bonne adresse, et personne ne se croit inscrit alors qu'un serveur aurait
 * jeté sa saisie en silence.
 *
 * Le jour où le contexte `transverse` exposera `POST /infolettre`, seule la
 * fonction `envoyer` change : le balisage et les messages restent.
 */

/** Boîte de réception du cabinet, destinataire des inscriptions. */
const DESTINATAIRE = "contact@cga-brcgroup.com";

export function Infolettre() {
  const t = useTranslations("vitrine.pied");
  const [courriel, setCourriel] = useState("");
  const [envoye, setEnvoye] = useState(false);

  function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const sujet = encodeURIComponent("Inscription à l'infolettre");
    const corps = encodeURIComponent(
      `Bonjour,\n\nJe souhaite recevoir l'infolettre du cabinet à l'adresse suivante :\n${courriel}\n`,
    );
    window.location.href = `mailto:${DESTINATAIRE}?subject=${sujet}&body=${corps}`;
    setEnvoye(true);
  }

  return (
    /* Ni titre ni explication : le champ et le bouton suffisent.
       L'infolettre vivait au pied de page avec un titre et deux lignes de
       présentation, ce qui doublait la hauteur du pied pour un formulaire d'un
       seul champ. Elle a rejoint le bandeau « Parlons de votre projet », où le
       contexte est déjà posé par la section elle-même : répéter « Restez
       informé » sous un titre qui invite déjà à écrire n'apprenait rien. */
    <form className="infolettre" onSubmit={envoyer} aria-label={t("infolettreTitre")}>
      <div className="infolettre__ligne">
        <label className="visuellement-masque" htmlFor="infolettre-courriel">
          {t("infolettreChamp")}
        </label>
        <input
          id="infolettre-courriel"
          className="infolettre__champ"
          type="email"
          name="courriel"
          required
          autoComplete="email"
          placeholder={t("infolettreChamp")}
          value={courriel}
          onChange={(evenement) => setCourriel(evenement.target.value)}
        />
        <button type="submit" className="bouton bouton--principal infolettre__bouton">
          {t("infolettreBouton")}
          <IconeVitrine nom="fleche" taille={15} />
        </button>
      </div>

      {/* `role="status"` : l'annonce est lue sans voler le focus du champ. */}
      <p className="infolettre__confirmation" role="status">
        {envoye ? t("infolettreConfirmation") : ""}
      </p>
    </form>
  );
}
