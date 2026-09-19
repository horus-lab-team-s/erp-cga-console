"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { DEMARCHES, type ResultatDemande } from "@/app/lib/acquisition";
import { deposerUneDemande } from "@/app/lib/actions-acquisition";

import { IconeVitrine } from "./IconeVitrine";

/**
 * Formulaire de contact — maquette, page `surContact`.
 *
 * Le **téléphone est le champ exigé**, et le courriel facultatif — l'inverse de
 * l'habitude occidentale. C'est un constat d'usage : au Cameroun, une part
 * importante de la clientèle traite par appel et par WhatsApp plutôt que par
 * messagerie électronique.
 *
 * Ce constat guide la mise en page ; il n'est plus **écrit** au bas du
 * formulaire. La phrase qui s'y trouvait a été retirée le 13 août 2026 à la
 * demande du cabinet : lue par un prospect, elle donnait de la clientèle une
 * image peu flatteuse, alors qu'elle n'était qu'une note de conception.
 *
 * ⚠️ **Il enregistre la demande ET ouvre WhatsApp.** Son en-tête disait qu'il
 * composait un message WhatsApp « plutôt que d'appeler une API qui n'existe pas
 * encore ». Cette API existait depuis longtemps, `POST /acquisition/demandes`, et
 * aucune demande venue du site n'entrait donc dans le parcours d'acquisition :
 * ni affectation, ni veille, ni relance ne voyaient jamais un vrai prospect. Voir
 * `app/lib/actions-acquisition.ts`.
 *
 * WhatsApp s'ouvre toujours, au clic, parce que l'ouverture d'une fenêtre doit
 * suivre immédiatement le geste du visiteur : attendre la réponse du serveur
 * avant de l'ouvrir la ferait bloquer par le navigateur comme une fenêtre
 * surgissante. L'enregistrement part en même temps, et son issue s'affiche sous
 * le bouton.
 *
 * Le consentement est requis avant envoi : ces données sont personnelles et le
 * cabinet doit pouvoir prouver qu'il l'a obtenu.
 */

// ⚠️ La liste vit dans `app/lib/acquisition.ts` : l'action serveur la revérifie, et
// deux copies de la même liste finiraient par diverger.
const DEMANDES = DEMARCHES;

export function FormulaireContact() {
  const t = useTranslations("pages.contact");
  const form = useTranslations("vitrine.formulaire");
  const commun = useTranslations("commun");

  const [demande, setDemande] = useState<string>("creation");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [courriel, setCourriel] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [tente, setTente] = useState(false);
  // `null` : rien d'envoyé ; `"en-cours"` : l'enregistrement est parti.
  const [resultat, setResultat] = useState<ResultatDemande | "en-cours" | null>(null);

  const chiffres = telephone.replace(/\D/g, "");
  const complet = nom.trim().length >= 3 && chiffres.length >= 8 && consent;

  const numero = commun("cabinet.whatsapp").replace(/\D/g, "");
  const corps = [
    `${t("votreDemande")} : ${form(`demarches.${demande}`)}`,
    `${t("champNom")} : ${nom.trim()}`,
    `${t("champTel")} : ${chiffres}`,
    courriel.trim() ? `${t("champMail")} : ${courriel.trim()}` : null,
    message.trim() ? `${t("champMessage")} : ${message.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const etiquette: React.CSSProperties = {
    display: "block",
    marginBottom: 5,
    font: "600 11.5px/1.4 var(--police-texte)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--ink-500)",
  };
  const saisie: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 46,
    padding: "12px",
    border: "1px solid var(--line-200)",
    borderRadius: 9,
    background: "var(--surface)",
    color: "var(--ink-900)",
    font: "400 14px/1.4 var(--police-texte)",
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <label style={etiquette} htmlFor="demande">
          {t("votreDemande")}
        </label>
        <select
          id="demande"
          style={saisie}
          value={demande}
          onChange={(e) => setDemande(e.target.value)}
        >
          {DEMANDES.map((cle) => (
            <option key={cle} value={cle}>
              {form(`demarches.${cle}`)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div>
          <label style={etiquette} htmlFor="contact-nom">
            {t("champNom")}
          </label>
          <input
            id="contact-nom"
            type="text"
            style={{
              ...saisie,
              ...(tente && nom.trim().length < 3
                ? { borderColor: "var(--danger)", borderWidth: 2 }
                : {}),
            }}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          {/* Champ principal : voir la note de la maquette. */}
          <label style={etiquette} htmlFor="contact-tel">
            {t("champTel")}
          </label>
          <input
            id="contact-tel"
            type="tel"
            inputMode="numeric"
            placeholder="699 902 184"
            style={{
              ...saisie,
              ...(tente && chiffres.length < 8
                ? { borderColor: "var(--danger)", borderWidth: 2 }
                : {}),
            }}
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      <div>
        <label style={etiquette} htmlFor="contact-mail">
          {t("champMail")}
        </label>
        <input
          id="contact-mail"
          type="email"
          style={saisie}
          value={courriel}
          onChange={(e) => setCourriel(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div>
        <label style={etiquette} htmlFor="contact-message">
          {t("champMessage")}
        </label>
        <textarea
          id="contact-message"
          rows={4}
          style={{ ...saisie, minHeight: 110, resize: "vertical" }}
          placeholder={t("messageExemple")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          font: "400 13px/1.6 var(--police-texte)",
          color: "var(--ink-500)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 3, flex: "none" }}
        />
        {t("consentement")}
      </label>

      {tente && !complet && (
        <p role="alert" style={{ margin: 0, font: "500 12.5px/1.5 var(--police-texte)", color: "var(--danger)" }}>
          {commun("formulaire.champsRequis")}
        </p>
      )}

      <a
        className="bouton bouton--principal bouton--large"
        style={{ alignSelf: "flex-start", ...(complet ? {} : { opacity: 0.72 }) }}
        href={`https://wa.me/${numero}?text=${encodeURIComponent(corps)}`}
        target="_blank"
        rel="noreferrer noopener"
        aria-disabled={!complet}
        onClick={(e) => {
          if (!complet) {
            e.preventDefault();
            setTente(true);
            return;
          }
          // ⚠️ Pas de `preventDefault` ici : WhatsApp s'ouvre sur le geste même.
          // L'enregistrement part en parallèle, et un double clic n'en envoie
          // qu'un tant que le premier n'a pas répondu.
          if (resultat === "en-cours") return;
          setResultat("en-cours");
          deposerUneDemande({
            demarche: demande as (typeof DEMARCHES)[number],
            nom,
            telephone,
            courriel,
            message,
            consentementContact: consent,
            origine: "vitrine-contact",
          }).then(setResultat, () =>
            setResultat({ enregistree: false, motif: t("enregistrement.indisponible") }),
          );
        }}
      >
        {t("envoyer")}
        <IconeVitrine nom="fleche" taille={16} />
      </a>

      {resultat !== null && (
        <p
          role="status"
          style={{
            margin: 0,
            font: "500 13px/1.6 var(--police-texte)",
            color:
              resultat !== "en-cours" && !resultat.enregistree ? "var(--danger)" : "var(--ink-500)",
          }}
        >
          {resultat === "en-cours"
            ? t("enregistrement.enCours")
            : resultat.enregistree
              ? t("enregistrement.reussi")
              : t("enregistrement.echec", { motif: resultat.motif })}
        </p>
      )}

      {/* La note qui figurait ici a été retirée le 13 août 2026, à la demande du
          cabinet, et le retrait est juste : « beaucoup de nos clients n'utilisent
          pas de messagerie électronique » est une observation de gestion interne,
          pas un argument de vente. Lue par un prospect, elle donnait du cabinet
          l'image d'une clientèle peu équipée — l'inverse de ce qu'on veut dire.
          Le champ téléphone reste le champ principal ; c'est la mise en page qui
          le dit, pas une phrase. */}
    </form>
  );
}
