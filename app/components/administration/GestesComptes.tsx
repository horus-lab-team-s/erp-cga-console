"use client";

import { useActionState, useState } from "react";

import { LIBELLES_ROLE, type Role } from "@/app/lib/acces";
import { inviterUnCollaborateur, retablirUnCompte, suspendreUnCompte } from "@/app/lib/actions-administration";
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
 * Inviter un collaborateur (pas 69).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE LIEN NE REVIENT PAS À L'ÉCRAN
 *
 * Il part au collaborateur, et à lui seul : un administrateur qui le recevait pouvait
 * activer lui-même le compte qu'il créait.
 *
 * ⚠️ LA PORTÉE SE CHOISIT DANS LE PORTEFEUILLE QUAND ON LE LIT
 *
 * L'administrateur ne détient pas `LIRE_DOSSIER` : il ne voit pas la liste des
 * dossiers, et saisit les NIU. Un rôle qui le détient coche des cases.
 *
 * ⚠️ UNE LISTE VIDE EST ADMISE, ET ELLE NE DONNE RIEN
 *
 * Seuls l'adhérent et l'inspecteur exigent une portée (habilitations.py), et ils ne
 * s'invitent pas ici. Un comptable invité sans dossier est un cas réel (une prise de
 * poste avant la répartition du portefeuille) : il ne voit aucun dossier tant qu'on
 * ne lui en affecte pas. « Tout le cabinet » est l'autre extrême, et il se coche
 * explicitement : le formulaire part sur « des dossiers » par défaut.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function InvitationCollaborateur({
  roles,
  dossiers,
  aujourdhui,
}: {
  roles: Role[];
  dossiers: { niu: string; denomination: string }[] | null;
  aujourdhui: string;
}) {
  const [etat, inviter, enCours] = useActionState(inviterUnCollaborateur, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<"tout" | "liste">("liste");

  if (!ouvert) {
    return (
      <div style={{ padding: "12px 16px" }}>
        {etat.fait && <p role="status" style={{ ...note, color: "var(--success)", marginBottom: 8 }}>{etat.fait}</p>}
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          Inviter un collaborateur
        </button>
      </div>
    );
  }
  return (
    // ⚠️ Pas 108 : soumis sans réinitialisation, pour que le choix « Des dossiers / Tout le
    // cabinet » affiché reste celui qui part après un refus. Voir `lib/soumission.ts`.
    <form
      onSubmit={soumettreSansReinitialiser(inviter)}
      style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}
    >
      <label style={etiquette}>
        Adresse
        <input name="courriel" type="email" required style={champ} />
      </label>
      <label style={etiquette}>
        Prénom
        <input name="prenom" required style={champ} />
      </label>
      <label style={etiquette}>
        Nom
        <input name="nom" required style={champ} />
      </label>
      <label style={etiquette}>
        Téléphone
        <input name="telephone" style={champ} />
      </label>
      <label style={etiquette}>
        Rôle
        <select name="role" required defaultValue="" style={champ}>
          <option value="" disabled>
            Choisir
          </option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {LIBELLES_ROLE[r]}
            </option>
          ))}
        </select>
      </label>
      <label style={etiquette}>
        Habilité à compter du
        <input name="depuis" type="date" required defaultValue={aujourdhui} style={champ} />
      </label>
      <fieldset style={{ gridColumn: "1 / -1", border: "1px solid var(--line-100)", borderRadius: "var(--rayon-petit)", padding: "8px 10px" }}>
        <legend style={etiquette}>Périmètre</legend>
        <label style={{ ...note, marginRight: 16 }}>
          <input type="radio" name="portee_mode" value="liste" checked={mode === "liste"} onChange={() => setMode("liste")} /> Des dossiers
        </label>
        <label style={note}>
          <input type="radio" name="portee_mode" value="tout" checked={mode === "tout"} onChange={() => setMode("tout")} /> Tout le cabinet
        </label>
        {mode === "liste" &&
          (dossiers ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 4, marginTop: 8 }}>
              {dossiers.map((d) => (
                <label key={d.niu} style={note}>
                  <input type="checkbox" name="portee" value={d.niu} /> {d.denomination}
                </label>
              ))}
            </div>
          ) : (
            <label style={{ ...etiquette, display: "block", marginTop: 8 }}>
              NIU des dossiers, un par ligne (votre rôle ne lit pas le portefeuille)
              <textarea name="portee_niu" rows={3} style={{ ...champ, resize: "vertical" }} />
            </label>
          ))}
      </fieldset>
      {mode === "liste" && (
        <p style={{ ...note, gridColumn: "1 / -1" }}>
          Sans dossier désigné, le collaborateur n&rsquo;en voit aucun tant qu&rsquo;un dossier ne lui est pas affecté.
        </p>
      )}
      <p style={{ ...note, gridColumn: "1 / -1" }}>
        Le lien d&rsquo;activation part à l&rsquo;adresse du collaborateur ; il ne s&rsquo;affiche pas ici.
      </p>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Envoyer l’invitation"}
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

/** Suspendre un compte : replié, avec motif et confirmation. Jamais le sien. */
export function SuspendreCompte({ identifiant, nom }: { identifiant: string; nom: string }) {
  const [etat, suspendre, enCours] = useActionState(suspendreUnCompte, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" style={{ marginTop: 4 }} onClick={() => setOuvert(true)}>
        Suspendre
      </button>
    );
  }
  return (
    <form action={suspendre} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, minWidth: 220 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea name="motif" required minLength={10} rows={2} placeholder="Départ constaté le…, sur décision de…" style={{ ...champ, resize: "vertical" }} />
      <label style={{ ...note, display: "flex", gap: 6, alignItems: "flex-start" }}>
        <input type="checkbox" name="confirmation" value="oui" required />
        <span>Les sessions ouvertes de {nom} seront fermées. Le compte n&rsquo;est pas supprimé.</span>
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Suspendre le compte"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}

/** Lever la suspension d'un compte (pas 91) : replié, avec un motif qui part au journal. */
export function RetablirCompte({ identifiant }: { identifiant: string }) {
  const [etat, retablir, enCours] = useActionState(retablirUnCompte, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (etat.fait) return <span role="status" style={{ ...note, display: "block", color: "var(--success)" }}>{etat.fait}</span>;
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" style={{ marginTop: 4 }} onClick={() => setOuvert(true)}>
        Rétablir
      </button>
    );
  }
  return (
    <form action={retablir} style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, minWidth: 220 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea name="motif" required minLength={10} rows={2} placeholder="Suspension levée parce que…" style={{ ...champ, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : "Lever la suspension"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      {etat.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>}
    </form>
  );
}
