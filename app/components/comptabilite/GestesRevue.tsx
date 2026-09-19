"use client";

import { useActionState, useState } from "react";

import {
  cloreLaRemarque,
  poserUneRemarque,
  renvoyerLeMois,
  repondreALaRemarque,
  retransmettreLeMois,
  validerLeMois,
} from "@/app/lib/actions-revue";
import { LIBELLES_NATURE_OBJET } from "@/app/lib/libelles-revue";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les gestes de la revue d'un mois transmis (pas 102).
 *
 * ⚠️ Composant client : ni `revue.ts` ni `api.ts` ici. Les champs saisis sont contrôlés, pour
 * qu'un refus ne vide pas ce qui vient d'être écrit (leçon du pas 100).
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};

function Retour({ echec, fait }: { echec: string | null; fait: string | null }) {
  if (echec) return <p role="alert" style={{ ...note, color: "var(--danger)" }}>{echec}</p>;
  if (fait) return <p role="status" style={{ ...note, color: "var(--success)" }}>{fait}</p>;
  return null;
}

type Ids = { dossier: string; identifiant: string };

function Caches({ ids, rang }: { ids: Ids; rang?: number }) {
  return (
    <>
      <input type="hidden" name="dossier" value={ids.dossier} />
      <input type="hidden" name="identifiant" value={ids.identifiant} />
      {rang !== undefined && <input type="hidden" name="rang" value={rang} />}
    </>
  );
}

/**
 * Poser une remarque. L'objet est choisi dans les listes du mois, jamais saisi librement :
 * une remarque sur un objet qui n'existe pas ne se retrouverait pas.
 */
export function PoserUneRemarque({
  ids,
  objets,
  initial,
}: {
  ids: Ids;
  objets: Record<"ECRITURE" | "PIECE" | "COMPTE", string[]>;
  initial?: { nature: "ECRITURE" | "PIECE" | "COMPTE"; reference: string };
}) {
  const [etat, envoyer, enCours] = useActionState(poserUneRemarque, ETAT_ACTE_INITIAL);
  const [nature, setNature] = useState<"ECRITURE" | "PIECE" | "COMPTE">(initial?.nature ?? "ECRITURE");
  const [reference, setReference] = useState(initial?.reference ?? objets.ECRITURE[0] ?? "");
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        {initial ? "Remarquer" : "Nouvelle remarque"}
      </button>
    );
  }
  return (
    <form action={envoyer} style={{ display: "grid", gap: 8, width: "100%" }}>
      <Caches ids={ids} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          name="nature"
          aria-label="Nature de l'objet"
          value={nature}
          onChange={(e) => {
            const n = e.target.value as "ECRITURE" | "PIECE" | "COMPTE";
            setNature(n);
            setReference(objets[n][0] ?? "");
          }}
          style={champ}
        >
          {(["ECRITURE", "PIECE", "COMPTE"] as const).map((n) => (
            <option key={n} value={n} disabled={objets[n].length === 0}>
              {LIBELLES_NATURE_OBJET[n]}
            </option>
          ))}
        </select>
        <select name="reference" aria-label="Objet de la remarque" value={reference} onChange={(e) => setReference(e.target.value)} style={{ ...champ, flex: 1, minWidth: 160 }}>
          {objets[nature].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="texte"
        required
        minLength={10}
        rows={2}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Ce qui ne va pas, précisément"
        aria-label="Texte de la remarque"
        style={{ ...champ, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Poser la remarque"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
      <Retour {...etat} />
    </form>
  );
}

export function RepondreALaRemarque({ ids, rang }: { ids: Ids; rang: number }) {
  const [etat, envoyer, enCours] = useActionState(repondreALaRemarque, ETAT_ACTE_INITIAL);
  const [reponse, setReponse] = useState("");
  return (
    <form action={envoyer} style={{ display: "grid", gap: 6, marginTop: 6 }}>
      <Caches ids={ids} rang={rang} />
      <textarea
        name="reponse"
        required
        minLength={10}
        rows={2}
        value={reponse}
        onChange={(e) => setReponse(e.target.value)}
        placeholder="Corrigé (comment) ou expliqué (pourquoi c'est juste)"
        aria-label={`Réponse à la remarque ${rang}`}
        style={{ ...champ, resize: "vertical" }}
      />
      <div>
        <button type="submit" className="action-secondaire" disabled={enCours}>
          {enCours ? "…" : "Répondre"}
        </button>
      </div>
      <Retour {...etat} />
    </form>
  );
}

function Bouton({
  action,
  ids,
  rang,
  libelle,
  principal,
  avecMessage,
}: {
  action: (p: { echec: string | null; fait: string | null }, d: FormData) => Promise<{ echec: string | null; fait: string | null }>;
  ids: Ids;
  rang?: number;
  libelle: string;
  principal?: boolean;
  avecMessage?: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, ETAT_ACTE_INITIAL);
  const [message, setMessage] = useState("");
  return (
    <form action={envoyer} style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <Caches ids={ids} rang={rang} />
      {avecMessage && (
        <input name="message" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={avecMessage} aria-label={avecMessage} style={{ ...champ, minWidth: 260 }} />
      )}
      <button type="submit" className={principal ? "action-principale" : rang !== undefined ? "bouton-discret" : "action-secondaire"} disabled={enCours}>
        {enCours ? "…" : libelle}
      </button>
      <Retour {...etat} />
    </form>
  );
}

export function CloreLaRemarque({ ids, rang }: { ids: Ids; rang: number }) {
  return <Bouton action={cloreLaRemarque} ids={ids} rang={rang} libelle="Clore" />;
}

export function RenvoyerLeMois({ ids, ouvertes }: { ids: Ids; ouvertes: number }) {
  return <Bouton action={renvoyerLeMois} ids={ids} libelle={`Renvoyer au comptable (${ouvertes} remarque${ouvertes > 1 ? "s" : ""})`} avecMessage="Un mot au comptable (facultatif)" />;
}

export function RetransmettreLeMois({ ids }: { ids: Ids }) {
  return <Bouton action={retransmettreLeMois} ids={ids} libelle="Retransmettre au réviseur" principal avecMessage="Un mot au réviseur (facultatif)" />;
}

export function ValiderLeMois({ ids }: { ids: Ids }) {
  return <Bouton action={validerLeMois} ids={ids} libelle="Valider le mois" principal />;
}
