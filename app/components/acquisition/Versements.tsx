"use client";

import { useActionState } from "react";

import {
  encaisserLaPenalite,
  encaisserLesFrais,
  fixerLaRegleDesVersements,
  restituerLeTropPercu,
} from "@/app/lib/actions-acquisition";
import type { SituationDesVersements } from "@/app/lib/console-acquisition";
import { montantFcfa } from "@/app/lib/formats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les versements d'un dossier : frais de traitement, tranches, payé, reste (9 novembre 2026).
 *
 * Réunion du 4 novembre 2026, demande 21 : « afficher le montant payé, le reste à payer et
 * le statut soldé ». Les frais versés à la soumission sont déduits du total.
 */
export function SituationDesVersementsDuDossier({
  situation,
  frais,
  peutEncaisser,
}: {
  situation: SituationDesVersements;
  /** Les frais fixés pour ce service, ou `null`. */
  frais: string | null;
  peutEncaisser: boolean;
}) {
  const fraisDus = frais !== null && Number(situation.frais_verses) === 0;
  return (
    <div className="versements">
      <dl className="versements__chiffres">
        <div>
          <dt>Frais de traitement</dt>
          <dd>
            {frais === null
              ? "aucun pour ce service"
              : Number(situation.frais_verses) > 0
                ? `${montantFcfa(situation.frais_verses)} versés`
                : `${montantFcfa(frais)} attendus`}
          </dd>
        </div>
        {situation.total !== null && (
          <>
            <div>
              <dt>Total de la proforma</dt>
              <dd>{montantFcfa(situation.total)}</dd>
            </div>
            <div>
              <dt>Payé</dt>
              <dd>{montantFcfa(situation.paye)}</dd>
            </div>
            <div>
              <dt>Reste à payer</dt>
              <dd>
                <strong>{montantFcfa(situation.reste ?? "0")}</strong>
              </dd>
            </div>
            <div>
              <dt>Démarrage</dt>
              <dd>
                {situation.seuil_atteint
                  ? `seuil de ${situation.seuil_pourcent} % atteint`
                  : `à ${situation.seuil_pourcent} %, soit ${montantFcfa(situation.seuil ?? "0")}`}
              </dd>
            </div>
          </>
        )}
      </dl>
      {situation.solde && (
        <p role="status" className="versements__solde">
          ☑ Soldé
        </p>
      )}
      {fraisDus && peutEncaisser && <ConstatDesFrais reference={situation.dossier} montant={frais} />}
    </div>
  );
}

export function ConstatDesFrais({ reference, montant }: { reference: string; montant: string }) {
  const [etat, encaisser, enCours] = useActionState(encaisserLesFrais, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return (
      <p role="status" className="versements__fait">
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={encaisser} className="versements__constat">
      <input type="hidden" name="reference" value={reference} />
      <label>
        Reçu de caisse des frais
        <input name="reference_externe" maxLength={120} required />
      </label>
      <label className="versements__attestation">
        <input type="checkbox" name="rapproche" value="oui" required />
        <span>J&rsquo;ai constaté le versement des frais de traitement, {montantFcfa(montant)}.</span>
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Constater les frais"}
      </button>
      {etat.echec && (
        <p role="alert" className="versements__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}

/** Les services du catalogue, dans l'ordre du site. */
const SERVICES: { code: string; libelle: string }[] = [
  { code: "CREATION", libelle: "Création d'entreprise" },
  { code: "ADHESION", libelle: "Adhésion au centre" },
  { code: "PONCTUEL", libelle: "Prestation ponctuelle" },
  { code: "DOMICILIATION", libelle: "Domiciliation" },
  { code: "FORMATION", libelle: "Formation" },
  { code: "AUTRE", libelle: "Autre demande" },
];

/**
 * Le réglage du super administrateur : frais par service, et seuil de démarrage.
 *
 * ⚠️ Aucun montant n'est proposé par défaut : c'est au cabinet de les fixer. Un service
 * laissé vide n'a pas de frais ; un seuil à 100 % fait tout régler avant de commencer.
 */
export function RegleDesVersementsFormulaire({
  frais,
  seuil,
  parDefaut,
  penalite = null,
}: {
  frais: Record<string, string>;
  seuil: number;
  parDefaut: boolean;
  /** 9 novembre 2026 : la pénalité d'un rendez-vous manqué. */
  penalite?: string | null;
}) {
  const [etat, fixer, enCours] = useActionState(fixerLaRegleDesVersements, ETAT_ACTE_INITIAL);
  return (
    <form action={fixer} className="versements__regle">
      <p className="versements__note">
        {parDefaut
          ? "Aucune règle fixée : pas de frais de traitement, et tout se règle avant le démarrage."
          : `Le dossier démarre à ${seuil} % du total versé.`}
      </p>
      {SERVICES.map((s) => (
        <label key={s.code}>
          Frais de traitement · {s.libelle} (FCFA, vide : aucun)
          <input name={`frais_${s.code}`} type="number" min={1} step={1} defaultValue={frais[s.code] ?? ""} />
        </label>
      ))}
      <label>
        Seuil de démarrage (% du total versé)
        <input name="seuil_demarrage_pourcent" type="number" min={1} max={100} step={1} required defaultValue={seuil} />
      </label>
      <label>
        Pénalité d&rsquo;un rendez-vous manqué (FCFA, vide : aucune)
        <input name="penalite_rendez_vous" type="number" min={1} step={1} defaultValue={penalite ?? ""} />
      </label>
      <label>
        Motif
        <input name="motif" minLength={10} maxLength={500} required />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Enregistrer la règle"}
      </button>
      {etat.echec && (
        <p role="alert" className="versements__echec">
          {etat.echec}
        </p>
      )}
      {etat.fait && (
        <p role="status" className="versements__fait">
          {etat.fait}
        </p>
      )}
    </form>
  );
}


/** 9 novembre 2026 : la pénalité d'un rendez-vous manqué, reçue au guichet. */
export function ConstatDeLaPenalite({ reference, montant }: { reference: string; montant: string }) {
  const [etat, encaisser, enCours] = useActionState(encaisserLaPenalite, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return (
      <p role="status" className="versements__fait">
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={encaisser} className="versements__constat">
      <input type="hidden" name="reference" value={reference} />
      <label>
        Reçu de caisse de la pénalité ({montantFcfa(montant)})
        <input name="reference_externe" maxLength={120} required />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Encaisser la pénalité"}
      </button>
      {etat.echec && (
        <p role="alert" className="versements__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}

/** 9 novembre 2026 : un trop-perçu de l'opérateur, rendu au client. */
export function RestitutionDuTropPercu({ reference, montant }: { reference: string; montant: string }) {
  const [etat, restituer, enCours] = useActionState(restituerLeTropPercu, ETAT_ACTE_INITIAL);
  if (etat.fait) {
    return (
      <p role="status" className="versements__fait">
        {etat.fait}
      </p>
    );
  }
  return (
    <form action={restituer} className="versements__constat">
      <input type="hidden" name="reference" value={reference} />
      <p className="versements__note">
        {montantFcfa(montant)} reçus de l&rsquo;opérateur sans rien à régler : à rendre au client.
      </p>
      <label>
        Référence de la restitution (reçu signé, transfert)
        <input name="reference_externe" maxLength={120} required />
      </label>
      <label>
        Comment l&rsquo;argent a été rendu
        <input name="motif" minLength={5} maxLength={500} required />
      </label>
      <button type="submit" className="bouton-discret" disabled={enCours}>
        {enCours ? "…" : "Constater la restitution"}
      </button>
      {etat.echec && (
        <p role="alert" className="versements__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
