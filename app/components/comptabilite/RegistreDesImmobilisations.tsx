"use client";

import { useActionState, useEffect, useState } from "react";

import { Montant } from "@/app/components/Montant";
import {
  enregistrerUneImmobilisation,
  passerLaDotation,
  sortirUneImmobilisation,
  telechargerLeTableau,
} from "@/app/lib/actions-immobilisations";
import { dateCourte } from "@/app/lib/formats";
import { CATEGORIES, type Immobilisation, type TableauEtDotation } from "@/app/lib/immobilisations-etats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { ETAT_EXPORT_INITIAL } from "@/app/lib/saisie-echange";
import { declencherTelechargement } from "@/app/lib/telechargement-navigateur";

const libelleCategorie = (compte: string) => CATEGORIES.find((c) => c.compte === compte)?.libelle ?? compte;

/** Le registre : les fiches, leur saisie et leur sortie (17 octobre 2026). */
export function RegistreDesImmobilisations({
  dossier,
  fiches,
  peutSaisir,
}: {
  dossier: string;
  fiches: Immobilisation[];
  peutSaisir: boolean;
}) {
  const [nouvelle, setNouvelle] = useState(false);
  return (
    <div className="immobilisations">
      {peutSaisir &&
        (nouvelle ? (
          <FormulaireFiche dossier={dossier} onFermer={() => setNouvelle(false)} />
        ) : (
          <button type="button" className="bouton-primaire" onClick={() => setNouvelle(true)}>
            Saisir une immobilisation
          </button>
        ))}
      {fiches.length === 0 ? (
        <p className="immobilisations__vide">
          Aucun bien au registre. Saisissez chaque immobilisation du dossier : sa dotation se calcule ensuite seule.
        </p>
      ) : (
        <ol className="immobilisations__liste">
          {fiches.map((f) => (
            <Fiche key={f.code} dossier={dossier} fiche={f} peutSaisir={peutSaisir} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Fiche({ dossier, fiche, peutSaisir }: { dossier: string; fiche: Immobilisation; peutSaisir: boolean }) {
  const [geste, setGeste] = useState<"modifier" | "sortir" | null>(null);
  const [sortie, sortir, enSortie] = useActionState(sortirUneImmobilisation, ETAT_ACTE_INITIAL);
  const sortieFaite = Boolean(sortie.fait);
  return (
    <li className="immobilisations__fiche" data-sortie={fiche.sortie_le ? "oui" : "non"}>
      <div className="immobilisations__entete">
        <span>
          <strong>
            {fiche.code} · {fiche.libelle}
          </strong>
          <small>
            {" "}
            · {fiche.categorie} {libelleCategorie(fiche.categorie)} · en service le {dateCourte(fiche.mise_en_service)}
            {fiche.duree_annees ? ` · ${fiche.duree_annees} ans` : " · non amortissable"}
          </small>
        </span>
        <span className="immobilisations__valeur">
          <Montant valeur={fiche.valeur_origine} avecDevise />
        </span>
      </div>
      {fiche.sortie_le && (
        <p className="immobilisations__note">
          Sorti le {dateCourte(fiche.sortie_le)} : {fiche.motif_sortie}
        </p>
      )}
      {fiche.dotations_passees.length > 0 && !fiche.sortie_le && (
        <p className="immobilisations__note">
          Amorti en écriture ({fiche.dotations_passees.join(", ")}) : sa base ne change plus.
        </p>
      )}
      {peutSaisir && !fiche.sortie_le && !sortieFaite && (
        <div className="immobilisations__gestes">
          <button
            type="button"
            className="bouton-discret"
            onClick={() => setGeste(geste === "modifier" ? null : "modifier")}
          >
            {geste === "modifier" ? "Fermer" : "Modifier"}
          </button>
          <button
            type="button"
            className="bouton-discret"
            onClick={() => setGeste(geste === "sortir" ? null : "sortir")}
          >
            {geste === "sortir" ? "Fermer" : "Sortir du registre"}
          </button>
        </div>
      )}
      {geste === "modifier" && <FormulaireFiche dossier={dossier} fiche={fiche} onFermer={() => setGeste(null)} />}
      {geste === "sortir" && !sortieFaite && (
        <form action={sortir} className="immobilisations__formulaire">
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="code" value={fiche.code} />
          <div className="immobilisations__champs">
            <label>
              Sorti le
              <input type="date" name="sortie_le" required />
            </label>
            <label>
              Motif
              <input
                name="motif"
                required
                minLength={3}
                maxLength={300}
                placeholder="Cession, mise au rebut, erreur de saisie"
              />
            </label>
          </div>
          <div className="immobilisations__gestes">
            <button type="submit" className="bouton-primaire" disabled={enSortie}>
              Sortir le bien
            </button>
          </div>
        </form>
      )}
      {sortie.echec && (
        <p role="alert" className="immobilisations__echec">
          {sortie.echec}
        </p>
      )}
    </li>
  );
}

function FormulaireFiche({
  dossier,
  fiche,
  onFermer,
}: {
  dossier: string;
  fiche?: Immobilisation;
  onFermer: () => void;
}) {
  const [etat, enregistrer, enCours] = useActionState(enregistrerUneImmobilisation, ETAT_ACTE_INITIAL);
  const [categorie, setCategorie] = useState<string>(fiche?.categorie ?? "24");
  const figee = Boolean(fiche && fiche.dotations_passees.length > 0);
  const amortissable = categorie !== "22";

  useEffect(() => {
    if (etat.fait && !fiche) onFermer();
  }, [etat.fait, fiche, onFermer]);

  return (
    <form action={enregistrer} className="immobilisations__formulaire">
      <input type="hidden" name="dossier" value={dossier} />
      {fiche && <input type="hidden" name="code" value={fiche.code} />}
      <div className="immobilisations__champs">
        {!fiche && (
          <label>
            Code
            <input name="code" required maxLength={24} placeholder="INFO-01" pattern="[A-Za-z0-9][A-Za-z0-9\-]*" />
          </label>
        )}
        <label>
          Libellé
          <input name="libelle" required minLength={2} maxLength={160} defaultValue={fiche?.libelle} />
        </label>
        <label>
          Catégorie
          <select name="categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} disabled={figee}>
            {CATEGORIES.map((c) => (
              <option key={c.compte} value={c.compte}>
                {c.compte} · {c.libelle}
              </option>
            ))}
          </select>
          {figee && <input type="hidden" name="categorie" value={categorie} />}
        </label>
        <label>
          Valeur d&rsquo;origine HT (FCFA)
          <input
            name="valeur_origine"
            required
            inputMode="numeric"
            defaultValue={fiche ? String(Number(fiche.valeur_origine)) : undefined}
            readOnly={figee}
          />
        </label>
        <label>
          Mise en service
          <input type="date" name="mise_en_service" required defaultValue={fiche?.mise_en_service} readOnly={figee} />
        </label>
        {amortissable && (
          <label>
            Durée d&rsquo;utilisation (années)
            <input
              type="number"
              name="duree_annees"
              required
              min={1}
              max={50}
              defaultValue={fiche?.duree_annees ?? undefined}
              readOnly={figee}
            />
          </label>
        )}
        <label>
          Fournisseur (facultatif)
          <input name="fournisseur" maxLength={160} defaultValue={fiche?.fournisseur ?? undefined} />
        </label>
        <label>
          Pièce (facultatif)
          <input name="piece" maxLength={64} defaultValue={fiche?.piece ?? undefined} placeholder="N° de facture" />
        </label>
      </div>
      <p className="immobilisations__note">
        Amortissement linéaire, au prorata des jours d&rsquo;utilisation. La durée se fixe bien par bien, selon les taux
        admis par le CGI, à valider avec le fiscaliste du cabinet.
      </p>
      <div className="immobilisations__gestes">
        <button type="submit" className="bouton-primaire" disabled={enCours}>
          Enregistrer au registre
        </button>
        <button type="button" className="bouton-discret" onClick={onFermer}>
          Annuler
        </button>
      </div>
      {etat.fait && (
        <p role="status" className="immobilisations__fait">
          {etat.fait}
        </p>
      )}
      {etat.echec && (
        <p role="alert" className="immobilisations__echec">
          {etat.echec}
        </p>
      )}
    </form>
  );
}

/** Le tableau de l'exercice, son contrôle avec la balance, la dotation et l'Excel. */
export function TableauDesAmortissements({
  dossier,
  exercice,
  donnees,
  peutSaisir,
}: {
  dossier: string;
  exercice: string;
  donnees: TableauEtDotation;
  peutSaisir: boolean;
}) {
  const [dotation, doter, enDotation] = useActionState(passerLaDotation, ETAT_ACTE_INITIAL);
  const [excel, telecharger, enExcel] = useActionState(telechargerLeTableau, ETAT_EXPORT_INITIAL);
  useEffect(() => {
    if (excel.fichier) declencherTelechargement(excel.fichier);
  }, [excel.fichier]);

  const { tableau, controle, ecriture_de_dotation: passee } = donnees;
  const lignes = [...tableau.lignes, tableau.total];
  return (
    <div className="immobilisations">
      {tableau.lignes.length === 0 ? (
        <p className="immobilisations__vide">Aucun bien en service sur l&rsquo;exercice {exercice}.</p>
      ) : (
        <div className="immobilisations__defile">
          <table className="immobilisations__tableau">
            <thead>
              <tr>
                <th scope="col">Catégorie</th>
                <th scope="col">Brut ouverture</th>
                <th scope="col">Acquisitions</th>
                <th scope="col">Sorties</th>
                <th scope="col">Brut clôture</th>
                <th scope="col">Amort. ouverture</th>
                <th scope="col">Dotations</th>
                <th scope="col">Amort. des sorties</th>
                <th scope="col">Amort. clôture</th>
                <th scope="col">Valeur nette</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.compte} data-total={l.compte === "2" ? "oui" : "non"}>
                  <th scope="row">
                    {l.compte === "2" ? "" : `${l.compte} · `}
                    {l.libelle}
                  </th>
                  {(
                    [
                      "brut_ouverture",
                      "acquisitions",
                      "sorties",
                      "brut_cloture",
                      "amortissements_ouverture",
                      "dotations",
                      "amortissements_sortis",
                      "amortissements_cloture",
                      "valeur_nette_cloture",
                    ] as const
                  ).map((c) => (
                    <td key={c}>
                      <Montant valeur={l[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="immobilisations__controle" data-concorde={controle.concorde ? "oui" : "non"} role="status">
        {controle.concorde ? (
          <p>
            <strong>Le registre concorde avec la balance</strong> : valeurs brutes (comptes 21 à 24) et amortissements
            (compte 28) sont égaux à la clôture.
          </p>
        ) : (
          <p>
            <strong>Le registre ne concorde pas encore avec la balance.</strong> Brut au registre{" "}
            <Montant valeur={controle.brut_registre} />, en balance <Montant valeur={controle.brut_balance} /> ;
            amortissements au registre <Montant valeur={controle.amortissements_registre} />, en balance{" "}
            <Montant valeur={controle.amortissements_balance} />. Un bien comptabilisé mais absent du registre, ou une
            dotation encore en brouillon, fait cet écart.
          </p>
        )}
      </div>

      <div className="immobilisations__gestes">
        {peutSaisir && (
          <form action={doter}>
            <input type="hidden" name="dossier" value={dossier} />
            <input type="hidden" name="exercice" value={exercice} />
            <button
              type="submit"
              className="bouton-primaire"
              disabled={enDotation || Boolean(passee) || Boolean(dotation.fait)}
            >
              Passer la dotation {exercice}
            </button>
          </form>
        )}
        <form action={telecharger}>
          <input type="hidden" name="dossier" value={dossier} />
          <input type="hidden" name="exercice" value={exercice} />
          <button type="submit" className="bouton-discret" disabled={enExcel}>
            Tableau des amortissements (Excel)
          </button>
        </form>
      </div>
      {passee && !dotation.fait && (
        <p className="immobilisations__note">
          Dotation {exercice} déjà passée : écriture {passee}. Pour la refaire, contre-passez-la d&rsquo;abord.
        </p>
      )}
      {dotation.fait && (
        <p role="status" className="immobilisations__fait">
          {dotation.fait}
        </p>
      )}
      {[dotation.echec, excel.echec].filter(Boolean).map((m) => (
        <p key={m} role="alert" className="immobilisations__echec">
          {m}
        </p>
      ))}
    </div>
  );
}
