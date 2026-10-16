"use client";

import { useActionState, useEffect, useState } from "react";

import {
  cloreUneOffre,
  enregistrerUneOffre,
  publierUneOffre,
  telechargerUnCv,
} from "@/app/lib/actions-recrutement";
import { dateCourte } from "@/app/lib/formats";
import { jourDuFait } from "@/app/lib/heure-douala";
import {
  LIBELLES_CONTRAT,
  LIBELLES_ETAT_OFFRE,
  type Candidature,
  type OffreDePoste,
  type OffreDuCabinet,
} from "@/app/lib/recrutement-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { ETAT_EXPORT_INITIAL } from "@/app/lib/saisie-echange";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";
import { MiniEditeur } from "./MiniEditeur";

/** Les offres du cabinet : rédiger, publier, clore, lire les candidatures (16 octobre 2026). */
export function OffresDePoste({
  offres,
  candidatures,
}: {
  offres: OffreDuCabinet[];
  candidatures: Record<string, Candidature[]>;
}) {
  const [nouvelle, setNouvelle] = useState(false);
  return (
    <div className="offres">
      {nouvelle ? (
        <FormulaireOffre onFermer={() => setNouvelle(false)} />
      ) : (
        <button type="button" className="bouton-primaire" onClick={() => setNouvelle(true)}>
          Rédiger une offre
        </button>
      )}
      {offres.length === 0 ? (
        <p className="offres__vide">Aucune offre pour l&rsquo;instant.</p>
      ) : (
        <ol className="offres__liste">
          {offres.map((o) => (
            <Offre key={o.offre.identifiant} offre={o} candidatures={candidatures[o.offre.identifiant] ?? []} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Offre({ offre: { offre, candidatures: nombre }, candidatures }: { offre: OffreDuCabinet; candidatures: Candidature[] }) {
  const [edition, setEdition] = useState(false);
  const [lesCandidatures, setLesCandidatures] = useState(false);
  const [publication, publier, enPublication] = useActionState(publierUneOffre, ETAT_ACTE_INITIAL);
  const [cloture, clore, enCloture] = useActionState(cloreUneOffre, ETAT_ACTE_INITIAL);
  const retour = [publication, cloture].find((e) => e.echec || e.fait);

  return (
    <li className="offres__offre" data-etat={offre.etat}>
      <div className="offres__entete">
        <span>
          <strong>{offre.intitule}</strong>
          <small>
            {" "}
            · {offre.lieu} · {LIBELLES_CONTRAT[offre.type_de_contrat]}
            {offre.date_limite ? ` · jusqu'au ${dateCourte(offre.date_limite)}` : ""}
          </small>
        </span>
        <span className="offres__etat">{LIBELLES_ETAT_OFFRE[offre.etat]}</span>
      </div>
      <div className="offres__gestes">
        {offre.etat !== "CLOSE" && (
          <button type="button" className="bouton-discret" onClick={() => setEdition(!edition)}>
            {edition ? "Fermer" : "Modifier"}
          </button>
        )}
        {offre.etat === "BROUILLON" && (
          <form action={publier}>
            <input type="hidden" name="identifiant" value={offre.identifiant} />
            <button type="submit" className="bouton-discret" disabled={enPublication}>
              Publier sur le site
            </button>
          </form>
        )}
        {offre.etat === "PUBLIEE" && (
          <form action={clore}>
            <input type="hidden" name="identifiant" value={offre.identifiant} />
            <button type="submit" className="bouton-discret" disabled={enCloture}>
              Clore
            </button>
          </form>
        )}
        <button type="button" className="bouton-discret" onClick={() => setLesCandidatures(!lesCandidatures)} disabled={nombre === 0}>
          {nombre} candidature{nombre > 1 ? "s" : ""}
        </button>
      </div>
      {retour && (
        <p role={retour.echec ? "alert" : "status"} className={retour.echec ? "offres__echec" : "offres__fait"}>
          {retour.echec ?? retour.fait}
        </p>
      )}
      {edition && <FormulaireOffre offre={offre} onFermer={() => setEdition(false)} />}
      {lesCandidatures && (
        <ul className="offres__candidatures">
          {candidatures.map((c) => (
            <CandidatureRecue key={c.identifiant} candidature={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

function CandidatureRecue({ candidature: c }: { candidature: Candidature }) {
  const [export_, telecharger, enTelechargement] = useActionState(telechargerUnCv, ETAT_EXPORT_INITIAL);
  useEffect(() => {
    if (export_.fichier) declencherTelechargement(export_.fichier);
  }, [export_.fichier]);
  return (
    <li>
      <div className="offres__entete">
        <span>
          <strong>{c.nom}</strong>
          <small>
            {" "}
            · {c.telephone}
            {c.courriel ? ` · ${c.courriel}` : ""} · reçue le {dateCourte(jourDuFait(c.recue_le))}
          </small>
        </span>
        <form action={telecharger}>
          <input type="hidden" name="candidature" value={c.identifiant} />
          <button type="submit" className="bouton-discret" disabled={enTelechargement}>
            CV (PDF)
          </button>
        </form>
      </div>
      {c.message && <p className="offres__message">« {c.message} »</p>}
      {export_.echec && <p role="alert">{export_.echec}</p>}
    </li>
  );
}

function FormulaireOffre({ offre, onFermer }: { offre?: OffreDePoste; onFermer: () => void }) {
  const [etat, envoyer, enEnvoi] = useActionState(async (precedent: typeof ETAT_ACTE_INITIAL, donnees: FormData) => {
    const r = await enregistrerUneOffre(precedent, donnees);
    if (r.fait) onFermer();
    return r;
  }, ETAT_ACTE_INITIAL);
  return (
    <form action={envoyer} className="offres__formulaire">
      <input type="hidden" name="identifiant" value={offre?.identifiant ?? ""} />
      <div className="offres__champs">
        <label>
          Intitulé du poste
          <input name="intitule" required minLength={3} maxLength={160} defaultValue={offre?.intitule ?? ""} />
        </label>
        <label>
          Lieu
          <input name="lieu" required minLength={2} maxLength={120} defaultValue={offre?.lieu ?? "Douala"} />
        </label>
        <label>
          Contrat
          <select name="type_de_contrat" defaultValue={offre?.type_de_contrat ?? "CDI"}>
            {Object.entries(LIBELLES_CONTRAT).map(([code, libelle]) => (
              <option key={code} value={code}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date limite (facultative)
          <input name="date_limite" type="date" defaultValue={offre?.date_limite ?? ""} />
        </label>
      </div>
      <MiniEditeur nom="description" libelle="Le poste" valeurInitiale={offre?.description ?? ""} lignes={4} maximum={6000} />
      <MiniEditeur
        nom="qualifications"
        libelle="Qualifications attendues"
        valeurInitiale={offre?.qualifications ?? ""}
        lignes={8}
        requis
        maximum={8000}
      />
      <div className="offres__gestes">
        <button type="submit" className="bouton-primaire" disabled={enEnvoi}>
          {enEnvoi ? "Enregistrement…" : offre ? "Enregistrer" : "Rédiger en brouillon"}
        </button>
        <button type="button" className="bouton-discret" onClick={onFermer}>
          Annuler
        </button>
      </div>
      {etat.echec && (
        <p role="alert" className="offres__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}
