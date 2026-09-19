"use client";

import { useActionState, useState } from "react";

import { etablirUnDevis, sEngagerSurLeDevis, type EtatEngagement } from "@/app/lib/actions-souscription";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import type { Service } from "@/app/lib/souscription";
import { Link } from "@/i18n/navigation";

const colonne: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontWeight: 600 };
const champ: React.CSSProperties = { padding: "8px 10px", fontSize: 15 };
const note: React.CSSProperties = { margin: 0, fontWeight: 400, fontSize: 13, color: "var(--ink-500, #4f5b60)" };

/**
 * Établir un devis en ligne (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ SEULS LES SERVICES SOUSCRIPTIBLES EN LIGNE SONT PROPOSÉS
 *
 * La page ne passe que ceux dont le backend dit `souscriptible_en_ligne`. Une création
 * d'entreprise se chiffre sur étude : la proposer ici mènerait à un devis sans prix.
 *
 * ⚠️ LA FORMULE N'EST PAS DEVINÉE À L'ÉCRAN
 *
 * Pour l'adhésion, le backend choisit la formule d'après le chiffre d'affaires déclaré.
 * Le visiteur peut en désigner une ; s'il se trompe, le backend refuse et dit pourquoi.
 * Recopier ici les planchers et plafonds ferait deux règles qui divergeraient.
 *
 * ⚠️ LE NIU EST DEMANDÉ, ET IL NE DONNE RIEN SEUL
 *
 * Le texte le dit au visiteur : l'accès au dossier s'ouvre après vérification de
 * l'identité par le cabinet (pas 83). Promettre un accès immédiat serait faux.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FormulaireSouscription({ services, choisi }: { services: Service[]; choisi?: string }) {
  const [etat, etablir, enCours] = useActionState(etablirUnDevis, ETAT_ACTE_INITIAL);
  const initial = services.find((s) => s.code === choisi) ?? services[0];
  const [code, setCode] = useState(initial?.code ?? "");
  const service = services.find((s) => s.code === code);

  return (
    <form action={etablir} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      <label style={{ ...colonne, gridColumn: "1 / -1" }}>
        Service
        <select name="service" required value={code} onChange={(e) => setCode(e.target.value)} style={champ}>
          {services.map((s) => (
            <option key={s.code} value={s.code}>
              {s.libelle}
            </option>
          ))}
        </select>
        {service?.resume && <span style={note}>{service.resume}</span>}
      </label>
      {service && service.formules.length > 0 && (
        <label style={{ ...colonne, gridColumn: "1 / -1" }}>
          Formule
          <select name="formule" defaultValue="" style={champ}>
            <option value="">Selon mon chiffre d&rsquo;affaires</option>
            {service.formules
              .filter((f) => f.souscriptible_en_ligne)
              .map((f) => (
                <option key={f.code} value={f.code}>
                  {f.libelle}
                </option>
              ))}
          </select>
        </label>
      )}
      <label style={colonne}>
        Prénom
        <input name="prenom" required autoComplete="given-name" style={champ} />
      </label>
      <label style={colonne}>
        Nom
        <input name="nom" required autoComplete="family-name" style={champ} />
      </label>
      <label style={colonne}>
        Adresse électronique
        <input name="courriel" type="email" required autoComplete="email" style={champ} />
      </label>
      <label style={colonne}>
        Téléphone Mobile Money
        <input name="telephone" type="tel" required autoComplete="tel" placeholder="6XX XX XX XX" style={champ} />
      </label>
      {service?.ouvre_un_dossier && (
        <>
          <label style={colonne}>
            Dénomination de l&rsquo;entreprise
            <input name="denomination" autoComplete="organization" style={champ} />
          </label>
          <label style={colonne}>
            NIU
            <input name="niu" style={champ} />
          </label>
          <label style={colonne}>
            Chiffre d&rsquo;affaires annuel (FCFA)
            <input name="chiffre_affaires" inputMode="numeric" placeholder="28 000 000" style={champ} />
          </label>
          <p style={{ ...note, gridColumn: "1 / -1" }}>
            Votre paiement réserve votre adhésion. L&rsquo;accès au dossier de l&rsquo;entreprise s&rsquo;ouvre après
            vérification de votre identité par le cabinet, qui vous contactera : un NIU se lit sur chaque facture, et il ne
            suffit pas à prouver que vous représentez l&rsquo;entreprise.
          </p>
        </>
      )}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton bouton--principal" disabled={enCours}>
          {enCours ? "…" : "Établir mon devis"}
        </button>
        {etat.echec && (
          <span role="alert" style={{ color: "#94302a" }}>
            {etat.echec}
          </span>
        )}
      </div>
    </form>
  );
}

const ENGAGEMENT_INITIAL: EtatEngagement = { echec: null, message: null, souscription: null };

/**
 * S'engager sur un devis : le paiement mobile part (pas 83).
 *
 * ⚠️ Une case à cocher, parce que le geste déclenche un débit. Le backend ferme le devis
 * à l'engagement : un second clic ne produit pas un second débit, il est refusé.
 */
export function EngagementDevis({ reference, montant }: { reference: string; montant: string }) {
  const [etat, engager, enCours] = useActionState(sEngagerSurLeDevis, ENGAGEMENT_INITIAL);
  if (etat.message) {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{etat.message}</p>
        {etat.souscription && (
          <p style={{ margin: 0 }}>
            <Link href={`/souscrire/suivi/${etat.souscription}`}>Suivre ma souscription</Link> : gardez ce lien, il vous
            permet de revenir sans compte.
          </p>
        )}
      </div>
    );
  }
  return (
    <form action={engager} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
      <input type="hidden" name="reference" value={reference} />
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" name="accord" value="oui" required />
        <span>
          Je m&rsquo;engage sur ce devis et j&rsquo;accepte de régler {montant} par Mobile Money ; un message de
          confirmation arrivera sur mon téléphone.
        </span>
      </label>
      <div>
        <button type="submit" className="bouton bouton--principal" disabled={enCours}>
          {enCours ? "…" : "Payer et souscrire"}
        </button>
      </div>
      {etat.echec && (
        <p role="alert" style={{ color: "#94302a", margin: 0 }}>
          {etat.echec}
        </p>
      )}
    </form>
  );
}
