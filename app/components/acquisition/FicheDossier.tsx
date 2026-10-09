"use client";

import { useActionState, useState } from "react";
import { TIRET } from "@/app/lib/formats";

import {
  chiffrerLeDossier,
  confirmerLEncaissement,
  declarerLePremierContact,
  demanderLeReglement,
  emettreLaProforma,
  enregistrerLaQualification,
  transmettreLaProforma,
  type EtatChiffrage,
  type EtatEmission,
} from "@/app/lib/actions-acquisition";
import type { CompositionOfferte, LienDeLaProforma, Question } from "@/app/lib/console-acquisition";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 3,
  padding: "5px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

/** La valeur déjà enregistrée, remise sous la forme qu'attend le champ. */
function valeurInitiale(question: Question, brute: string | undefined): string {
  if (brute === undefined) return "";
  if (question.type === "BOOLEEN") return brute === "True" ? "oui" : brute === "False" ? "non" : "";
  if (question.type === "LISTE") {
    // Le backend rend la liste comme Python l'écrit : « ['a', 'b'] ».
    return brute.replace(/^\[|\]$/g, "").split(",").map((m) => m.trim().replace(/^'|'$/g, "")).filter(Boolean).join(", ");
  }
  return brute;
}

function Champ({ question, valeur }: { question: Question; valeur: string }) {
  const nom = `q_${question.code}`;
  if (question.type === "ENUM" && question.valeurs) {
    return (
      <select name={nom} defaultValue={valeur} style={champ}>
        <option value="">{TIRET}</option>
        {question.valeurs.map((v) => (
          <option key={v} value={v}>
            {v.replaceAll("_", " ").toLowerCase()}
          </option>
        ))}
      </select>
    );
  }
  if (question.type === "BOOLEEN") {
    return (
      <select name={nom} defaultValue={valeur} style={champ}>
        <option value="">sans réponse</option>
        <option value="oui">oui</option>
        <option value="non">non</option>
      </select>
    );
  }
  return (
    <input
      name={nom}
      defaultValue={valeur}
      inputMode={question.type === "ENTIER" || question.type === "DECIMAL" ? "numeric" : undefined}
      placeholder={question.type === "LISTE" ? "séparées par des virgules" : question.unite ?? undefined}
      style={champ}
    />
  );
}

/**
 * La qualification, engendrée depuis le questionnaire du référentiel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ C'EST LE QUESTIONNAIRE QUI COMMANDE L'ÉCRAN
 *
 * Aucune question n'est écrite ici : le libellé, le type, les valeurs admises,
 * l'unité, l'aide et le caractère obligatoire viennent du référentiel. Ajouter une
 * question au questionnaire l'ajoute à l'écran, sans développeur.
 *
 * Les valeurs saisies partent en texte ; le backend les convertit au type de la
 * question et refuse, en nommant la question, ce qui ne s'y convertit pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Qualification({
  reference,
  questions,
  faits,
  manquantes,
  modifiable,
}: {
  reference: string;
  questions: Question[];
  faits: Record<string, string>;
  manquantes: string[];
  modifiable: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerLaQualification, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} style={{ padding: "12px 16px" }}>
      <input type="hidden" name="reference" value={reference} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {questions.map((q) => (
          <label key={q.code} style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
            {q.libelle}
            {q.obligatoire ? " *" : ""}
            {manquantes.includes(q.code) && (
              <span style={{ color: "var(--warning)", fontWeight: 400 }}> · manquante</span>
            )}
            <Champ question={q} valeur={valeurInitiale(q, faits[q.code])} />
            {q.aide && <span style={{ ...note, display: "block", marginTop: 2, fontWeight: 400 }}>{q.aide}</span>}
          </label>
        ))}
      </div>
      <label style={{ display: "block", marginTop: 12, font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
        Note d&rsquo;échange (n&rsquo;entre pas dans le prix)
        <textarea name="note" rows={2} style={{ ...champ, resize: "vertical" }} />
      </label>
      {modifiable && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button type="submit" className="bouton-discret" disabled={enCours}>
            {enCours ? "…" : "Enregistrer les réponses"}
          </button>
          {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
          {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
        </div>
      )}
    </form>
  );
}

const CHIFFRAGE_INITIAL: EtatChiffrage = { echec: null, proposition: null };

function francs(valeur: string): string {
  return `${Number(valeur).toLocaleString("fr-FR")} FCFA`;
}

/**
 * Le chiffrage : un intervalle, jamais un prix, sur les réponses enregistrées.
 *
 * ⚠️ Les ajustements écartés faute de réponse sont montrés comme des questions à
 * poser (pas 66) : une remise ou une majoration ne se fonde pas sur ce qu'on ignore.
 */
export function Chiffrage({ reference }: { reference: string }) {
  const [etat, chiffrer, enCours] = useActionState(chiffrerLeDossier, CHIFFRAGE_INITIAL);
  const p = etat.proposition;
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <form action={chiffrer} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <input type="hidden" name="reference" value={reference} />
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Score de charge (déclaré)
          <input name="score_charge" inputMode="numeric" defaultValue="0" style={{ ...champ, width: 120 }} />
        </label>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Calculer l’intervalle"}
        </button>
      </form>
      <p style={note}>
        Le score de charge n&rsquo;est pas encore mesuré pour un prospect : il est déclaré, et
        conservé avec les faits de la proforma (question ouverte Q21).
      </p>
      {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</p>}
      {p && (
        <div>
          <p style={{ margin: 0, font: "600 15px/1.5 var(--police-texte)" }}>
            {francs(p.plancher)} · <span style={{ color: "var(--brand-indigo-700)" }}>{francs(p.reference)}</span> ·{" "}
            {francs(p.plafond)}
          </p>
          <p style={note}>
            Plancher, référence et plafond · barème {p.version_bareme} · base {francs(p.base)}
          </p>
          {p.lignes.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {p.lignes.map((l) => (
                <li key={l.code} style={{ ...note, color: "var(--ink-700)" }} title={l.fondement}>
                  {l.libelle} : {Number(l.montant) > 0 ? "+" : ""}
                  {francs(l.montant)} ({l.code})
                </li>
              ))}
            </ul>
          )}
          {p.echecs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ ...note, color: "var(--warning)", fontWeight: 600 }}>À vérifier avant d&rsquo;arrêter un prix :</p>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {p.echecs.map((e) => (
                  <li key={e} style={note}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMISSION_INITIALE: EtatEmission = { echec: null, proforma: null, lien: null };

/**
 * « J'ai joint le client » : le geste qui engage l'échange.
 *
 * ⚠️ Il ne s'affiche qu'à `AFFECTÉE`. Ailleurs, l'échange a déjà commencé, et
 * offrir un bouton sans effet ferait douter de tous les autres.
 */
export function PremierContact({ reference }: { reference: string }) {
  const [etat, declarer, enCours] = useActionState(
    declarerLePremierContact,
    ETAT_ACTE_INITIAL,
  );
  if (etat.fait) {
    return (
      <p role="status" style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)", color: "var(--success)" }}>
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={declarer} style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="reference" value={reference} />
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)", flex: "1 1 280px" }}>
        Ce qui a été dit
        <input
          name="commentaire"
          maxLength={300}
          placeholder="Client joint, session de novembre retenue."
          style={champ}
        />
      </label>
      <button type="submit" className="bouton-primaire" disabled={enCours}>
        {enCours ? "…" : "J’ai joint le client"}
      </button>
      {etat.echec && (
        <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>
      )}
    </form>
  );
}

/** Le client à qui la proforma part : ce que la fiche sait de lui, et ce qu'il a permis. */
export type DestinataireDeLaProforma = {
  nom: string;
  telephone: string;
  courriel: string | null;
  /** Accord WhatsApp en vigueur : accordé ET non révoqué. */
  whatsapp: boolean;
};

/**
 * Le numéro au format qu'attend `wa.me` : chiffres seuls, indicatif compris.
 *
 * ⚠️ `wa.me` refuse le `+`, les espaces et le zéro initial. Un numéro camerounais à
 * neuf chiffres reçoit l'indicatif 237 ; un numéro déjà international passe tel quel.
 */
export function numeroWhatsapp(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");
  return chiffres.length === 9 ? `237${chiffres}` : chiffres;
}

/**
 * Le message WhatsApp, repris mot pour mot du modèle `cga_envoi_proforma`
 * (Docs/referentiel/messagerie/modeles). ⚠️ Le même texte que le modèle soumis à
 * la plateforme : le jour où l'envoi passera par elle, le client lira la même chose.
 */
export function messageWhatsapp(nom: string, numero: string, montant: string, lien: string): string {
  return (
    `Bonjour ${nom}, votre proforma n° ${numero} est prête, pour un montant de ` +
    `${Number(montant).toLocaleString("fr-FR")} FCFA.\n` +
    `Vous pouvez la consulter ici : ${lien}\n` +
    "Répondez à ce message si vous souhaitez en discuter avant de valider."
  );
}

/**
 * Arrêter le montant après l'échange, émettre la proforma, et l'envoyer au client.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE PRIX N'EST PAS AU CATALOGUE : IL EST ARRÊTÉ ICI
 *
 * Pour un service sur étude, le prix vient de l'échange avec le client. Le
 * responsable l'arrête, et la proforma part aussitôt chez le client, qui la
 * retrouve dans sa boîte de courriel ou dans WhatsApp, avec le lien pour la lire et
 * l'accepter sans compte.
 *
 * DEUX CHEMINS D'ENVOI
 *
 *   courriel   c'est le SERVEUR qui écrit, au moment où il forge le lien : le lien
 *              ne passe par personne, et la transmission est notée d'elle-même
 *   WhatsApp   le responsable l'envoie depuis le compte du cabinet, message déjà
 *              rédigé ; il note ensuite la transmission, que rien d'autre ne voit
 *
 * ⚠️ WHATSAPP SEULEMENT SI LE CLIENT L'A PERMIS. Le consentement recueilli au dépôt
 * de la demande fait foi ; un refus interdit WhatsApp, il n'interdit pas le courriel
 * ni l'appel. L'écran le dit au lieu de cacher le bouton sans raison.
 *
 * ⚠️ LE LIEN NE S'AFFICHE QU'UNE FOIS
 *
 * Le backend ne rend le lien d'acceptation qu'à l'émission. C'est pourquoi ce
 * composant reste le même avant et après l'émission (voir la page) : s'il était
 * démonté au rafraîchissement, le lien disparaîtrait avant d'avoir été envoyé.
 *
 * ⚠️ LA SÉPARATION DES TÂCHES EST DITE, PAS LAISSÉE CROIRE
 *
 * Le compte qui chiffre engage aussi le cabinet (pas 63) : l'écran l'affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function EmissionProforma({
  reference,
  referenceProposee,
  client,
  dejaEmise,
  lienRelu,
  compositions,
}: {
  reference: string;
  referenceProposee: string | null;
  client: DestinataireDeLaProforma;
  /** Le dossier est déjà à l'état « proforma émise » quand la page s'ouvre. */
  dejaEmise: boolean;
  /**
   * Le lien relu par le serveur, quand la proforma existe déjà et que le lecteur
   * a le droit de le voir. `null` sinon : habilitation insuffisante, ou rien à
   * relire. Voir `lireLeLienDeLaProforma`.
   */
  lienRelu: LienDeLaProforma | null;
  /**
   * Les documents proposables pour ce service (pas 148). Vide : le référentiel
   * est absent ou l'habilitation trop courte, et l'émission reste possible sans
   * document.
   */
  compositions: CompositionOfferte[];
}) {
  const [etat, emettre, enCours] = useActionState(emettreLaProforma, EMISSION_INITIALE);
  const [transmis, transmettre, transmissionEnCours] = useActionState(transmettreLaProforma, ETAT_ACTE_INITIAL);
  const [copie, setCopie] = useState(false);
  const p = etat.proforma;

  if (p) {
    const parti = p.courriel === "ENVOYE";
    const lien = etat.lien;
    return (
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, font: "600 14px/1.5 var(--police-texte)" }}>
          {p.numero} · {francs(p.montant)}
        </p>
        {p.plancher && p.plafond && (
          <p style={note}>
            Intervalle recalculé : {francs(p.plancher)} à {francs(p.plafond)}, référence {francs(p.reference ?? "0")}.
          </p>
        )}
        {!p.separation_respectee && (
          <p style={{ ...note, color: "var(--warning)" }}>
            Chiffrée et engagée par le même compte : aucune validation par un second collaborateur.
          </p>
        )}

        {p.courriel && (
          <p role="status" style={{ ...note, color: parti ? "var(--success)" : "var(--warning)" }}>
            {parti
              ? `Envoyée par courriel à ${p.courriel_masque}. Transmission notée : la relance est armée.`
              : p.courriel === "SANS_ADRESSE"
                ? "Aucun courriel au dossier : envoyez-la par WhatsApp, ou lisez le lien au client par téléphone."
                : "Le courriel n'est pas parti. Envoyez-la par WhatsApp, ou réessayez plus tard par courriel."}
          </p>
        )}

        {lien && (
          <div style={{ padding: "10px 12px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ ...note, color: "var(--ink-900)", fontWeight: 600 }}>
              {parti ? "Le client a son lien. Vous pouvez aussi le lui envoyer sur WhatsApp :" : "Envoyez le lien au client maintenant : il ne sera plus affiché."}
            </p>
            <p style={{ margin: 0, font: "400 12px/1.4 var(--police-mono)", wordBreak: "break-all" }}>{lien}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {client.whatsapp ? (
                <a
                  className="bouton-primaire"
                  href={`https://wa.me/${numeroWhatsapp(client.telephone)}?text=${encodeURIComponent(
                    messageWhatsapp(client.nom, p.numero, p.montant, lien),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Envoyer sur WhatsApp
                </a>
              ) : (
                <span style={note}>WhatsApp : le client ne l&rsquo;a pas autorisé à sa demande.</span>
              )}
              <button
                type="button"
                className="bouton-discret"
                onClick={() => {
                  // ⚠️ Le presse-papiers peut être refusé (page non sécurisée, réglage du
                  // navigateur) : le lien reste alors lisible et sélectionnable au-dessus.
                  navigator.clipboard?.writeText(lien).then(
                    () => setCopie(true),
                    () => setCopie(false),
                  );
                }}
              >
                {copie ? "Lien copié" : "Copier le lien"}
              </button>
            </div>
          </div>
        )}

        {parti ? null : transmis.fait ? (
          <span role="status" style={{ ...note, color: "var(--success)" }}>{transmis.fait}</span>
        ) : (
          <form action={transmettre}>
            <input type="hidden" name="numero" value={p.numero} />
            <button type="submit" className="bouton-discret" disabled={transmissionEnCours}>
              {transmissionEnCours ? "…" : "J’ai envoyé le lien au client"}
            </button>
            {transmis.echec && <span role="alert" style={{ ...note, color: "var(--danger)", marginLeft: 8 }}>{transmis.echec}</span>}
          </form>
        )}
      </div>
    );
  }

  if (dejaEmise) {
    /*
      ─────────────────────────────────────────────────────────────────────────
      ⚠️ CE PANNEAU DISAIT « le lien a été remis à l'émission ET NE SE RÉAFFICHE
      PAS », ce qui était vrai et coûtait cher.

      Le responsable qui rechargeait la page, fermait l'onglet, ou revenait le
      lendemain sur le dossier n'avait plus aucun moyen d'envoyer la proposition
      sur WhatsApp. Vérifié le 29 septembre sur la pile, sur sept dossiers réels
      en PROFORMA_EMISE : aucun n'affichait le bouton.

      Le serveur sait pourtant recomposer ce lien, et le faisait déjà pour le
      courriel. Il le relit maintenant sans rien noter.
      ─────────────────────────────────────────────────────────────────────────
    */
    if (!lienRelu) {
      return (
        <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
          Émise, en attente de l&rsquo;accord du client. Le lien d&rsquo;acceptation ne vous est pas
          accessible : il demande l&rsquo;habilitation qui permet de chiffrer un dossier.
        </p>
      );
    }
    const relance = transmis.fait;
    return (
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, font: "600 14px/1.5 var(--police-texte)" }}>
          {lienRelu.numero} · {francs(lienRelu.montant)}
        </p>
        <p style={{ ...note, color: "var(--ink-900)", fontWeight: 600 }}>
          Émise, en attente de l&rsquo;accord du client. Vous pouvez lui renvoyer le lien :
        </p>
        <p style={{ margin: 0, font: "400 12px/1.4 var(--police-mono)", wordBreak: "break-all" }}>
          {lienRelu.lien_client}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {lienRelu.whatsapp_autorise ? (
            <a
              className="bouton-primaire"
              href={`https://wa.me/${numeroWhatsapp(lienRelu.telephone)}?text=${encodeURIComponent(
                messageWhatsapp(lienRelu.nom, lienRelu.numero, lienRelu.montant, lienRelu.lien_client),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Envoyer sur WhatsApp
            </a>
          ) : (
            <span style={note}>WhatsApp : le client ne l&rsquo;a pas autorisé à sa demande.</span>
          )}
          <button
            type="button"
            className="bouton-discret"
            onClick={() => {
              navigator.clipboard?.writeText(lienRelu.lien_client).then(
                () => setCopie(true),
                () => setCopie(false),
              );
            }}
          >
            {copie ? "Lien copié" : "Copier le lien"}
          </button>
          {relance ? (
            <span role="status" style={{ ...note, color: "var(--success)" }}>{relance}</span>
          ) : (
            <form action={transmettre}>
              <input type="hidden" name="numero" value={lienRelu.numero} />
              <button type="submit" className="bouton-discret" disabled={transmissionEnCours}>
                {transmissionEnCours ? "…" : "J’ai envoyé le lien au client"}
              </button>
              {transmis.echec && (
                <span role="alert" style={{ ...note, color: "var(--danger)", marginLeft: 8 }}>{transmis.echec}</span>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={emettre} style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="reference" value={reference} />
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
        Montant arrêté (FCFA)
        <input name="montant" inputMode="numeric" required defaultValue={referenceProposee ?? ""} style={{ ...champ, width: 160 }} />
      </label>
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)", flex: "1 1 240px" }}>
        Motif (obligatoire hors de l&rsquo;intervalle)
        <input name="motif" maxLength={500} style={champ} />
      </label>
      <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
        Score de charge
        <input name="score_charge" inputMode="numeric" defaultValue="0" style={{ ...champ, width: 100 }} />
      </label>
      {/*
        ⚠️ LE DOCUMENT, CHOISI EN MÊME TEMPS QUE LE PRIX (pas 148).

        C'est le geste réel du cabinet : le responsable arrête le montant après
        l'échange ET sélectionne ce que la proforma couvre. Sans choix, aucun PDF
        n'est produit et l'empreinte reste celle du résumé, comme avant.

        ⚠️ Le statut est affiché. Une composition `TRANSCRIT` n'a pas été
        confirmée par la direction ; l'envoyer à une cliente est une décision, et
        elle doit être prise en connaissance de cause.
      */}
      {compositions.length > 0 && (
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)", flexBasis: "100%" }}>
          Document de la proforma
          <select name="composition" defaultValue="" style={{ ...champ, width: "100%" }}>
            <option value="">Aucun document (empreinte du résumé, comme avant)</option>
            {compositions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.titre} · {c.libelle} · {francs(c.total)}
                {c.statut !== "VALIDE" ? ` · ${c.statut.toLowerCase()}, non confirmé par la direction` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <label
        style={{ flexBasis: "100%", display: "flex", gap: 8, alignItems: "center", font: "400 13px/1.4 var(--police-texte)", color: client.courriel ? "var(--ink-900)" : "var(--ink-500)" }}
      >
        <input type="checkbox" name="envoyer_par_courriel" value="oui" defaultChecked={Boolean(client.courriel)} disabled={!client.courriel} />
        {client.courriel
          ? `Envoyer la proforma par courriel à ${client.courriel}, dès l’émission`
          : "Aucun courriel au dossier : l’envoi se fera par WhatsApp ou par téléphone"}
      </label>
      <button type="submit" className="bouton-primaire" disabled={enCours}>
        {enCours ? "…" : "Émettre la proforma"}
      </button>
      {etat.echec && <p role="alert" style={{ ...note, color: "var(--danger)", flexBasis: "100%" }}>{etat.echec}</p>}
    </form>
  );
}

/**
 * Faire régler une proforma acceptée (pas 68).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX CHEMINS, UN SEUL ESPACE
 *
 *   par téléphone        la demande part, le client valide son code, l'opérateur
 *                        notifie, et l'espace s'ouvre sans humain
 *   espèces, virement    un collaborateur constate le règlement et le confirme
 *
 * ⚠️ L'ADRESSE RETENUE NE SE CHANGE PAS
 *
 * La première demande la retient, et c'est elle qu'on annonce au client. Elle
 * s'affiche alors en lecture seule : la confirmation manuelle ne peut plus ouvrir
 * l'espace ailleurs (le backend le refuserait, pas 68).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Reglement({
  numero,
  montant,
  telephone,
  slugRetenu,
}: {
  numero: string;
  montant: string;
  telephone: string;
  slugRetenu: string | null;
}) {
  const [demande, demander, demandeEnCours] = useActionState(demanderLeReglement, ETAT_ACTE_INITIAL);
  const [encaisse, confirmer, confirmationEnCours] = useActionState(confirmerLEncaissement, ETAT_ACTE_INITIAL);
  const champSlug = slugRetenu ? (
    <>
      <input type="hidden" name="slug" value={slugRetenu} />
      <span style={{ display: "block", marginTop: 3, font: "500 13px/1.4 var(--police-mono)" }}>{slugRetenu}</span>
    </>
  ) : (
    <input name="slug" required minLength={3} maxLength={40} placeholder="station-bonaberi" style={{ ...champ, width: 220 }} />
  );
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, font: "600 14px/1.5 var(--police-texte)" }}>
        {numero} · {francs(montant)} à régler
      </p>

      <form action={demander} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <input type="hidden" name="numero" value={numero} />
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Adresse de l&rsquo;espace{slugRetenu ? " (retenue)" : ""}
          {champSlug}
        </label>
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Téléphone à débiter
          <input name="telephone" defaultValue={telephone} style={{ ...champ, width: 170 }} />
        </label>
        <button type="submit" className="bouton-discret" disabled={demandeEnCours}>
          {demandeEnCours ? "…" : "Demander le paiement par téléphone"}
        </button>
        {demande.echec && <p role="alert" style={{ ...note, color: "var(--danger)", flexBasis: "100%" }}>{demande.echec}</p>}
        {demande.fait && <p role="status" style={{ ...note, color: "var(--success)", flexBasis: "100%" }}>{demande.fait}</p>}
      </form>

      <form action={confirmer} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid var(--line-100)", paddingTop: 12 }}>
        <input type="hidden" name="numero" value={numero} />
        <p style={{ ...note, flexBasis: "100%" }}>Règlement reçu autrement (espèces au guichet, virement) :</p>
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Adresse de l&rsquo;espace{slugRetenu ? " (retenue)" : ""}
          {champSlug}
        </label>
        <label style={{ font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" }}>
          Référence du reçu ou du virement
          <input name="reference_externe" maxLength={120} style={{ ...champ, width: 220 }} />
        </label>
        <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start", flexBasis: "100%" }}>
          <input type="checkbox" name="rapproche" value="oui" required />
          <span>J&rsquo;ai constaté le règlement de {francs(montant)}. La confirmation ouvre l&rsquo;espace du client.</span>
        </label>
        <button type="submit" className="bouton-discret" disabled={confirmationEnCours}>
          {confirmationEnCours ? "…" : "Confirmer le règlement"}
        </button>
        {encaisse.echec && <p role="alert" style={{ ...note, color: "var(--danger)", flexBasis: "100%" }}>{encaisse.echec}</p>}
        {encaisse.fait && <p role="status" style={{ ...note, color: "var(--success)", flexBasis: "100%" }}>{encaisse.fait}</p>}
      </form>
    </div>
  );
}
