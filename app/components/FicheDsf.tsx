"use client";

import { useActionState, useState } from "react";

import { enregistrerLaFicheDsf, renvoyerLaFicheDsf, validerLaFicheDsf } from "@/app/lib/actions-fiche-dsf";
import {
  CHAMPS_R1,
  LIBELLES_CONTROLE,
  LIBELLES_ETAT_FICHE,
  type ControleDeLEntite,
  type FicheSignaletique,
  type VueDeLaFiche,
} from "@/app/lib/fiche-dsf-etats";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * La fiche signalétique de la DSF (fiches R1 à R3), 15 octobre 2026.
 *
 * Le même composant sert au client, dans « Mon entreprise », et au cabinet, sur la fiche du
 * dossier : le client renseigne et envoie ; le cabinet peut renseigner pour lui, et valide ou
 * renvoie une fiche envoyée. Une fiche envoyée ne se modifie pas tant que le cabinet n'a pas
 * répondu ; une fiche validée qui change repart en relecture.
 */
export function FicheDsf({
  dossier,
  vue,
  peutRenseigner,
  peutValider,
  cote,
}: {
  dossier: string;
  vue: VueDeLaFiche;
  peutRenseigner: boolean;
  peutValider: boolean;
  /** Le client envoie « au cabinet » ; le cabinet, qui renseigne pour lui, soumet « à la validation ». */
  cote: "client" | "cabinet";
}) {
  const f = vue.fiche;
  // Une fiche validée se lit en résumé : la modifier la renvoie en relecture, cela se décide.
  const [enModification, setEnModification] = useState(false);
  return (
    <div className="fiche-dsf">
      <p className="fiche-dsf__etat" data-etat={f.etat}>
        <strong>{LIBELLES_ETAT_FICHE[f.etat]}</strong>
        {f.etat === "VALIDEE" && f.validee_le && ` le ${new Date(f.validee_le).toLocaleDateString("fr-FR")}`}
        {f.etat === "SOUMISE" && f.soumise_le && ` le ${new Date(f.soumise_le).toLocaleDateString("fr-FR")}`}
      </p>
      {f.motif_du_renvoi && f.etat === "BROUILLON" && (
        <p className="fiche-dsf__renvoi" role="note">
          À corriger, selon le cabinet : « {f.motif_du_renvoi} »
        </p>
      )}
      {vue.manquants.length > 0 && (
        <div className="fiche-dsf__manquants">
          <span>Il manque encore, pour la DSF :</span>
          <ul>
            {vue.manquants.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {f.etat === "SOUMISE" ? (
        <>
          <Resume fiche={f} />
          {peutValider ? (
            <ReponseDuCabinet dossier={dossier} />
          ) : (
            <p className="fiche-dsf__aide">Le cabinet relit votre fiche. Vous pourrez la modifier après sa réponse.</p>
          )}
        </>
      ) : f.etat === "VALIDEE" && !enModification ? (
        <>
          <Resume fiche={f} />
          {peutRenseigner && (
            <>
              <button type="button" onClick={() => setEnModification(true)}>
                Modifier
              </button>
              <p className="fiche-dsf__aide">Une fiche modifiée repasse en relecture par le cabinet avant la DSF.</p>
            </>
          )}
        </>
      ) : peutRenseigner ? (
        <Formulaire dossier={dossier} fiche={f} cote={cote} />
      ) : (
        <Resume fiche={f} />
      )}
    </div>
  );
}

function Retour({ etat }: { etat: EtatActe }) {
  if (!etat.echec && !etat.fait) return null;
  return (
    <p className="fiche-dsf__retour" data-ton={etat.echec ? "echec" : "fait"} role="status">
      {etat.echec ?? etat.fait}
    </p>
  );
}

function Formulaire({ dossier, fiche, cote }: { dossier: string; fiche: FicheSignaletique; cote: "client" | "cabinet" }) {
  const [etat, agir, enCours] = useActionState(enregistrerLaFicheDsf, ETAT_ACTE_INITIAL);
  const [activites, setActivites] = useState(Math.max(1, fiche.activites.length));
  const [membres, setMembres] = useState(fiche.conseil_d_administration.length);
  return (
    <form action={agir} className="fiche-dsf__formulaire" aria-label="Fiche signalétique de la DSF">
      <input type="hidden" name="dossier" value={dossier} />

      <fieldset>
        <legend>Coordonnées et signataire (fiche R1)</legend>
        <div className="fiche-dsf__grille">
          {CHAMPS_R1.map(([nom, libelle, aide]) => (
            <label key={nom}>
              {libelle}
              <input name={nom} defaultValue={(fiche[nom] as string | null) ?? ""} maxLength={300} />
              {aide && <small>{aide}</small>}
            </label>
          ))}
          <label>
            Professionnel qui a établi les états
            <input name="professionnel_des_etats" defaultValue={fiche.professionnel_des_etats ?? ""} maxLength={300} />
            <small>Le cabinet le renseigne s&rsquo;il tient votre comptabilité</small>
          </label>
          <label>
            États approuvés en assemblée générale
            <select name="etats_approuves_en_ag" defaultValue={fiche.etats_approuves_en_ag === null ? "" : fiche.etats_approuves_en_ag ? "oui" : "non"}>
              <option value="">Pas encore</option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Identification et activités (fiche R2)</legend>
        <div className="fiche-dsf__grille">
          <label>
            Qui contrôle l&rsquo;entreprise
            <select name="controle" defaultValue={fiche.controle ?? ""}>
              <option value="">Choisir</option>
              {(Object.keys(LIBELLES_CONTROLE) as ControleDeLEntite[]).map((c) => (
                <option key={c} value={c}>
                  {LIBELLES_CONTROLE[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Établissements au Cameroun
            <input name="etablissements_au_cameroun" inputMode="numeric" defaultValue={fiche.etablissements_au_cameroun ?? ""} />
          </label>
          <label>
            Établissements hors du Cameroun
            <input name="etablissements_hors_cameroun" inputMode="numeric" defaultValue={fiche.etablissements_hors_cameroun ?? ""} />
          </label>
          <label>
            Première année d&rsquo;activité au Cameroun
            <input name="premiere_annee_au_cameroun" inputMode="numeric" maxLength={4} defaultValue={fiche.premiere_annee_au_cameroun ?? ""} />
          </label>
        </div>
        <p className="fiche-dsf__aide">
          Chaque activité avec son code de la nomenclature NACAM (INS) et, si vous le connaissez, son chiffre d&rsquo;affaires
          hors taxes.
        </p>
        {Array.from({ length: activites }, (_, i) => {
          const a = fiche.activites[i];
          return (
            <div className="fiche-dsf__ligne" key={`activite-${i}`}>
              <label>
                Activité
                <input name="activite.designation" defaultValue={a?.designation ?? ""} maxLength={200} />
              </label>
              <label>
                Code NACAM
                <input name="activite.code_nacam" defaultValue={a?.code_nacam ?? ""} maxLength={12} />
              </label>
              <label>
                Chiffre d&rsquo;affaires HT
                <input name="activite.chiffre_affaires_ht" inputMode="numeric" defaultValue={a?.chiffre_affaires_ht ?? ""} />
              </label>
            </div>
          );
        })}
        {activites < 20 && (
          <button type="button" className="fiche-dsf__ajouter" onClick={() => setActivites((n) => n + 1)}>
            Ajouter une activité
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend>Conseil d&rsquo;administration (fiche R3, sociétés anonymes)</legend>
        {Array.from({ length: membres }, (_, i) => {
          const m = fiche.conseil_d_administration[i];
          return (
            <div className="fiche-dsf__ligne" key={`membre-${i}`}>
              <label>
                Nom
                <input name="membre.nom" defaultValue={m?.nom ?? ""} maxLength={120} />
              </label>
              <label>
                Prénoms
                <input name="membre.prenoms" defaultValue={m?.prenoms ?? ""} maxLength={120} />
              </label>
              <label>
                Qualité
                <input name="membre.qualite" defaultValue={m?.qualite ?? ""} maxLength={120} />
              </label>
              <label>
                Adresse
                <input name="membre.adresse" defaultValue={m?.adresse ?? ""} maxLength={300} />
              </label>
            </div>
          );
        })}
        {membres < 30 && (
          <button type="button" className="fiche-dsf__ajouter" onClick={() => setMembres((n) => n + 1)}>
            Ajouter un administrateur
          </button>
        )}
      </fieldset>

      <div className="fiche-dsf__actions">
        <button type="submit" name="intention" value="enregistrer" disabled={enCours}>
          Enregistrer
        </button>
        <button type="submit" name="intention" value="envoyer" className="fiche-dsf__envoyer" disabled={enCours}>
          {enCours ? "Envoi…" : cote === "client" ? "Envoyer au cabinet" : "Soumettre à la validation"}
        </button>
      </div>
      <Retour etat={etat} />
    </form>
  );
}

function Resume({ fiche }: { fiche: FicheSignaletique }) {
  const faits: [string, string | null][] = [
    ...CHAMPS_R1.map(([nom, libelle]) => [libelle, fiche[nom] as string | null] as [string, string | null]),
    ["Contrôle", fiche.controle ? LIBELLES_CONTROLE[fiche.controle] : null],
    [
      "Activités",
      fiche.activites.map((a) => `${a.designation} (NACAM ${a.code_nacam})`).join(" ; ") || null,
    ],
    ["Administrateurs", fiche.conseil_d_administration.map((m) => `${m.nom}, ${m.qualite}`).join(" ; ") || null],
  ];
  return (
    <dl className="fiche-dsf__resume">
      {faits
        .filter(([, v]) => v)
        .map(([libelle, valeur]) => (
          <div key={libelle}>
            <dt>{libelle}</dt>
            <dd>{valeur}</dd>
          </div>
        ))}
    </dl>
  );
}

function ReponseDuCabinet({ dossier }: { dossier: string }) {
  const [validation, valider, enValidation] = useActionState(validerLaFicheDsf, ETAT_ACTE_INITIAL);
  const [renvoi, renvoyer, enRenvoi] = useActionState(renvoyerLaFicheDsf, ETAT_ACTE_INITIAL);
  return (
    <div className="fiche-dsf__reponse">
      <form action={valider}>
        <input type="hidden" name="dossier" value={dossier} />
        <button type="submit" className="fiche-dsf__envoyer" disabled={enValidation}>
          Valider la fiche
        </button>
        <Retour etat={validation} />
      </form>
      <form action={renvoyer} className="fiche-dsf__renvoyer">
        <input type="hidden" name="dossier" value={dossier} />
        <label>
          Ou la renvoyer au client, avec ce qu&rsquo;il doit corriger
          <input name="motif" minLength={10} maxLength={500} required />
        </label>
        <button type="submit" disabled={enRenvoi}>
          Renvoyer
        </button>
        <Retour etat={renvoi} />
      </form>
    </div>
  );
}
