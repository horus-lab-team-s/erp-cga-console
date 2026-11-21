"use client";

import { useActionState, useState } from "react";

import { creerUnRole, reglerUnRole, retirerUnRole } from "@/app/lib/actions-matrice-des-roles";
import { casePermise, type FamilleDeDroits, type RoleDeLaGrille } from "@/app/lib/matrice-des-roles-etats";
import { ETAT_ACTE_INITIAL, type EtatActe } from "@/app/lib/saisie";

/**
 * La matrice des rôles, lue d'un coup d'œil et réglée rôle par rôle (18 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE GÉRANT A DEMANDÉ : « ressortir aisément la matrice des rôles ». La grille
 * montre tout, rôles en colonnes, droits en lignes par famille. Le réglage se fait sur
 * UN rôle à la fois : cocher dans une grille de douze colonnes, c'est cocher la mauvaise.
 *
 * ⚠️ Les cases grisées sont celles que le serveur refuserait (droits réservés au super
 * administrateur, gestes du client pour un collaborateur, droits du cabinet pour un rôle
 * externe). Griser n'est pas protéger : le serveur reste le juge.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function MatriceDesRoles({
  familles,
  roles,
  reglable,
}: {
  familles: FamilleDeDroits[];
  roles: RoleDeLaGrille[];
  /** Super administrateur avec une session renforcée. */
  reglable: boolean;
}) {
  const [choisi, setChoisi] = useState<string>(roles.find((r) => !r.externe)?.code ?? roles[0]?.code ?? "");
  const role = roles.find((r) => r.code === choisi);
  return (
    <div className="matrice">
      <div className="matrice__grille" role="region" aria-label="Matrice des rôles" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col" className="matrice__droit">
                Droit
              </th>
              {roles.map((r) => (
                <th key={r.code} scope="col" className="matrice__role" data-choisi={r.code === choisi}>
                  <button type="button" onClick={() => setChoisi(r.code)} title={`Régler : ${r.libelle}`}>
                    {r.libelle}
                    {r.regle && <span className="matrice__marque"> · réglé</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {familles.map((f) => (
            <tbody key={f.famille}>
              <tr className="matrice__famille">
                <th scope="rowgroup" colSpan={roles.length + 1}>
                  {f.famille}
                </th>
              </tr>
              {f.droits.map((d) => (
                <tr key={d.code}>
                  <th scope="row" className="matrice__droit">
                    {d.libelle}
                  </th>
                  {roles.map((r) => {
                    const tenu = r.permissions.includes(d.code);
                    return (
                      <td key={r.code} data-choisi={r.code === choisi} className="matrice__case">
                        <span aria-label={tenu ? `${r.libelle} : oui` : `${r.libelle} : non`}>{tenu ? "●" : ""}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {role && reglable && <ReglerLeRole key={role.code} role={role} familles={familles} />}
      {reglable && <CreerUnRole familles={familles} />}
    </div>
  );
}

function Retour({ etat }: { etat: EtatActe }) {
  if (etat.echec)
    return (
      <p role="alert" className="matrice__retour" data-ton="echec">
        {etat.echec}
      </p>
    );
  if (etat.fait)
    return (
      <p role="status" className="matrice__retour" data-ton="fait">
        {etat.fait}
      </p>
    );
  return null;
}

function CasesDesDroits({
  familles,
  role,
  coches,
}: {
  familles: FamilleDeDroits[];
  /** `null` : un rôle à créer, interne par construction. */
  role: RoleDeLaGrille | null;
  coches: string[];
}) {
  const modele: RoleDeLaGrille = role ?? {
    code: "",
    libelle: "",
    permissions: [],
    systeme: false,
    externe: false,
    portee_obligatoire: false,
    regle: true,
    reglee_par: null,
    reglee_le: null,
  };
  return (
    <div className="matrice__cases">
      {familles.map((f) => (
        <fieldset key={f.famille}>
          <legend>{f.famille}</legend>
          {f.droits.map((d) => {
            const permise = casePermise(modele, d);
            const fixe = d.reserve_au_super_admin && coches.includes(d.code);
            return (
              <label key={d.code} data-grise={!permise}>
                <input type="checkbox" name="permissions" value={d.code} defaultChecked={coches.includes(d.code)} disabled={!permise} />
                {/* Une case désactivée ne part pas avec le formulaire : le droit réservé
                    que le super administrateur garde est renvoyé à part. */}
                {fixe && <input type="hidden" name="permissions" value={d.code} />}
                {d.libelle}
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

function ReglerLeRole({ role, familles }: { role: RoleDeLaGrille; familles: FamilleDeDroits[] }) {
  const [etat, regler, enCours] = useActionState(reglerUnRole, ETAT_ACTE_INITIAL);
  const [retrait, retirer, enRetrait] = useActionState(retirerUnRole, ETAT_ACTE_INITIAL);
  return (
    <section className="matrice__reglage" aria-label={`Régler le rôle ${role.libelle}`}>
      <h2>
        Régler : {role.libelle}
        <small>
          {role.systeme ? "rôle livré" : "rôle du cabinet"}
          {role.externe ? " · externe" : ""}
          {role.reglee_le ? ` · réglé le ${role.reglee_le.slice(0, 10).split("-").reverse().join("/")}` : ""}
        </small>
      </h2>
      <form action={regler}>
        <input type="hidden" name="code" value={role.code} />
        {!role.systeme && (
          <label className="matrice__champ">
            Nom du rôle
            <input name="libelle" defaultValue={role.libelle} minLength={2} maxLength={80} />
          </label>
        )}
        <CasesDesDroits familles={familles} role={role} coches={role.permissions} />
        <label className="matrice__champ">
          Motif (il reste au journal d&rsquo;audit)
          <input name="motif" required minLength={10} maxLength={500} placeholder="Note de service, décision du gérant…" />
        </label>
        <button type="submit" className="bouton-primaire" disabled={enCours}>
          {enCours ? "…" : "Enregistrer les droits"}
        </button>
        <Retour etat={etat} />
      </form>
      {!role.systeme && (
        <form action={retirer} className="matrice__retrait">
          <input type="hidden" name="code" value={role.code} />
          <input name="motif" required minLength={10} maxLength={500} placeholder="Motif du retrait" aria-label="Motif du retrait" />
          <button type="submit" className="bouton-discret" disabled={enRetrait}>
            {enRetrait ? "…" : "Retirer ce rôle"}
          </button>
          <Retour etat={retrait} />
        </form>
      )}
    </section>
  );
}

function CreerUnRole({ familles }: { familles: FamilleDeDroits[] }) {
  const [etat, creer, enCours] = useActionState(creerUnRole, ETAT_ACTE_INITIAL);
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <p>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(true)}>
          + Créer un rôle du cabinet
        </button>
        <Retour etat={etat} />
      </p>
    );
  return (
    <section className="matrice__reglage" aria-label="Créer un rôle du cabinet">
      <h2>
        Créer un rôle du cabinet
        <small>Un rôle de collaborateur : il s&rsquo;attribue ensuite depuis Comptes et habilitations.</small>
      </h2>
      <form action={creer}>
        <label className="matrice__champ">
          Nom du rôle
          <input name="libelle" required minLength={2} maxLength={80} placeholder="Ressources humaines" />
        </label>
        <CasesDesDroits familles={familles} role={null} coches={[]} />
        <label className="matrice__champ">
          Motif
          <input name="motif" required minLength={10} maxLength={500} />
        </label>
        <button type="submit" className="bouton-primaire" disabled={enCours}>
          {enCours ? "…" : "Créer le rôle"}
        </button>
        <button type="button" className="bouton-discret" onClick={() => setOuvert(false)}>
          Fermer
        </button>
        <Retour etat={etat} />
      </form>
    </section>
  );
}
