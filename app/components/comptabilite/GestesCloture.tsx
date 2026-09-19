"use client";

import { useActionState, useState, useSyncExternalStore } from "react";

import { transmettreUnMois } from "@/app/lib/actions-revue";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * La transmission depuis l'écran de clôture (pas 107).
 *
 * ⚠️ Composant client : ni `cloture-mensuelle.ts` ni `api.ts` ici, seulement des valeurs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * « JAMAIS DE REFUS MUET » (maquette, vue G, note 1)
 *
 * Le bouton est désactivé tant qu'un point bloquant subsiste, et il **dit combien** :
 * « Transmettre au réviseur · 2 points restants ». Le backend refuse de toute façon ; le
 * bouton évite seulement d'essayer pour rien.
 *
 * « Enregistrer et continuer plus tard » : les points se recalculent sur les faits à chaque
 * visite, il n'y a donc rien à enregistrer au serveur. Seul le commentaire au réviseur est une
 * saisie ; il est gardé en brouillon **dans ce navigateur**, par dossier et par mois, l'écran
 * le dit, et le propose au retour. Si le stockage du navigateur est indisponible, rien ne se perd d'autre que
 * ce brouillon.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.45 var(--police-texte)",
  minHeight: 72,
  resize: "vertical",
};

/** Le stockage du navigateur ne prévient pas d'un changement fait ailleurs : rien à écouter. */
const sansAbonnement = () => () => {};

function lireLeBrouillon(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle) || null;
  } catch {
    // Stockage indisponible (navigation privée, données bloquées) : pas de brouillon.
    return null;
  }
}

function cleDuBrouillon(dossier: string, mois: string) {
  return `cga.cloture.commentaire.${dossier}.${mois}`;
}

export function TransmettreDepuisLaCloture({
  dossier,
  mois,
  bloquants,
  moisTermine,
  dejaTransmis,
}: {
  dossier: string;
  mois: string;
  bloquants: number;
  moisTermine: boolean;
  dejaTransmis: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(transmettreUnMois, ETAT_ACTE_INITIAL);
  const [message, setMessage] = useState("");
  const [garde, setGarde] = useState<string | null>(null);
  const cle = cleDuBrouillon(dossier, mois);

  // ⚠️ Lu par `useSyncExternalStore`, pas recopié dans l'état au montage : le serveur ne connaît
  // pas le stockage du navigateur, et un champ prérempli seulement côté client ferait différer
  // les deux rendus. Le brouillon est **proposé**, le comptable le reprend d'un clic.
  const brouillonGarde = useSyncExternalStore(
    sansAbonnement,
    () => lireLeBrouillon(cle),
    () => null,
  );

  function enregistrer() {
    try {
      window.localStorage.setItem(cle, message);
      setGarde("Commentaire gardé dans ce navigateur. Les points se recalculeront à votre retour.");
    } catch {
      setGarde("Ce navigateur ne permet pas de garder le brouillon : copiez le commentaire avant de partir.");
    }
  }

  function oublierLeBrouillon() {
    try {
      window.localStorage.removeItem(cle);
    } catch {
      // Rien à oublier.
    }
  }

  const empechement = dejaTransmis
    ? "Ce mois a déjà été transmis."
    : !moisTermine
      ? "Le mois n'est pas fini : le transmettre le verrouillerait avant ses dernières opérations."
      : bloquants > 0
        ? `${bloquants} point${bloquants > 1 ? "s" : ""} bloquant${bloquants > 1 ? "s" : ""} à traiter d'abord.`
        : null;

  return (
    <form action={envoyer} onSubmit={oublierLeBrouillon} style={{ display: "grid", gap: 10, padding: "12px 16px" }}>
      <input type="hidden" name="dossier" value={dossier} />
      <input type="hidden" name="mois" value={mois} />
      <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
        Commentaire pour le réviseur
        <textarea
          name="message"
          maxLength={500}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setGarde(null);
          }}
          placeholder="Ce qu'il faut savoir de ce mois"
          style={champ}
        />
      </label>
      {brouillonGarde && message === "" && (
        <p style={note}>
          Un commentaire est gardé dans ce navigateur pour ce mois.{" "}
          <button type="button" className="lien-bouton" onClick={() => setMessage(brouillonGarde)} style={{ font: "inherit", color: "var(--brand-indigo-700)", background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer" }}>
            Le reprendre
          </button>
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button type="button" className="action-secondaire" onClick={enregistrer} disabled={dejaTransmis}>
          Enregistrer et continuer plus tard
        </button>
        <button type="submit" className="action-principale" disabled={enCours || empechement !== null}>
          {enCours
            ? "…"
            : bloquants > 0
              ? `Transmettre au réviseur · ${bloquants} point${bloquants > 1 ? "s" : ""} restant${bloquants > 1 ? "s" : ""}`
              : "Transmettre au réviseur"}
        </button>
      </div>
      {empechement && <p style={note}>{empechement}</p>}
      {garde && (
        <p role="status" style={{ ...note, color: "var(--success)" }}>
          {garde}
        </p>
      )}
      {etat.echec && (
        <p role="alert" style={{ ...note, color: "var(--danger)" }}>
          {etat.echec}
        </p>
      )}
    </form>
  );
}
