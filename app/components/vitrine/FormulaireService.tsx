"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { IconeVitrine } from "./IconeVitrine";

/**
 * Le formulaire de demande, commun à tous les services.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UN SEUL FORMULAIRE POUR TOUS LES SERVICES
 *
 * Parce qu'un visiteur qui vient de lire une fiche a une seule chose en tête :
 * demander **ce service-là**. Le renvoyer vers une page Contact générique, où il
 * doit re-choisir dans une liste ce qu'il vient de passer trois minutes à lire,
 * c'est lui faire refaire un travail déjà fait — et c'est là qu'on perd les
 * demandes.
 *
 * Le service est donc **pré-rempli et affiché**, pas caché dans un champ
 * masqué : le visiteur doit voir que la demande part sur le bon sujet. Il reste
 * modifiable, parce qu'on se trompe de page et qu'il serait absurde de renvoyer
 * quelqu'un en arrière pour cela.
 *
 * `sujetInitial` porte le libellé exact — « Domiciliation commerciale », mais
 * aussi bien « Formation : clôture et DSF » ou « Formule Sérénité ». Le même
 * composant sert donc les fiches de service, la page Formations et la page
 * Adhérent, chacune passant son propre intitulé.
 *
 * ⚠️ COMMENT LA DEMANDE PART, AUJOURD'HUI
 *
 * Elle compose un message et ouvre le client de messagerie du visiteur, à
 * destination du cabinet. **Ce n'est pas un envoi serveur** : le visiteur doit
 * appuyer sur « Envoyer » dans son application de courriel.
 *
 * C'est un choix assumé faute de mieux, et non un oubli. Un envoi réellement
 * automatique suppose un point d'entrée côté FastAPI **et des identifiants
 * SMTP** que le cabinet n'a pas encore fournis. Entre-temps, deux options : ce
 * `mailto`, où la demande part vraiment, ou un formulaire qui affiche « merci,
 * c'est envoyé » alors que la saisie est jetée en silence. La seconde est pire.
 *
 * Le bouton WhatsApp est là pour la même raison, et il est même le plus utilisé
 * : une part importante de la clientèle n'ouvre jamais de courriel.
 *
 * Le jour où `POST /vitrine/demandes` existera, seule la fonction `envoyer`
 * change. Le balisage, les champs et les messages restent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Boîte de réception du cabinet. */
const DESTINATAIRE = "contact@cga-brcgroup.com";

export function FormulaireService({
  sujetInitial,
  numeroWhatsapp,
  formes,
  formeInitiale,
}: {
  /** Le service, la session ou la formule dont on part. Modifiable ensuite. */
  sujetInitial: string;
  /** Numéro du cabinet, chiffres seuls. */
  numeroWhatsapp: string;
  /**
   * Les formes juridiques à proposer, si le service en demande une.
   *
   * Absent partout ailleurs, et c'est voulu : demander « SARL ou SAS ? » à qui
   * veut une domiciliation ou une formation n'a pas de sens, et un champ qui ne
   * concerne pas le lecteur est un champ qu'il remplit au hasard.
   */
  formes?: readonly string[];
  /** Code pré-sélectionné — celui du lien d'où l'on vient. */
  formeInitiale?: string;
}) {
  const t = useTranslations("vitrine.demande");
  /* Les libellés viennent de l'estimateur : « SARL unipersonnelle », « Société
     anonyme ». Un seul jeu de noms pour les deux écrans, sinon la forme choisie
     ici ne se reconnaît plus dans le devis. */
  const nomsFormes = useTranslations("pages.estimation.formes");

  const [sujet, setSujet] = useState(sujetInitial);
  /* Une forme inconnue au barème est ignorée : l'adresse est modifiable à la
     main, et mieux vaut un champ vide qu'une valeur inventée. */
  const [forme, setForme] = useState(
    formeInitiale && formes?.includes(formeInitiale) ? formeInitiale : "",
  );
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [courriel, setCourriel] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  /** Le corps du message, identique par courriel et par WhatsApp. */
  function corps() {
    return [
      t("corpsIntro", { sujet }),
      "",
      `${t("champNom")} : ${nom}`,
      `${t("champTelephone")} : ${telephone}`,
      courriel ? `${t("champCourriel")} : ${courriel}` : null,
      forme ? `${t("champForme")} : ${nomsFormes(forme)}` : null,
      message ? `\n${t("champMessage")} :\n${message}` : null,
    ]
      .filter((ligne) => ligne !== null)
      .join("\n");
  }

  function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const objet = encodeURIComponent(t("objet", { sujet }));
    window.location.href = `mailto:${DESTINATAIRE}?subject=${objet}&body=${encodeURIComponent(corps())}`;
    setEnvoye(true);
  }

  const etiquette = "formulaire-service__etiquette";

  return (
    <form className="formulaire-service" onSubmit={envoyer} id="demande">
      <h3 className="formulaire-service__titre">{t("titre")}</h3>
      <p className="formulaire-service__detail">{t("detail")}</p>

      {/* Le service est affiché, pas masqué : le visiteur doit voir sur quoi
          part sa demande. Il reste modifiable — on se trompe de page. */}
      <div>
        <label className={etiquette} htmlFor="demande-sujet">
          {t("champSujet")}
        </label>
        <input
          id="demande-sujet"
          className="formulaire-service__champ"
          type="text"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          required
        />
      </div>

      {/* La forme juridique, quand le service en appelle une.
          Elle est exigée : c'est elle qui détermine le capital minimum, le
          nombre d'associés, le passage ou non chez le notaire et le montant des
          frais. Une demande de création qui ne la dit pas oblige le cabinet à
          rappeler pour la poser — un aller-retour de plus, sur la démarche où
          le visiteur est déjà le plus hésitant. */}
      {formes && formes.length > 0 && (
        <div>
          <label className={etiquette} htmlFor="demande-forme">
            {t("champForme")}
          </label>
          <select
            id="demande-forme"
            className="formulaire-service__champ"
            value={forme}
            onChange={(e) => setForme(e.target.value)}
            required
          >
            {/* Aucune forme n'est cochée d'office quand le visiteur arrive sans
                en avoir choisi une : un choix par défaut serait pris pour un
                conseil du cabinet. */}
            <option value="">{t("choisirForme")}</option>
            {formes.map((code) => (
              <option key={code} value={code}>
                {nomsFormes(code)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="formulaire-service__paire">
        <div>
          <label className={etiquette} htmlFor="demande-nom">
            {t("champNom")}
          </label>
          <input
            id="demande-nom"
            className="formulaire-service__champ"
            type="text"
            autoComplete="name"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
        </div>
        <div>
          {/* Le téléphone est exigé, le courriel facultatif : une part
              importante de la clientèle du cabinet traite par appel et par
              WhatsApp plutôt que par messagerie. */}
          <label className={etiquette} htmlFor="demande-tel">
            {t("champTelephone")}
          </label>
          <input
            id="demande-tel"
            className="formulaire-service__champ"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+237 6…"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={etiquette} htmlFor="demande-courriel">
          {t("champCourriel")} <span className="formulaire-service__facultatif">{t("facultatif")}</span>
        </label>
        <input
          id="demande-courriel"
          className="formulaire-service__champ"
          type="email"
          autoComplete="email"
          value={courriel}
          onChange={(e) => setCourriel(e.target.value)}
        />
      </div>

      <div>
        <label className={etiquette} htmlFor="demande-message">
          {t("champMessage")} <span className="formulaire-service__facultatif">{t("facultatif")}</span>
        </label>
        <textarea
          id="demande-message"
          className="formulaire-service__champ formulaire-service__zone"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
        />
      </div>

      {/* Le consentement est requis avant envoi : ces données sont
          personnelles, et le cabinet doit pouvoir prouver qu'il l'a obtenu. */}
      <label className="formulaire-service__consentement">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        {t("consentement")}
      </label>

      <div className="formulaire-service__actions">
        <button type="submit" className="bouton bouton--principal bouton--large">
          {t("envoyer")}
          <IconeVitrine nom="fleche" taille={16} />
        </button>
        <a
          className="bouton bouton--secondaire bouton--large"
          href={`https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(corps())}`}
          target="_blank"
          rel="noreferrer noopener"
          /* Désactivé tant que le consentement n'est pas donné : la même règle
             doit valoir quel que soit le canal. */
          aria-disabled={!consent}
          onClick={(e) => {
            if (!consent) e.preventDefault();
          }}
        >
          <IconeVitrine nom="whatsapp" taille={16} />
          {t("envoyerWhatsapp")}
        </a>
      </div>

      {/* `role="status"` : l'annonce est lue sans voler le focus du champ. */}
      <p className="formulaire-service__confirmation" role="status">
        {envoye ? t("confirmation") : ""}
      </p>
    </form>
  );
}
