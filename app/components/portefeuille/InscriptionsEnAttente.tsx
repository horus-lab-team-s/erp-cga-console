"use client";

import { useActionState, useState } from "react";

import { inscrireAuPortefeuille } from "@/app/lib/actions-portefeuille";
import { FORMES_JURIDIQUES, type EtatDeLInscription } from "@/app/lib/inscription-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/**
 * Les entreprises payées qui attendent leur inscription au portefeuille (16 octobre 2026).
 * Ce que le dossier commercial sait déjà préremplit le formulaire ; le collaborateur vérifie
 * l'identité fiscale sur pièces et complète. L'adhésion au Centre se fait ensuite, par le
 * geste « Admettre au Centre » de la ligne du dossier.
 */
export function InscriptionsEnAttente({ attente, finDAnnee }: { attente: EtatDeLInscription[]; finDAnnee: string }) {
  return (
    <ol className="inscriptions">
      {attente.map((e) => (
        <Inscription key={e.reference} etat={e} finDAnnee={finDAnnee} />
      ))}
    </ol>
  );
}

function Inscription({ etat, finDAnnee }: { etat: EtatDeLInscription; finDAnnee: string }) {
  const [ouverte, setOuverte] = useState(false);
  const [retour, envoyer, enEnvoi] = useActionState(inscrireAuPortefeuille, ETAT_ACTE_INITIAL);
  const p = etat.proposition;

  if (retour.fait) {
    return (
      <li className="inscriptions__ligne" data-etat="faite">
        <p className="inscriptions__retour">{retour.fait}</p>
      </li>
    );
  }
  return (
    <li className="inscriptions__ligne">
      <div className="inscriptions__entete">
        <span>
          <strong>{p.denomination ?? etat.reference}</strong>
          <small>
            {" "}
            · {etat.service} · {p.telephone ?? "sans téléphone"} · {etat.reference}
          </small>
        </span>
        {!ouverte && (
          <button type="button" className="bouton-discret" onClick={() => setOuverte(true)}>
            Inscrire au portefeuille
          </button>
        )}
      </div>
      {ouverte && (
        <form action={envoyer} className="inscriptions__formulaire">
          <input type="hidden" name="reference" value={etat.reference} />
          <label>
            NIU
            <input name="niu" required minLength={10} maxLength={20} placeholder="sur la carte de contribuable" />
          </label>
          <label>
            Raison sociale
            <input name="denomination" required defaultValue={p.denomination ?? ""} maxLength={200} />
          </label>
          <label>
            Forme juridique
            <select name="forme_juridique" required defaultValue="">
              <option value="" disabled>
                Choisir
              </option>
              {FORMES_JURIDIQUES.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.libelle}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date de création (RCCM)
            <input name="date_creation" type="date" required />
          </label>
          <label>
            N° RCCM
            <input name="rccm" maxLength={60} />
          </label>
          <label>
            Régime fiscal
            <select name="regime" required defaultValue={p.regime ?? ""}>
              <option value="" disabled>
                Choisir
              </option>
              <option value="REEL">Réel</option>
              <option value="IGS">Impôt général synthétique</option>
            </select>
          </label>
          <label>
            Centre de rattachement
            <select name="centre" required defaultValue="">
              <option value="" disabled>
                Choisir
              </option>
              <option value="CIME">CIME</option>
              <option value="CDI">CDI</option>
              <option value="DGE">DGE</option>
            </select>
          </label>
          <label>
            Clôture de l&rsquo;exercice en cours
            <input name="cloture_exercice_en_cours" type="date" required defaultValue={finDAnnee} />
          </label>
          <label>
            Téléphone
            <input name="telephone" type="tel" defaultValue={p.telephone ?? ""} maxLength={40} />
          </label>
          <label>
            N° employeur CNPS
            <input name="numero_cnps_employeur" defaultValue={p.numero_cnps_employeur ?? ""} maxLength={40} />
          </label>
          <label>
            Groupe de risque CNPS
            <select name="groupe_risque_cnps" defaultValue={p.groupe_risque_cnps ?? ""}>
              <option value="">Inconnu</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
          <label>
            Notifié le
            <input name="groupe_risque_notifie_le" type="date" />
          </label>
          <label className="inscriptions__large">
            Pièces vues
            <textarea
              name="justification"
              required
              minLength={30}
              maxLength={500}
              rows={2}
              placeholder="Carte de contribuable, RCCM, dernier avis d'imposition…"
            />
          </label>
          <div className="inscriptions__gestes">
            <button type="submit" className="bouton-discret" disabled={enEnvoi}>
              {enEnvoi ? "Inscription…" : "Inscrire"}
            </button>
            <button type="button" className="bouton-discret" onClick={() => setOuverte(false)}>
              Fermer
            </button>
          </div>
          {retour.echec && (
            <p role="alert" className="inscriptions__echec">
              {retour.echec}
            </p>
          )}
        </form>
      )}
    </li>
  );
}
