import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { jourDuFait } from "@/app/lib/heure-douala";
import {
  LIBELLES_AXE,
  LIBELLES_FAMILLE,
  type FamilleDeVersement,
  type JournalDeCaisse as Journal,
  type NotificationNonRattachee,
} from "@/app/lib/journal-de-caisse-etats";

const TOUTES: FamilleDeVersement[] = ["COMMERCE", "HONORAIRES", "FONDS_DE_TIERS"];
const LIGNES_MONTREES = 40;

/**
 * Le journal de caisse et ses totaux par axe (18 octobre 2026, point 6).
 *
 * Le rapprochement Tara se fait seul : une ligne « mobile money » n'a été saisie par
 * personne. Les lignes « guichet » ont été constatées par la caisse, sur l'objet qu'elles
 * règlent, donc dans leur axe. Les fonds de tiers ont leur propre total : ils sont dus à
 * l'administration, pas au cabinet.
 */
export function JournalDeCaisse({ journal }: { journal: Journal }) {
  const masquees = TOUTES.filter((f) => !journal.familles_visibles.includes(f));
  return (
    <div className="journal-caisse">
      <form className="journal-caisse__periode" method="get">
        <label>
          Du
          <input type="date" name="du" defaultValue={journal.du} />
        </label>
        <label>
          Au
          <input type="date" name="au" defaultValue={journal.au} />
        </label>
        <button type="submit" className="bouton-discret">
          Afficher
        </button>
        <a className="bouton-discret" href={`/api/caisse/journal?du=${journal.du}&au=${journal.au}`}>
          Exporter en Excel
        </a>
      </form>

      <dl className="caisse__chiffres">
        <div>
          <dt>Encaissé par le cabinet</dt>
          <dd>{montantFcfa(journal.total_du_cabinet)}</dd>
        </div>
        {journal.familles_visibles.includes("FONDS_DE_TIERS") && (
          <div>
            <dt>Fonds de tiers reçus (à reverser)</dt>
            <dd>{montantFcfa(journal.total_des_fonds_de_tiers)}</dd>
          </div>
        )}
      </dl>

      {journal.totaux.length === 0 ? (
        <p className="caisse__vide">Aucun versement sur cette période.</p>
      ) : (
        <table className="journal-caisse__totaux">
          <caption className="visuellement-cache">Totaux par axe</caption>
          <thead>
            <tr>
              <th scope="col">Axe</th>
              <th scope="col">Versements</th>
              <th scope="col">Montant</th>
              <th scope="col">dont mobile money</th>
              <th scope="col">dont guichet</th>
            </tr>
          </thead>
          <tbody>
            {journal.totaux.map((t) => (
              <tr key={t.axe}>
                <th scope="row">{LIBELLES_AXE[t.axe]}</th>
                <td className="tabulaire">{t.nombre}</td>
                <td className="tabulaire">{montantFcfa(t.montant)}</td>
                <td className="tabulaire">{montantFcfa(t.dont_mobile_money)}</td>
                <td className="tabulaire">{montantFcfa(t.dont_guichet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {journal.lignes.length > 0 && (
        <ul className="caisse__file journal-caisse__lignes">
          {journal.lignes.slice(0, LIGNES_MONTREES).map((l, rang) => (
            <li key={`${l.le}-${rang}`} className="caisse__ligne caisse__ligne--reglee">
              <div className="caisse__identite">
                <strong>{l.client}</strong>
                <span>
                  {dateCourte(jourDuFait(l.le))} · {LIBELLES_AXE[l.axe]} · {l.objet}
                  {l.reference ? ` · ${l.reference}` : ""}
                </span>
                <b className="caisse__montant">{montantFcfa(l.montant)}</b>
              </div>
              <p className="caisse__regle">
                <span className="caisse__pastille">{l.canal === "MOBILE_MONEY" ? "Tara, rapproché" : "Guichet"}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {journal.lignes.length > LIGNES_MONTREES && (
        <p className="caisse__vide">
          {journal.lignes.length - LIGNES_MONTREES} versements de plus : l&rsquo;export Excel les donne tous.
        </p>
      )}
      {masquees.length > 0 && (
        <p className="caisse__vide">
          Non affichés pour vos rôles : {masquees.map((f) => LIBELLES_FAMILLE[f]).join(", ")}.
        </p>
      )}
    </div>
  );
}

export function NonRattaches({ notifications }: { notifications: NotificationNonRattachee[] }) {
  if (notifications.length === 0) {
    return <p className="caisse__vide">Aucune : chaque notification de Tara a trouvé son paiement.</p>;
  }
  return (
    <ul className="caisse__file">
      {notifications.map((n, rang) => (
        <li key={`${n.recue_le}-${rang}`} className="caisse__ligne">
          <div className="caisse__identite">
            <strong>{n.telephone ?? "numéro inconnu"}</strong>
            <span>
              Reçue le {dateCourte(jourDuFait(n.recue_le))}
              {n.reference_externe ? ` · référence ${n.reference_externe}` : ""}
              {n.reussi === false ? " · échec signalé par l'opérateur" : ""}
            </span>
            {n.montant && <b className="caisse__montant">{montantFcfa(n.montant)}</b>}
          </div>
        </li>
      ))}
    </ul>
  );
}
