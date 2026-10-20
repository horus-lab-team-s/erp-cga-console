"use client";

import { useActionState, type ReactNode } from "react";

import {
  accorderLeMandat,
  accorderUneGrace,
  fixerLaRegleDeDepassement,
  leverUneGrace,
  retirerLeMandat,
  reviserLeTarif,
} from "@/app/lib/actions-reglement";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * Les gestes du règlement (18 octobre 2026) : réviser un tarif, la règle de dépassement,
 * les grâces, le mandat « le cabinet paie pour moi ». Chacun exige un motif, qui reste au
 * journal d'audit. Les droits sont vérifiés par le serveur ; l'écran ne montre que ce que
 * le compte peut faire.
 */

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec)
    return (
      <p role="alert" className="geste-reglement__retour" data-ton="echec">
        {etat.echec}
      </p>
    );
  if (etat.fait)
    return (
      <p role="status" className="geste-reglement__retour" data-ton="fait">
        {etat.fait}
      </p>
    );
  return null;
}

function Geste({
  titre,
  action,
  enCours,
  bouton,
  etat,
  children,
}: {
  titre: string;
  action: (donnees: FormData) => void;
  enCours: boolean;
  bouton: string;
  etat: EtatActe;
  children: ReactNode;
}) {
  return (
    <details className="geste-reglement">
      <summary>{titre}</summary>
      <form action={action}>
        {children}
        <label>
          Motif (il reste au journal d&rsquo;audit)
          <input name="motif" required minLength={10} maxLength={500} />
        </label>
        <button type="submit" className="bouton-discret" disabled={enCours}>
          {enCours ? "…" : bouton}
        </button>
        <Retour etat={etat} />
      </form>
    </details>
  );
}

export function ReviserLeTarif({ niu, aujourdhui }: { niu: string; aujourdhui: string }) {
  const [etat, agir, enCours] = useActionState(reviserLeTarif, ETAT_ACTE_INITIAL);
  return (
    <Geste titre="Réviser le tarif à partir d'une date" action={agir} enCours={enCours} bouton="Réviser" etat={etat}>
      <input type="hidden" name="niu" value={niu} />
      <label>
        Nouveau montant par période (FCFA)
        <input name="montant" inputMode="numeric" required />
      </label>
      <label>
        À partir du
        <input type="date" name="a_partir_du" required min={aujourdhui} />
      </label>
    </Geste>
  );
}

export function RegleDeDepassement({ delai, dOffice }: { delai: number; dOffice: boolean }) {
  const [etat, agir, enCours] = useActionState(fixerLaRegleDeDepassement, ETAT_ACTE_INITIAL);
  return (
    <Geste
      titre={dOffice ? "Fixer la règle de dépassement (aujourd'hui : d'office, aucun jour toléré)" : `Changer la règle de dépassement (aujourd'hui : ${delai} jours)`}
      action={agir}
      enCours={enCours}
      bouton="Enregistrer la règle"
      etat={etat}
    >
      <label>
        Jours de retard tolérés avant d&rsquo;arrêter le traitement
        <input name="delai_jours" type="number" min={0} max={365} required defaultValue={delai} />
      </label>
    </Geste>
  );
}

export function AccorderUneGrace({ niu, aujourdhui }: { niu: string; aujourdhui: string }) {
  const [etat, agir, enCours] = useActionState(accorderUneGrace, ETAT_ACTE_INITIAL);
  return (
    <Geste titre="Accorder une grâce" action={agir} enCours={enCours} bouton="Accorder" etat={etat}>
      <input type="hidden" name="niu" value={niu} />
      <label>
        Le dossier se traite jusqu&rsquo;au (inclus)
        <input type="date" name="jusqu_au" required min={aujourdhui} />
      </label>
    </Geste>
  );
}

export function LeverUneGrace({ niu, grace }: { niu: string; grace: string }) {
  const [etat, agir, enCours] = useActionState(leverUneGrace, ETAT_ACTE_INITIAL);
  return (
    <Geste titre="Lever cette grâce" action={agir} enCours={enCours} bouton="Lever" etat={etat}>
      <input type="hidden" name="niu" value={niu} />
      <input type="hidden" name="grace" value={grace} />
    </Geste>
  );
}

const OBLIGATIONS = [
  { code: "TVA", libelle: "TVA" },
  { code: "CNPS", libelle: "CNPS" },
  { code: "IRPP_SALAIRES", libelle: "IRPP sur salaires" },
];

export function AccorderLeMandat({ niu, aujourdhui }: { niu: string; aujourdhui: string }) {
  const [etat, agir, enCours] = useActionState(accorderLeMandat, ETAT_ACTE_INITIAL);
  return (
    <Geste titre="Accorder « le cabinet paie pour moi »" action={agir} enCours={enCours} bouton="Accorder le mandat" etat={etat}>
      <input type="hidden" name="niu" value={niu} />
      <fieldset>
        <legend>Ce que le cabinet paie avec les fonds de l&rsquo;adhérent</legend>
        {OBLIGATIONS.map((o) => (
          <label key={o.code} className="geste-reglement__case">
            <input type="checkbox" name="obligations" value={o.code} /> {o.libelle}
          </label>
        ))}
      </fieldset>
      <label>
        À compter du
        <input type="date" name="a_compter_du" required defaultValue={aujourdhui} />
      </label>
      <label>
        Accord écrit signé le
        <input type="date" name="signe_le" required defaultValue={aujourdhui} />
      </label>
      <label>
        Signé par
        <input name="signataire" required minLength={3} placeholder="NOM Prénom, qualité" />
      </label>
    </Geste>
  );
}

export function RetirerLeMandat({ niu, aujourdhui }: { niu: string; aujourdhui: string }) {
  const [etat, agir, enCours] = useActionState(retirerLeMandat, ETAT_ACTE_INITIAL);
  return (
    <Geste titre="Retirer le mandat" action={agir} enCours={enCours} bouton="Retirer" etat={etat}>
      <input type="hidden" name="niu" value={niu} />
      <label>
        À compter du
        <input type="date" name="au" required defaultValue={aujourdhui} />
      </label>
    </Geste>
  );
}
