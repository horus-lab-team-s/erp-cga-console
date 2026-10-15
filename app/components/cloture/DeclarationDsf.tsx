"use client";

import { useActionState } from "react";

import { constaterLeDepotDeLaDsf } from "@/app/lib/actions-collecte";
import { preparerLaDsf, validerLaDsf } from "@/app/lib/actions-dsf";
import { LIBELLES_ETAT_DSF, type VersionDsf } from "@/app/lib/dsf-etats";
import { depuisUtc } from "@/app/lib/heure-douala";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";

/** Un horodatage UTC du backend, lu à l'heure de Douala : « 14/10/2026 11:05 ». */
const fr = (utc: string) => {
  const [jour, heure] = depuisUtc(utc).split("T");
  return `${jour.split("-").reverse().join("/")} ${heure.slice(0, 5)}`;
};
const francs = (t: string) => `${Number(t).toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;

function Message({ etat }: { etat: { echec: string | null; fait: string | null } }) {
  if (etat.echec)
    return (
      <p role="alert" className="dsf__message" data-ton="echec">
        {etat.echec}
      </p>
    );
  if (etat.fait)
    return (
      <p role="status" className="dsf__message" data-ton="fait">
        {etat.fait}
      </p>
    );
  return null;
}

/**
 * La DSF de l'exercice : préparer, prévisualiser, valider, constater le dépôt (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Chacun son geste, et l'écran ne montre que ceux de la personne connectée : le comptable
 * prépare, le réviseur valide (jamais ce qu'il a préparé) puis consigne l'accusé, avec le
 * second facteur. Le serveur vérifie tout cela de toute façon.
 *
 * ⚠️ L'aperçu est la version FIGÉE, pas la liasse affichée au-dessus : si une écriture a
 * changé depuis, il faut préparer une nouvelle version, et l'écran le dit. Il s'ouvre dans
 * son onglet (route `/api/dsf/…`) : la politique de contenu interdit le PDF dans la page.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function DeclarationDsf({
  dossier,
  exercice,
  versions,
  peutPreparer,
  peutValider,
  peutDeposer,
  porteDuSecondFacteur,
}: {
  dossier: string;
  exercice: string;
  versions: VersionDsf[];
  peutPreparer: boolean;
  peutValider: boolean;
  peutDeposer: boolean;
  /** Rendue par la page quand la session n'est pas renforcée : sinon `null`. */
  porteDuSecondFacteur: React.ReactNode;
}) {
  const [preparation, preparer, enPreparation] = useActionState(preparerLaDsf, ETAT_ACTE_INITIAL);
  const [validation, valider, enValidation] = useActionState(validerLaDsf, ETAT_ACTE_INITIAL);
  const [depot, deposer, enDepot] = useActionState(constaterLeDepotDeLaDsf, ETAT_ACTE_INITIAL);

  const courante = [...versions].reverse().find((v) => v.etat !== "REMPLACEE") ?? null;
  const remplacees = versions.filter((v) => v.etat === "REMPLACEE");
  const deposee = courante?.etat === "DEPOSEE";

  return (
    <div className="dsf">
      {courante ? (
        <div className="dsf__version" data-etat={courante.etat}>
          <p className="dsf__etat">
            <strong>Version {courante.version}</strong> · {LIBELLES_ETAT_DSF[courante.etat]}
          </p>
          <dl className="dsf__faits">
            <div>
              <dt>Résultat fiscal</dt>
              <dd>{francs(courante.resultat_fiscal)}</dd>
            </div>
            <div>
              <dt>Préparée</dt>
              <dd>
                {courante.preparee_par_nom} · {fr(courante.preparee_le)}
              </dd>
            </div>
            <div>
              <dt>Validée</dt>
              <dd>{courante.validee_par ? `${courante.validee_par_nom} · ${fr(courante.validee_le!)}` : "pas encore"}</dd>
            </div>
            {courante.numero_accuse && (
              <div>
                <dt>Accusé de la DGI</dt>
                <dd>
                  {courante.numero_accuse} · déposée le {fr(courante.deposee_le!)}
                </dd>
              </div>
            )}
            <div>
              <dt>Empreinte</dt>
              <dd className="dsf__empreinte" title={courante.empreinte}>
                {courante.empreinte.slice(0, 16)}…
              </dd>
            </div>
          </dl>

          <p className="dsf__apercu">
            <a
              className="bouton-discret"
              href={`/api/dsf/${encodeURIComponent(dossier)}/${encodeURIComponent(exercice)}/${courante.version}`}
              target="_blank"
              rel="noopener"
            >
              Ouvrir l&rsquo;aperçu PDF de la version {courante.version} ↗
            </a>
          </p>

          {courante.etat === "PREPAREE" && peutValider && (
            <form action={valider} className="dsf__geste">
              <input type="hidden" name="dossier" value={dossier} />
              <input type="hidden" name="exercice" value={exercice} />
              <input type="hidden" name="version" value={courante.version} />
              <p className="dsf__note">
                Relisez l&rsquo;aperçu. La DGI n&rsquo;admet que douze soumissions par an et par contribuable : une DSF
                fausse ne se corrige pas sans compter. Vous ne pouvez pas valider ce que vous avez préparé.
              </p>
              <button type="submit" className="action-principale" disabled={enValidation}>
                {enValidation ? "…" : `Valider la version ${courante.version}`}
              </button>
              <Message etat={validation} />
            </form>
          )}

          {courante.etat === "VALIDEE" &&
            peutDeposer &&
            (porteDuSecondFacteur ?? (
              <form action={deposer} className="dsf__geste dsf__depot">
                <input type="hidden" name="dossier" value={dossier} />
                <input type="hidden" name="exercice" value={exercice} />
                <input type="hidden" name="version" value={courante.version} />
                <p className="dsf__note">
                  Après le dépôt sur le portail de la DGI : l&rsquo;accusé est confronté à l&rsquo;empreinte de cette
                  version, et l&rsquo;obligation passe à « déclarée » à l&rsquo;échéancier.
                </p>
                <label>
                  Numéro de l&rsquo;accusé
                  <input name="numero" required autoComplete="off" />
                </label>
                <label>
                  Déposée le (date et heure de l&rsquo;accusé)
                  <input name="depose_le" type="datetime-local" required />
                </label>
                <label className="dsf__fichier">
                  L&rsquo;accusé rendu par le portail (PDF ou photo)
                  <input name="fichier" type="file" required accept="application/pdf,image/jpeg,image/png" />
                </label>
                <button type="submit" className="action-principale" disabled={enDepot}>
                  {enDepot ? "…" : "Consigner le dépôt"}
                </button>
                <Message etat={depot} />
              </form>
            ))}
        </div>
      ) : (
        <p className="dsf__note">Aucune version préparée pour l&rsquo;exercice {exercice}.</p>
      )}

      {peutPreparer && !deposee && (
        <form action={preparer} className="dsf__geste">
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="exercice" value={exercice} />
          <p className="dsf__note">
            {courante
              ? "Une écriture a changé depuis ? Préparez une nouvelle version : celle-ci sera remplacée, sans être effacée."
              : "Fige la liasse ci-dessus, sur l'exercice clos, avec son empreinte. Rien ne part encore à la DGI."}
          </p>
          <button type="submit" className={courante ? "bouton-discret" : "action-principale"} disabled={enPreparation}>
            {enPreparation ? "…" : courante ? "Préparer une nouvelle version" : "Préparer la DSF"}
          </button>
          <Message etat={preparation} />
        </form>
      )}

      {remplacees.length > 0 && (
        <p className="dsf__note">
          Versions remplacées : {remplacees.map((v) => `v${v.version} (${fr(v.preparee_le)})`).join(", ")}.
        </p>
      )}
    </div>
  );
}
