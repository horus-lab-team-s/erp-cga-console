"use client";

import { useActionState, useState } from "react";

import { renseignerUnTiers } from "@/app/lib/actions-dsf";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";
import { manquantsDuTiers, type DeclarationParTiers, type TiersDeclare } from "@/app/lib/tiers-dsf-etats";

/**
 * Les fournisseurs de l'exercice et leur fiche (16 octobre 2026). Les modèles « MODELE
 * FOURNISSEURS » et « MODELE TIERS » de la DGI demandent sigle, téléphone, pays et ville :
 * une facture ne les donne pas. Le comptable les complète ici une fois, chaque export les
 * reprend.
 */
export function TiersDeLaDsf({
  dossier,
  declaration,
  peutSaisir,
}: {
  dossier: string;
  declaration: DeclarationParTiers;
  peutSaisir: boolean;
}) {
  const incomplets = declaration.lignes.filter((t) => manquantsDuTiers(t).length > 0).length;
  if (declaration.lignes.length === 0) return null;
  return (
    <section className="pieces-dsf" aria-label="Fiches des fournisseurs déclarés">
      <p className="dsf__note">
        <strong>Fournisseurs déclarés</strong> · {declaration.nom_du_fichier}.{" "}
        {incomplets === 0 ? (
          <span className="pieces-dsf__complet">Toutes les fiches sont complètes.</span>
        ) : (
          <span className="pieces-dsf__manque">
            {incomplets} fiche{incomplets > 1 ? "s" : ""} à compléter.
          </span>
        )}
      </p>
      <ol className="pieces-dsf__liste">
        {declaration.lignes.map((t) => (
          <Fiche key={t.tiers} dossier={dossier} tiers={t} peutSaisir={peutSaisir} />
        ))}
      </ol>
    </section>
  );
}

function Fiche({ dossier, tiers, peutSaisir }: { dossier: string; tiers: TiersDeclare; peutSaisir: boolean }) {
  const [ouverte, setOuverte] = useState(false);
  // Enregistrée : la fiche se referme sur ses nouvelles coordonnées.
  const [etat, envoyer, enEnvoi] = useActionState(async (precedent: EtatActe, donnees: FormData) => {
    const retour = await renseignerUnTiers(precedent, donnees);
    if (retour.fait) setOuverte(false);
    return retour;
  }, ETAT_ACTE_INITIAL);
  const [etranger, setEtranger] = useState(tiers.etranger);
  const manque = manquantsDuTiers(tiers);
  const coordonnees = [tiers.sigle, tiers.telephone, tiers.ville, tiers.etranger ? tiers.pays : null].filter(Boolean);

  return (
    <li className="pieces-dsf__piece" data-etat={manque.length ? "A_FOURNIR" : "JOINTE"}>
      <div className="pieces-dsf__entete">
        <span className="pieces-dsf__libelle">
          {tiers.denomination ?? "Raison sociale inconnue"}
          <small> · {tiers.niu ?? tiers.tiers}</small>
        </span>
        <span className="pieces-dsf__etat">{manque.length ? `Manque : ${manque.join(", ")}` : "Complète"}</span>
      </div>
      {coordonnees.length > 0 && <p className="pieces-dsf__detail">{coordonnees.join(" · ")}</p>}
      {peutSaisir && !ouverte && (
        <div className="pieces-dsf__gestes">
          <button type="button" className="bouton-discret" onClick={() => setOuverte(true)}>
            {manque.length ? "Compléter la fiche" : "Modifier la fiche"}
          </button>
        </div>
      )}
      {peutSaisir && ouverte && (
        <form action={envoyer} className="tiers-dsf__formulaire">
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="code" value={tiers.tiers} />
          <input type="hidden" name="niu" value={tiers.niu ?? ""} />
          <label>
            Raison sociale
            <input name="denomination" defaultValue={tiers.denomination ?? ""} required maxLength={200} />
          </label>
          <label>
            Sigle
            <input name="sigle" defaultValue={tiers.sigle ?? ""} maxLength={40} />
          </label>
          <label>
            Téléphone
            <input name="telephone" type="tel" defaultValue={tiers.telephone ?? ""} maxLength={40} />
          </label>
          <label>
            Ville
            <input name="ville" defaultValue={tiers.ville ?? ""} maxLength={80} />
          </label>
          <label className="tiers-dsf__case">
            <input
              name="etranger"
              type="checkbox"
              checked={etranger}
              onChange={(e) => setEtranger(e.target.checked)}
            />
            Réside hors du Cameroun
          </label>
          {etranger && (
            <label>
              Pays de résidence
              <input name="pays" defaultValue={tiers.pays ?? ""} maxLength={80} />
            </label>
          )}
          <div className="pieces-dsf__gestes">
            <button type="submit" className="bouton-discret" disabled={enEnvoi}>
              {enEnvoi ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" className="bouton-discret" onClick={() => setOuverte(false)}>
              Fermer
            </button>
          </div>
        </form>
      )}
      {etat.fait && <p className="pieces-dsf__detail">{etat.fait}</p>}
      {etat.echec && (
        <p role="alert" className="pieces-dsf__echec">
          {etat.echec}
        </p>
      )}
    </li>
  );
}
