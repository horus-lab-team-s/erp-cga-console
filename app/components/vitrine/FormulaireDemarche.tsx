"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { IconeVitrine } from "./IconeVitrine";

/**
 * Formulaire « Lancer une démarche », superposé au héros — maquette § héros.
 *
 * Il n'y a **aucun compte à créer** : trois champs, et un expert rappelle. C'est
 * la porte d'entrée la plus courte du site, et elle doit le rester.
 *
 * ⚠️ Le formulaire n'est pas encore branché : il compose un message WhatsApp
 * pré-rempli plutôt que d'appeler une API inexistante. Un envoi qui ne part nulle
 * part coûterait plus cher qu'un lien franc — le prospect croirait avoir été
 * enregistré. Le point d'entrée `POST /prospects` viendra avec le contexte
 * I · Création d'entreprise.
 */

const DEMARCHES = [
  "creation",
  "adhesion",
  "ponctuel",
  "domiciliation",
  "formation",
  "autre",
] as const;

/** Indicatifs de la sous-région, le Cameroun en tête. */
const INDICATIFS = [
  { code: "CM", indicatif: "+237", pays: "Cameroun" },
  { code: "GA", indicatif: "+241", pays: "Gabon" },
  { code: "CG", indicatif: "+242", pays: "Congo" },
  { code: "TD", indicatif: "+235", pays: "Tchad" },
  { code: "CF", indicatif: "+236", pays: "Centrafrique" },
  { code: "GQ", indicatif: "+240", pays: "Guinée équatoriale" },
  { code: "CI", indicatif: "+225", pays: "Côte d'Ivoire" },
  { code: "SN", indicatif: "+221", pays: "Sénégal" },
  { code: "FR", indicatif: "+33", pays: "France" },
  { code: "BE", indicatif: "+32", pays: "Belgique" },
  { code: "US", indicatif: "+1", pays: "États-Unis" },
  { code: "GB", indicatif: "+44", pays: "Royaume-Uni" },
];

export function FormulaireDemarche() {
  const t = useTranslations("vitrine.formulaire");
  const commun = useTranslations("commun");

  const [demarche, setDemarche] = useState<string>("creation");
  const [nom, setNom] = useState("");
  const [indicatif, setIndicatif] = useState("+237");
  const [telephone, setTelephone] = useState("");

  const numeroCabinet = commun("cabinet.whatsapp").replace(/[^\d]/g, "");
  const message = [
    t("titre"),
    `${t("demarche")} : ${t(`demarches.${demarche}`)}`,
    nom ? `${t("nom")} : ${nom}` : null,
    telephone ? `${t("tel")} : ${indicatif} ${telephone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <form className="formulaire-heros" onSubmit={(e) => e.preventDefault()}>
      <div>
        <h2 className="formulaire-heros__titre">{t("titre")}</h2>
        <p className="formulaire-heros__detail">{t("detail")}</p>
      </div>

      <div>
        <label className="champ__etiquette" htmlFor="demarche">
          {t("demarche")}
        </label>
        <select
          id="demarche"
          className="champ__saisie"
          value={demarche}
          onChange={(e) => setDemarche(e.target.value)}
        >
          {DEMARCHES.map((cle) => (
            <option key={cle} value={cle}>
              {t(`demarches.${cle}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="champ__etiquette" htmlFor="nom">
          {t("nom")}
        </label>
        <input
          id="nom"
          type="text"
          className="champ__saisie"
          placeholder={t("nomExemple")}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div>
        <label className="champ__etiquette" htmlFor="telephone">
          {t("tel")}
        </label>
        <div className="champ__groupe">
          <select
            className="champ__saisie"
            style={{ width: 118, flex: "none" }}
            aria-label="Indicatif"
            value={indicatif}
            onChange={(e) => setIndicatif(e.target.value)}
          >
            {INDICATIFS.map((i) => (
              <option key={i.code} value={i.indicatif}>
                {i.indicatif} {i.code}
              </option>
            ))}
          </select>
          <input
            id="telephone"
            type="tel"
            className="champ__saisie"
            placeholder="699 902 184"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      <a
        className="bouton bouton--principal bouton--large"
        href={`https://wa.me/${numeroCabinet}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        {t("bouton")}
        <IconeVitrine nom="fleche" taille={16} />
      </a>

      <p className="formulaire-heros__pied">{t("pied")}</p>
    </form>
  );
}
