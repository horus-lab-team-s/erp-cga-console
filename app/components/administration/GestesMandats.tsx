"use client";

import { useActionState, useState } from "react";

import { LIBELLES_ROLE, type Role } from "@/app/lib/acces";
import { accorderUnMandat, revoquerUnMandat } from "@/app/lib/actions-administration";
import { EXPLICATIONS_MOTIF_MANDAT, LIBELLES_MOTIF_MANDAT } from "@/app/lib/mandats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { soumettreSansReinitialiser } from "@/app/lib/soumission";

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const etiquette: React.CSSProperties = { font: "600 12px/1.4 var(--police-texte)", color: "var(--ink-700)" };
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

/**
 * Accorder un mandat (pas 129).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE SEUL GESTE DE CET ÉCRAN QUI OUVRE SES DONNÉES À DES GENS QU'ON NE GÈRE PAS
 *
 * Inviter, suspendre, confier un dossier : tout le reste porte sur des comptes du
 * cabinet. Celui-ci autorise des comptes **d'un autre locataire** à travailler ici.
 * Il est donc replié par défaut, il nomme ce qu'il ouvre, et il rappelle les deux
 * choses qu'on croit à tort.
 *
 * ⚠️ **UN MANDAT N'ACCORDE AUCUN RÔLE**, il autorise l'exercice, ici, de rôles déjà
 * tenus ailleurs. Cocher « Comptable » ne rend personne comptable : cela laisse un
 * comptable du mandataire l'être aussi chez nous.
 *
 * ⚠️ **LE CHAMP DES COMPTES VIDE VEUT DIRE « TOUS »**, et non « aucun ». C'est la
 * règle du domaine, et c'est contre-intuitif : un champ vide se lit d'habitude comme
 * une restriction. La phrase sous le champ le dit, parce qu'un administrateur qui
 * croit restreindre alors qu'il ouvre est le pire des malentendus ici.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function AccorderUnMandat({ roles, aujourdhui }: { roles: Role[]; aujourdhui: string }) {
  const [etat, accorder, enCours] = useActionState(accorderUnMandat, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);

  if (!ouvert) {
    return (
      <div style={{ padding: "12px 16px" }}>
        {etat.fait && <p role="status" style={{ ...note, color: "var(--success)", marginBottom: 8 }}>{etat.fait}</p>}
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Accorder un mandat
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={soumettreSansReinitialiser(accorder)}
      style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}
    >
      <label style={etiquette}>
        Locataire mandaté
        <input name="mandataire" required placeholder="brcg" style={champ} />
        <span style={{ ...note, display: "block" }}>Son sous-domaine, sans le domaine.</span>
      </label>
      <label style={etiquette}>
        À quel titre
        <select name="motif" required defaultValue="" style={champ}>
          <option value="" disabled>
            Choisir
          </option>
          {(Object.keys(LIBELLES_MOTIF_MANDAT) as (keyof typeof LIBELLES_MOTIF_MANDAT)[]).map((m) => (
            <option key={m} value={m}>
              {LIBELLES_MOTIF_MANDAT[m]}
            </option>
          ))}
        </select>
        <span style={{ ...note, display: "block" }}>{EXPLICATIONS_MOTIF_MANDAT.ASSISTANCE}</span>
      </label>
      <label style={etiquette}>
        À compter du
        <input name="debut" type="date" required defaultValue={aujourdhui} style={champ} />
      </label>
      <label style={etiquette}>
        Jusqu&rsquo;au (exclu)
        <input name="fin" type="date" style={champ} />
        <span style={{ ...note, display: "block" }}>Vide : sans terme, jusqu&rsquo;au retrait.</span>
      </label>

      <fieldset
        style={{
          gridColumn: "1 / -1",
          border: "1px solid var(--line-100)",
          borderRadius: "var(--rayon-petit)",
          padding: "8px 10px",
        }}
      >
        <legend style={etiquette}>Rôles dont le mandat autorise l&rsquo;exercice</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 4, marginTop: 4 }}>
          {roles.map((r) => (
            <label key={r} style={note}>
              <input type="checkbox" name="roles" value={r} /> {LIBELLES_ROLE[r]}
            </label>
          ))}
        </div>
        <p style={{ ...note, marginTop: 8 }}>
          Un mandat n&rsquo;accorde aucun rôle : il laisse ceux qui les tiennent déjà chez eux
          les exercer ici.
        </p>
      </fieldset>

      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Comptes désignés
        <input name="comptes" placeholder="C-003 C-004" style={champ} />
        <span style={{ ...note, display: "block" }}>
          <b>Vide : tous les comptes du locataire mandaté.</b> Séparer par des espaces pour
          n&rsquo;en désigner que quelques-uns.
        </span>
      </label>

      <label style={{ ...etiquette, gridColumn: "1 / -1" }}>
        Précision
        <input name="precision" maxLength={500} style={champ} />
      </label>

      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Accorder le mandat"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Fermer
        </button>
        {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
        {etat.fait && <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>}
      </div>
    </form>
  );
}

/**
 * Retirer un mandat (pas 129).
 *
 * ⚠️ **Le motif est exigé et long**, comme pour la suspension d'un compte : retirer un
 * accès accordé à un tiers se relit deux ans plus tard, quand plus personne ne se
 * souvient de la raison. La phrase de confirmation dit la seule chose qui compte pour
 * celui qui hésite : le retrait prend effet tout de suite, pas au prochain matin.
 */
export function RevoquerUnMandat({ identifiant, mandataire }: { identifiant: string; mandataire: string }) {
  const [etat, revoquer, enCours] = useActionState(revoquerUnMandat, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);

  if (etat.fait) {
    return <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>{etat.fait}</span>;
  }
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" style={{ marginTop: 4 }} onClick={() => setOuvert(true)}>
        Retirer
      </button>
    );
  }
  return (
    <form action={revoquer} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, minWidth: 240 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea
        name="motif"
        required
        minLength={10}
        rows={2}
        placeholder="Fin du contrat de suivi au…, sur décision de…"
        style={{ ...champ, resize: "vertical" }}
      />
      <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>
          Les comptes de {mandataire} cesseront d&rsquo;agir ici <b>à la requête suivante</b>.
          Le mandat reste au journal : il est retiré, pas effacé.
        </span>
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Retirer le mandat"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}
