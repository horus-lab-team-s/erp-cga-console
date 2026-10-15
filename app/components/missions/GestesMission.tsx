"use client";

import { useActionState, useState } from "react";

import {
  ajouterUnPoint,
  analyserLeContrat,
  deciderDUnPoint,
  ecrireLeCahier,
  redigerLeContrat,
  ouvrirUneMission,
  renvoyerLaMission,
  soumettreLaMission,
  validerLaMission,
} from "@/app/lib/actions-missions";
import {
  LIBELLES_DECISION,
  LIBELLES_GRAVITE,
  LIBELLES_TYPE,
  libelleDeRubrique,
  rubriquesDuType,
  type Proposition,
  type TypeMission,
} from "@/app/lib/missions-etats";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";
import { useRouter } from "@/i18n/navigation";

function Message({ etat }: { etat: EtatActe }) {
  if (etat.echec) return <p role="alert" className="mission__message" data-ton="echec">{etat.echec}</p>;
  if (etat.fait) return <p role="status" className="mission__message" data-ton="fait">{etat.fait}</p>;
  return null;
}

/** Ouvrir une mission et y verser le document, d'un seul geste. */
export function OuvrirUneMission() {
  const routeur = useRouter();
  const [type, setType] = useState("ANALYSE_CONTRAT");
  const [etat, ouvrir, enCours] = useActionState(async (p: EtatActe, d: FormData) => {
    const r = await ouvrirUneMission(p, d);
    if (r.fait) routeur.push(`/missions/${encodeURIComponent(r.fait)}`);
    return r;
  }, ETAT_ACTE_INITIAL);
  return (
    <form action={ouvrir} className="mission__ouverture">
      <label>
        Prestation
        <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {(Object.keys(LIBELLES_TYPE) as (keyof typeof LIBELLES_TYPE)[]).map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TYPE[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="mission__large">
        Objet
        <input name="objet" required maxLength={500} placeholder="Ex. : bail commercial du dépôt de Bonabéri" />
      </label>
      <label>
        Client
        <input name="client" maxLength={255} placeholder="Repris du dossier commercial s'il est cité" />
      </label>
      <label>
        Courriel du client
        <input name="client_courriel" type="email" />
      </label>
      <label>
        Dossier commercial payé (facultatif)
        <input name="reference_commerciale" placeholder="DC-2026-…" />
      </label>
      {type === "DSF_CIBLEE" && (
        <>
          <label>
            NIU du dossier
            <input name="dossier_niu" required placeholder="P0…" />
          </label>
          <label>
            Exercice
            <input name="exercice" required inputMode="numeric" placeholder="2025" />
          </label>
        </>
      )}
      <label className="mission__large">
        {type === "REDACTION_CONTRAT" ? "Modèle ou ancien contrat (facultatif)" : "Document (PDF ou photo)"}
        <input name="fichier" type="file" accept="application/pdf,image/jpeg,image/png" />
      </label>
      <div className="mission__large">
        <button type="submit" className="action-principale" disabled={enCours}>
          {enCours ? "…" : "Ouvrir la mission"}
        </button>
      </div>
      <Message etat={etat} />
    </form>
  );
}

/** Demander la lecture de l'agent. */
export function LireAvecLAgent({ mission, disponible }: { mission: string; disponible: boolean }) {
  const [etat, lire, enCours] = useActionState(analyserLeContrat, ETAT_ACTE_INITIAL);
  return (
    <form action={lire} className="mission__agent">
      <input type="hidden" name="mission" value={mission} />
      <p className="mission__note">
        {disponible
          ? "L'agent lit le contrat et propose des points : obligations, clauses à surveiller, manques, recommandations. Chacun attend votre décision ; rien ne part au client sans elle."
          : "Lecture par l'agent non configurée (clé d'API du cabinet absente) : ajoutez les points à la main, dans la même structure."}
      </p>
      <button type="submit" className="action-principale" disabled={!disponible || enCours}>
        {enCours ? "L'agent lit le contrat…" : "Lire avec l'agent"}
      </button>
      <Message etat={etat} />
    </form>
  );
}

/** Le cahier de rédaction, puis la rédaction par l'agent. */
export function CahierDeRedaction({
  mission,
  typeDeContrat,
  cahier,
  disponible,
  modifiable,
}: {
  mission: string;
  typeDeContrat: string | null;
  cahier: string | null;
  disponible: boolean;
  modifiable: boolean;
}) {
  const [etat, ecrire, enCours] = useActionState(ecrireLeCahier, ETAT_ACTE_INITIAL);
  const [etatR, rediger, enR] = useActionState(redigerLeContrat, ETAT_ACTE_INITIAL);
  return (
    <div className="mission__cahier">
      <form action={ecrire} className="mission__ajout">
        <input type="hidden" name="mission" value={mission} />
        <label className="mission__large">
          Type de contrat
          <input name="type_de_contrat" required minLength={3} defaultValue={typeDeContrat ?? ""} disabled={!modifiable} placeholder="Ex. : contrat de prestation de services" />
        </label>
        <label className="mission__large">
          Cahier de rédaction
          <textarea
            name="cahier"
            required
            minLength={20}
            rows={6}
            defaultValue={cahier ?? ""}
            disabled={!modifiable}
            placeholder="Les parties, l'objet, le prix et ses modalités, la durée, ce qui compte pour le client…"
          />
        </label>
        {modifiable && (
          <div className="mission__large mission__boutons">
            <button type="submit" className="bouton-discret" disabled={enCours}>
              Enregistrer le cahier
            </button>
          </div>
        )}
        <Message etat={etat} />
      </form>
      {modifiable && cahier && (
        <form action={rediger} className="mission__agent">
          <input type="hidden" name="mission" value={mission} />
          <p className="mission__note">
            {disponible
              ? "L'agent rédige un projet d'articles d'après le cahier. Chaque article attend votre décision ; rien ne part au client sans elle."
              : "Rédaction par l'agent non configurée (clé d'API du cabinet absente) : ajoutez les articles à la main."}
          </p>
          <button type="submit" className="action-principale" disabled={!disponible || enR}>
            {enR ? "L'agent rédige…" : "Rédiger avec l'agent"}
          </button>
          <Message etat={etatR} />
        </form>
      )}
    </div>
  );
}

/** Un point : ce que l'agent (ou le juriste) propose, et la décision. */
export function PointAInstruire({
  mission,
  type,
  point,
  modifiable,
}: {
  mission: string;
  type: TypeMission;
  point: Proposition;
  modifiable: boolean;
}) {
  const [etat, decider, enCours] = useActionState(deciderDUnPoint, ETAT_ACTE_INITIAL);
  const [geste, setGeste] = useState<"aucun" | "reformuler" | "ecarter">("aucun");
  return (
    <li className="mission__point" data-decision={point.decision} data-rubrique={point.rubrique}>
      <div className="mission__point-entete">
        <span className="mission__rubrique">{libelleDeRubrique(point.rubrique, type)}</span>
        {point.gravite && <span className="mission__gravite" data-gravite={point.gravite}>{LIBELLES_GRAVITE[point.gravite]}</span>}
        <span className="mission__origine">{point.origine === "AGENT" ? "proposé par l'agent" : "ajouté à la main"}</span>
        <span className="mission__decision">{LIBELLES_DECISION[point.decision]}</span>
      </div>
      <strong className="mission__titre">{point.titre}</strong>
      <p className="mission__texte">{point.decision === "MODIFIEE" ? point.texte_retenu : point.texte}</p>
      {point.decision === "MODIFIEE" && <p className="mission__note">Proposition d&rsquo;origine : {point.texte}</p>}
      {point.citation && <blockquote className="mission__citation">« {point.citation} »</blockquote>}
      {point.decision === "ECARTEE" && point.motif_ecart && <p className="mission__note">Écarté : {point.motif_ecart}</p>}
      {modifiable && (
        <form action={decider} className="mission__gestes">
          <input type="hidden" name="mission" value={mission} />
          <input type="hidden" name="rang" value={point.rang} />
          {geste === "reformuler" && (
            <textarea name="texte_retenu" required defaultValue={point.texte_retenu ?? point.texte} rows={3} aria-label="Texte retenu" />
          )}
          {geste === "ecarter" && <input name="motif" required placeholder="Pourquoi l'écarter" aria-label="Motif" />}
          <div className="mission__boutons">
            {geste === "aucun" ? (
              <>
                <button type="submit" name="decision" value="RETENUE" className="bouton-discret" disabled={enCours}>
                  Retenir
                </button>
                <button type="button" className="bouton-discret" onClick={() => setGeste("reformuler")}>
                  Reformuler
                </button>
                <button type="button" className="bouton-discret" onClick={() => setGeste("ecarter")}>
                  Écarter
                </button>
              </>
            ) : (
              <>
                <button type="submit" name="decision" value={geste === "reformuler" ? "MODIFIEE" : "ECARTEE"} className="bouton-discret" disabled={enCours}>
                  {geste === "reformuler" ? "Retenir ainsi" : "Écarter"}
                </button>
                <button type="button" className="bouton-discret" onClick={() => setGeste("aucun")}>
                  Annuler
                </button>
              </>
            )}
          </div>
          <Message etat={etat} />
        </form>
      )}
    </li>
  );
}

export function AjouterUnPoint({ mission, type }: { mission: string; type: TypeMission }) {
  const redaction = type === "REDACTION_CONTRAT";
  const [etat, ajouter, enCours] = useActionState(ajouterUnPoint, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert) {
    return (
      <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
        {redaction ? "+ Ajouter un article à la main" : "+ Ajouter un point à la main"}
      </button>
    );
  }
  return (
    <form action={ajouter} className="mission__ajout">
      <input type="hidden" name="mission" value={mission} />
      <label>
        Rubrique
        <select name="rubrique" defaultValue={redaction ? "ARTICLE" : "CLAUSE_A_RISQUE"}>
          {rubriquesDuType(type).map((r) => (
            <option key={r} value={r}>
              {libelleDeRubrique(r, type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {type === "DSF_CIBLEE" ? "Gravité (points à surveiller)" : "Gravité (clauses à surveiller)"}
        <select name="gravite" defaultValue="">
          <option value="">Sans objet</option>
          <option value="FAIBLE">Faible</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="ELEVEE">Élevée</option>
        </select>
      </label>
      <label className="mission__large">
        Titre
        <input name="titre" required maxLength={200} />
      </label>
      <label className="mission__large">
        Texte
        <textarea name="texte" required rows={3} maxLength={4000} />
      </label>
      <label className="mission__large">
        {type === "DSF_CIBLEE" ? "Référence : poste de la liasse, compte (facultatif)" : "Extrait du contrat (facultatif)"}
        <textarea name="citation" rows={2} maxLength={2000} />
      </label>
      <div className="mission__large mission__boutons">
        <button type="submit" className="bouton-discret" disabled={enCours}>
          Ajouter
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Fermer
        </button>
      </div>
      <Message etat={etat} />
    </form>
  );
}

export function Soumettre({ mission, enAttente }: { mission: string; enAttente: number }) {
  const [etat, soumettre, enCours] = useActionState(soumettreLaMission, ETAT_ACTE_INITIAL);
  return (
    <form action={soumettre} className="mission__agent">
      <input type="hidden" name="mission" value={mission} />
      <p className="mission__note">
        {enAttente > 0
          ? `${enAttente} point${enAttente > 1 ? "s" : ""} attend${enAttente > 1 ? "ent" : ""} encore votre décision.`
          : "Tous les points sont décidés. La mission part au second regard : un autre la valide."}
      </p>
      <button type="submit" className="action-principale" disabled={enCours || enAttente > 0}>
        {enCours ? "…" : "Soumettre au second regard"}
      </button>
      <Message etat={etat} />
    </form>
  );
}

export function ValiderOuRenvoyer({ mission }: { mission: string }) {
  const [etatV, valider, enV] = useActionState(validerLaMission, ETAT_ACTE_INITIAL);
  const [etatR, renvoyer, enR] = useActionState(renvoyerLaMission, ETAT_ACTE_INITIAL);
  return (
    <div className="mission__second-regard">
      <form action={valider}>
        <input type="hidden" name="mission" value={mission} />
        <button type="submit" className="action-principale" disabled={enV}>
          {enV ? "…" : "Valider et livrer"}
        </button>
        <Message etat={etatV} />
      </form>
      <form action={renvoyer} className="mission__renvoi">
        <input type="hidden" name="mission" value={mission} />
        <input name="motif" required minLength={5} placeholder="Ce qu'il faut reprendre" aria-label="Motif du renvoi" />
        <button type="submit" className="bouton-discret" disabled={enR}>
          Renvoyer à l&rsquo;instruction
        </button>
        <Message etat={etatR} />
      </form>
    </div>
  );
}
