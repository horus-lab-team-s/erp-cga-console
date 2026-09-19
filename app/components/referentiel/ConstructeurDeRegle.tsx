"use client";

import { useActionState, useMemo, useState } from "react";

import { eprouverUneRegle, proposerUneRegle, trancherUneRegle, type EtatEssaiDeRegle } from "@/app/lib/actions-regles-du-cabinet";
import { LIBELLES_OPERATEUR } from "@/app/lib/libelles-du-constructeur";
import type { CatalogueDuConstructeur, ConditionDAnomalie } from "@/app/lib/regles-du-cabinet";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * E11 · Construire une règle de conformité sans syntaxe (pas 97).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'ORDRE DES GESTES EST IMPOSÉ, ET C'EST LE GARDE-FOU
 *
 *   1. décrire l'anomalie en conditions (« le mode de règlement est égal à ESPECES ») ;
 *   2. **éprouver** : la phrase relue, et les factures sur lesquelles la règle réagirait ;
 *   3. proposer, avec un motif ; une autre personne la validera.
 *
 * « Proposer » n'apparaît qu'après un essai, et disparaît dès qu'une condition change : on
 * ne propose pas une règle différente de celle qu'on a éprouvée. Le backend rejoue l'essai
 * à la proposition, et refuse une règle qui accuserait toutes les factures.
 *
 * L'écran ne compose aucun prédicat : il envoie les conditions en clair, et c'est le
 * backend qui pose la négation. Faits, opérateurs et paramètres viennent du catalogue.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };
const champ: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon-petit)",
  font: "400 13px/1.4 var(--police-texte)",
};
const large: React.CSSProperties = { ...champ, display: "block", width: "100%", boxSizing: "border-box" };

type Comparant = "valeur" | "parametre" | "autre_fait";

const CONDITION_VIDE: ConditionDAnomalie = { fait: "", operateur: "", valeur: null, parametre: null, autre_fait: null };
const SEVERITES = ["INFORMATION", "AVERTISSEMENT", "MAJEUR", "BLOQUANT"];
const TYPES = ["FACTURE_ACHAT", "FACTURE_VENTE", "AVOIR"];

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <span role="alert" style={{ ...note, color: "var(--danger)" }}>{etat.echec}</span>;
  if (etat.fait) return <span role="status" style={{ ...note, color: "var(--success)" }}>{etat.fait}</span>;
  return null;
}

export function ConstructeurDeRegle({ catalogue, premierJour }: { catalogue: CatalogueDuConstructeur; premierJour: string }) {
  const [conditions, setConditions] = useState<ConditionDAnomalie[]>([{ ...CONDITION_VIDE }]);
  const [combinaison, setCombinaison] = useState("TOUTES");
  const [entete, setEntete] = useState({
    libelle: "",
    severite: "AVERTISSEMENT",
    type: "FACTURE_ACHAT",
    reelSeulement: false,
    tva: false,
    charge: false,
    rectification: false,
    verification: true,
    fondementTexte: "",
    fondementSource: "",
    message: "",
    remediation: "",
    applicableDu: premierJour,
  });
  const [essaiDe, setEssaiDe] = useState<string | null>(null);
  const [essai, eprouver, enEssai] = useActionState(
    async (precedent: EtatEssaiDeRegle, donnees: FormData) => {
      const resultat = await eprouverUneRegle(precedent, donnees);
      if (resultat.essai) setEssaiDe(String(donnees.get("construction")));
      return resultat;
    },
    { echec: null, essai: null },
  );
  const [proposition, proposer, enProposition] = useActionState(proposerUneRegle, ETAT_ACTE_INITIAL);

  const construction = useMemo(
    () =>
      JSON.stringify({
        libelle: entete.libelle,
        severite: entete.severite,
        types_document: [entete.type],
        regimes_destinataire: entete.reelSeulement ? ["REEL"] : null,
        combinaison,
        conditions,
        tva_non_deductible: entete.tva,
        charge_non_deductible: entete.charge,
        rectification_requise: entete.rectification,
        verification_requise: entete.verification,
        fondement: { texte: entete.fondementTexte, source: entete.fondementSource },
        message: entete.message,
        remediation: entete.remediation,
        applicable_du: entete.applicableDu,
      }),
    [entete, combinaison, conditions],
  );
  // L'essai affiché ne vaut que pour la construction éprouvée : une modification l'invalide.
  const essaiAJour = essai.essai !== null && essaiDe === construction;

  const changer = (index: number, modif: Partial<ConditionDAnomalie>) =>
    setConditions((actuelles) => actuelles.map((c, i) => (i === index ? { ...c, ...modif } : c)));

  if (proposition.fait) return <Retour etat={proposition} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
      <p style={note}>{catalogue.limites}</p>

      <label style={note}>
        Intitulé de la règle
        <input value={entete.libelle} onChange={(e) => setEntete({ ...entete, libelle: e.target.value })} style={large} />
      </label>

      <fieldset style={{ border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", padding: "8px 12px" }}>
        <legend style={note}>
          Constat si{" "}
          <select value={combinaison} onChange={(e) => setCombinaison(e.target.value)} style={champ} aria-label="Combinaison des conditions">
            <option value="TOUTES">toutes les conditions</option>
            <option value="AU_MOINS_UNE">au moins une condition</option>
          </select>{" "}
          sont réunies
        </legend>
        {conditions.map((condition, index) => (
          <LigneDeCondition
            key={index}
            condition={condition}
            catalogue={catalogue}
            changer={(modif) => changer(index, modif)}
            retirer={conditions.length > 1 ? () => setConditions(conditions.filter((_, i) => i !== index)) : null}
          />
        ))}
        {conditions.length < 6 && (
          <button type="button" className="bouton-discret" onClick={() => setConditions([...conditions, { ...CONDITION_VIDE }])}>
            Ajouter une condition
          </button>
        )}
      </fieldset>

      <span style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={note}>
          Sévérité{" "}
          <select value={entete.severite} onChange={(e) => setEntete({ ...entete, severite: e.target.value })} style={champ}>
            {SEVERITES.map((s) => (
              <option key={s} value={s}>{s.toLowerCase()}</option>
            ))}
          </select>
        </label>
        <label style={note}>
          Documents{" "}
          <select value={entete.type} onChange={(e) => setEntete({ ...entete, type: e.target.value })} style={champ}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ").toLowerCase()}</option>
            ))}
          </select>
        </label>
        <label style={note}>
          <input type="checkbox" checked={entete.reelSeulement} onChange={(e) => setEntete({ ...entete, reelSeulement: e.target.checked })} /> adhérents au réel seulement
        </label>
        <label style={note}>
          À compter du <input type="date" min={premierJour} value={entete.applicableDu} onChange={(e) => setEntete({ ...entete, applicableDu: e.target.value })} style={champ} />
        </label>
      </span>

      <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {(
          [
            ["tva", "TVA non déductible"],
            ["charge", "charge non déductible"],
            ["rectification", "rectificative requise"],
            ["verification", "vérification requise"],
          ] as const
        ).map(([cle, libelle]) => (
          <label key={cle} style={note}>
            <input type="checkbox" checked={entete[cle]} onChange={(e) => setEntete({ ...entete, [cle]: e.target.checked })} /> {libelle}
          </label>
        ))}
      </span>

      <label style={note}>
        Texte qui fonde la règle
        <input value={entete.fondementTexte} onChange={(e) => setEntete({ ...entete, fondementTexte: e.target.value })} style={large} />
      </label>
      <label style={note}>
        Source consultée
        <input value={entete.fondementSource} onChange={(e) => setEntete({ ...entete, fondementSource: e.target.value })} style={large} />
      </label>
      <label style={note}>
        Message du constat
        <textarea rows={2} value={entete.message} onChange={(e) => setEntete({ ...entete, message: e.target.value })} style={large} />
      </label>
      <label style={note}>
        Ce qu&rsquo;il faut faire
        <textarea rows={2} value={entete.remediation} onChange={(e) => setEntete({ ...entete, remediation: e.target.value })} style={large} />
      </label>

      <form action={eprouver} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="construction" value={construction} />
        <button type="submit" className="action-secondaire" disabled={enEssai}>
          {enEssai ? "…" : "Éprouver sur les factures"}
        </button>
        {essai.echec && <span role="alert" style={{ ...note, color: "var(--danger)" }}>{essai.echec}</span>}
      </form>

      {essai.essai && (
        <div role="status" style={{ padding: "8px 12px", border: `1px solid ${essai.essai.reagit_partout ? "var(--danger)" : "var(--line-200)"}`, borderRadius: "var(--rayon)" }}>
          <p style={{ margin: 0, font: "500 13px/1.5 var(--police-texte)" }}>{essai.essai.phrase}</p>
          <p style={note}>
            Réagit sur {essai.essai.reagit_sur.length} des {essai.essai.eprouvees} factures éprouvées
            {essai.essai.reagit_sur.length > 0 ? ` : ${essai.essai.reagit_sur.join(", ")}` : ""}.
          </p>
          {essai.essai.reagit_partout && (
            <p style={{ ...note, color: "var(--danger)" }}>△ Elle réagit sur toutes : condition inversée ou seuil mal choisi. Elle ne pourra pas être proposée.</p>
          )}
          {!essaiAJour && <p style={note}>La règle a changé depuis cet essai : éprouvez-la de nouveau avant de la proposer.</p>}
        </div>
      )}

      {essaiAJour && !essai.essai?.reagit_partout && catalogue.peut_proposer && (
        <form action={proposer} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input type="hidden" name="construction" value={construction} />
          <label style={note}>
            Motif de la proposition (au moins {catalogue.motif_minimum} caractères)
            <textarea name="motif" required minLength={catalogue.motif_minimum} rows={2} style={large} />
          </label>
          <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="action-principale" disabled={enProposition}>
              {enProposition ? "…" : "Proposer cette règle"}
            </button>
            <Retour etat={proposition} />
          </span>
          <p style={note}>Sans effet tant qu&rsquo;une autre personne désignée par le circuit ne l&rsquo;a pas validée.</p>
        </form>
      )}
    </div>
  );
}

function LigneDeCondition({
  condition,
  catalogue,
  changer,
  retirer,
}: {
  condition: ConditionDAnomalie;
  catalogue: CatalogueDuConstructeur;
  changer: (modif: Partial<ConditionDAnomalie>) => void;
  retirer: (() => void) | null;
}) {
  const fait = catalogue.faits.find((f) => f.code === condition.fait);
  const sansComparant = condition.operateur === "EST_VIDE" || condition.operateur === "N_EST_PAS_VIDE";
  const motif = condition.operateur.includes("MOTIF");
  const comparant: Comparant = condition.parametre !== null ? "parametre" : condition.autre_fait !== null ? "autre_fait" : "valeur";
  // Un motif ne s'écrit jamais : il se prend au référentiel. Un nombre peut aussi venir d'un paramètre.
  const parametres = catalogue.parametres.filter((p) => (motif ? p.unite === "REGEX" : p.unite !== "REGEX"));
  const autres = catalogue.faits.filter((f) => fait && f.code !== fait.code && f.type === fait.type && f.unite === fait.unite);

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "6px 0" }}>
      <select
        aria-label="Fait de la facture"
        value={condition.fait}
        onChange={(e) => changer({ ...CONDITION_VIDE, fait: e.target.value })}
        style={champ}
      >
        <option value="">Choisir…</option>
        {catalogue.faits.map((f) => (
          <option key={f.code} value={f.code}>{f.libelle}</option>
        ))}
      </select>
      {fait && (
        <select
          aria-label="Opérateur"
          value={condition.operateur}
          onChange={(e) => changer({ operateur: e.target.value, valeur: null, parametre: e.target.value.includes("MOTIF") ? "" : null, autre_fait: null })}
          style={champ}
        >
          <option value="">…</option>
          {fait.operateurs.map((o) => (
            <option key={o} value={o}>{LIBELLES_OPERATEUR[o] ?? o}</option>
          ))}
        </select>
      )}
      {fait && condition.operateur && !sansComparant && (
        <>
          {!motif && (
            <select
              aria-label="Nature du comparant"
              value={comparant}
              onChange={(e) =>
                changer({
                  valeur: e.target.value === "valeur" ? "" : null,
                  parametre: e.target.value === "parametre" ? "" : null,
                  autre_fait: e.target.value === "autre_fait" ? "" : null,
                })
              }
              style={champ}
            >
              <option value="valeur">une valeur</option>
              {parametres.length > 0 && <option value="parametre">un paramètre</option>}
              {autres.length > 0 && <option value="autre_fait">un autre fait</option>}
            </select>
          )}
          {(motif || comparant === "parametre") && (
            <select aria-label="Paramètre du référentiel" value={condition.parametre ?? ""} onChange={(e) => changer({ parametre: e.target.value })} style={champ}>
              <option value="">Choisir…</option>
              {parametres.map((p) => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </select>
          )}
          {!motif && comparant === "autre_fait" && (
            <select aria-label="Autre fait" value={condition.autre_fait ?? ""} onChange={(e) => changer({ autre_fait: e.target.value })} style={champ}>
              <option value="">Choisir…</option>
              {autres.map((f) => (
                <option key={f.code} value={f.code}>{f.libelle}</option>
              ))}
            </select>
          )}
          {!motif && comparant === "valeur" &&
            (fait.valeurs ? (
              <select aria-label="Valeur" value={condition.valeur ?? ""} onChange={(e) => changer({ valeur: e.target.value })} style={champ}>
                <option value="">Choisir…</option>
                {fait.valeurs.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input aria-label="Valeur" value={condition.valeur ?? ""} onChange={(e) => changer({ valeur: e.target.value })} style={{ ...champ, width: 140 }} />
            ))}
        </>
      )}
      {retirer && (
        <button type="button" className="bouton-discret" onClick={retirer}>
          Retirer
        </button>
      )}
    </div>
  );
}

export function TrancherLaRegle({ identifiant, motifMinimum }: { identifiant: string; motifMinimum: number }) {
  const [etat, envoyer, enCours] = useActionState(trancherUneRegle, ETAT_ACTE_INITIAL);
  if (etat.fait) return <Retour etat={etat} />;
  return (
    <form action={envoyer} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 520 }}>
      <input type="hidden" name="identifiant" value={identifiant} />
      <textarea name="motif" required minLength={motifMinimum} rows={2} aria-label="Motif de la décision sur la règle" placeholder="Essai relu : la règle réagit sur les bonnes factures…" style={large} />
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" name="decision" value="CONFIRMER" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Valider : la règle contrôle le cabinet"}
        </button>
        <button type="submit" name="decision" value="REFUSER" className="action-secondaire" disabled={enCours}>
          Refuser
        </button>
        <Retour etat={etat} />
      </span>
    </form>
  );
}
