/**
 * La vue de direction (9 novembre 2026) : ce que la direction voit d'un coup d'œil.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Le tableau de bord ne montrait que des listes : 28 échéances en retard en premier
 * écran, aucune tendance. Trois lectures s'ajoutent en tête, pour qui détient
 * `LIRE_PILOTAGE` :
 *
 *   - les encaissements des douze derniers mois, en colonnes (une seule série, une
 *     seule teinte : pas de légende, le titre la nomme) ;
 *   - le recouvrement des honoraires : la part des adhérents à jour en grand, une
 *     jauge d'une seule teinte, les nombres écrits ;
 *   - la part de chaque activité dans les encaissements, en barres triées.
 *
 * ⚠️ PAS DE BARRE SEGMENTÉE VERT / ORANGE / ROUGE POUR LES ÉTATS. Le validateur de
 * palette la refuse : l'orange et le rouge d'état se confondent même en vision
 * normale, et le vert et le rouge pour un daltonien en mode sombre. La jauge garde
 * une teinte ; l'état se lit aux nombres libellés.
 *
 * ⚠️ CHAQUE LECTURE TOMBE SEULE. Un journal qui ne se lit pas n'emporte pas le
 * recouvrement : chaque carte dit son propre motif.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { ErreurApi } from "@/app/lib/api";
import { lirePipeline } from "@/app/lib/creations";
import { montantFcfa } from "@/app/lib/formats";
import { lireLesSituations } from "@/app/lib/honoraires";
import { lireLeJournalDeCaisse } from "@/app/lib/journal-de-caisse";
import { LIBELLES_AXE, type LigneDuJournal, type TotalParAxe } from "@/app/lib/journal-de-caisse-etats";
import {
  debutDesDouzeMois,
  encaissementsParMois,
  montantCompact,
  partsParActivite,
  plafondDeLAxe,
  recouvrement,
  type MoisEncaisse,
} from "@/app/lib/vue-de-direction";
import { Link } from "@/i18n/navigation";

function totauxDesLignes(lignes: LigneDuJournal[]): Pick<TotalParAxe, "axe" | "montant">[] {
  const parAxe = new Map<LigneDuJournal["axe"], number>();
  for (const l of lignes) parAxe.set(l.axe, (parAxe.get(l.axe) ?? 0) + (Number(l.montant) || 0));
  return [...parAxe.entries()].map(([axe, montant]) => ({ axe, montant: String(montant) }));
}

function motif(cause: unknown): string {
  return cause instanceof ErreurApi ? cause.message : "lecture impossible";
}

export async function VueDeDirection({ jour, dossier = null }: { jour: string; dossier?: string | null }) {
  const [journalBrut, situationsBrutes, pipeline] = await Promise.allSettled([
    lireLeJournalDeCaisse(debutDesDouzeMois(jour), jour),
    lireLesSituations(),
    lirePipeline(jour),
  ]);
  // Le dossier choisi au sélecteur filtre les lignes du journal (le dossier d'une ligne
  // d'honoraires est son NIU) ; les totaux par activité se recalculent sur ces lignes.
  const journal =
    journalBrut.status === "fulfilled" && dossier
      ? {
          ...journalBrut,
          value: (() => {
            const lignes = journalBrut.value.lignes.filter((l) => l.dossier === dossier);
            return { ...journalBrut.value, lignes, totaux: totauxDesLignes(lignes) };
          })(),
        }
      : journalBrut;
  const situations =
    situationsBrutes.status === "fulfilled" && dossier
      ? { ...situationsBrutes, value: situationsBrutes.value.filter((s) => s.situation.niu === dossier) }
      : situationsBrutes;

  return (
    <section className="tdb-direction" aria-label="Vue de direction">
      <article className="tdb-direction__carte tdb-direction__carte--large">
        <EnTete titre="Encaissements des douze derniers mois" lien="/caisse" libelleLien="Journal de caisse" />
        {journal.status === "rejected" ? (
          <p className="tdb-direction__motif">Le journal ne se lit pas : {motif(journal.reason)}.</p>
        ) : (
          <Encaissements mois={encaissementsParMois(journal.value.lignes, jour)} />
        )}
      </article>

      <article className="tdb-direction__carte">
        <EnTete titre="Recouvrement des honoraires" lien="/retards" libelleLien="Retards" />
        {situations.status === "rejected" ? (
          <p className="tdb-direction__motif">Les situations ne se lisent pas : {motif(situations.reason)}.</p>
        ) : (
          <Recouvrement r={recouvrement(situations.value.map((s) => s.situation))} />
        )}
      </article>

      <article className="tdb-direction__carte">
        <EnTete titre="Encaissements par activité" />
        {journal.status === "rejected" ? (
          <p className="tdb-direction__motif">Le journal ne se lit pas.</p>
        ) : (
          <>
            <ParActivite totaux={journal.value.totaux} />
            <ParCanal lignes={journal.value.lignes} />
          </>
        )}
        {pipeline.status === "fulfilled" && !dossier && <Creations lignes={pipeline.value} />}
      </article>
    </section>
  );
}

function Creations({ lignes }: { lignes: Awaited<ReturnType<typeof lirePipeline>> }) {
  const enCours = lignes.filter((c) => c.etape !== "CONVERTI" && c.etape !== "ABANDONNE");
  const enRetard = enCours.filter((c) => c.en_retard).length;
  return (
    <Link href="/creation-entreprise" className="tdb-direction__creations">
      <strong>{enCours.length}</strong> création{enCours.length > 1 ? "s" : ""} d&rsquo;entreprise en cours
      {enRetard > 0 && ` · ${enRetard} en retard`}
      <span aria-hidden="true"> →</span>
    </Link>
  );
}

function EnTete({ titre, lien, libelleLien }: { titre: string; lien?: string; libelleLien?: string }) {
  return (
    <header className="tdb-direction__tete">
      <h2>{titre}</h2>
      {lien && (
        <Link href={lien} className="tdb-direction__lien">
          {libelleLien}
        </Link>
      )}
    </header>
  );
}

function Encaissements({ mois }: { mois: MoisEncaisse[] }) {
  const total = mois.reduce((s, m) => s + m.montant, 0);
  const plafond = plafondDeLAxe(Math.max(...mois.map((m) => m.montant)));
  const courant = mois[mois.length - 1];
  const precedent = mois[mois.length - 2];
  // Étiquettes sélectives : le mois le plus fort et le mois en cours, jamais chaque colonne.
  const plusFort = mois.reduce((a, b) => (b.montant > a.montant ? b : a), mois[0]);
  return (
    <>
      <div className="tdb-direction__chiffre">
        <span className="tdb-direction__valeur">{montantFcfa(total)}</span>
        <span className="tdb-direction__sous">
          sur douze mois · {courant.libelle} : {montantFcfa(courant.montant)}
          {precedent.montant > 0 && ` (${precedent.libelle} : ${montantFcfa(precedent.montant)})`}
        </span>
      </div>
      <div className="colonnes" role="img" aria-label={`Encaissements mensuels, total ${montantFcfa(total)}`}>
        <div className="colonnes__axe" aria-hidden="true">
          <span>{montantCompact(plafond)}</span>
          <span>{montantCompact(plafond / 2)}</span>
          <span>0</span>
        </div>
        <div className="colonnes__trace">
          {mois.map((m) => {
            const etiquette = m.montant > 0 && (m === plusFort || m === courant);
            return (
              <div
                key={m.mois}
                className={"colonnes__mois" + (m === courant ? " colonnes__mois--courant" : "")}
                tabIndex={0}
                data-info={`${m.libelle} ${m.mois.slice(0, 4)} : ${montantFcfa(m.montant)}`}
              >
                <div className="colonnes__barre-zone">
                  {etiquette && <span className="colonnes__etiquette">{montantCompact(m.montant)}</span>}
                  <div className="colonnes__barre" style={{ height: `${(m.montant / plafond) * 100}%` }} />
                </div>
                <span className="colonnes__libelle">{m.libelle}</span>
              </div>
            );
          })}
        </div>
      </div>
      <table className="visuellement-cache">
        <caption>Encaissements par mois</caption>
        <tbody>
          {mois.map((m) => (
            <tr key={m.mois}>
              <th scope="row">{m.mois}</th>
              <td>{montantFcfa(m.montant)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Recouvrement({ r }: { r: ReturnType<typeof recouvrement> }) {
  if (r.taux === null) {
    return <p className="tdb-direction__motif">Aucun adhérent sous contrat d&rsquo;honoraires.</p>;
  }
  // Un seul dossier (choisi au sélecteur) : un pourcentage « 0 sur 1 » ne dit rien, l'état le dit.
  if (r.sousContrat === 1) {
    const etat = r.aJour ? "À jour" : r.bloques ? "Bloqué" : r.sousGrace ? "Sous grâce" : "En retard";
    return (
      <>
        <div className="tdb-direction__chiffre">
          <span className="tdb-direction__valeur">{etat}</span>
          <span className="tdb-direction__sous">honoraires de ce dossier</span>
        </div>
        <dl className="tdb-direction__liste">
          <div>
            <dt>À recouvrer</dt>
            <dd className="tdb-direction__fort">{montantFcfa(r.aRecouvrer)}</dd>
          </div>
        </dl>
      </>
    );
  }
  const pourcentage = Math.round(r.taux * 100);
  const details = [
    r.enRetard && `${r.enRetard} en retard`,
    r.sousGrace && `${r.sousGrace} sous grâce`,
    r.bloques && `${r.bloques} bloqué${r.bloques > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return (
    <>
      <div className="tdb-direction__chiffre">
        <span className="tdb-direction__valeur">{pourcentage} %</span>
        <span className="tdb-direction__sous">
          des adhérents à jour · {r.aJour} sur {r.sousContrat}
        </span>
      </div>
      <div
        className="jauge"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pourcentage}
        aria-label="Part des adhérents à jour de leurs honoraires"
      >
        <div className="jauge__plein" style={{ width: `${pourcentage}%` }} />
      </div>
      <dl className="tdb-direction__liste">
        <div>
          <dt>Pas à jour</dt>
          <dd>{details.length ? details.join(" · ") : "aucun"}</dd>
        </div>
        <div>
          <dt>À recouvrer</dt>
          <dd className="tdb-direction__fort">{montantFcfa(r.aRecouvrer)}</dd>
        </div>
      </dl>
    </>
  );
}

function ParActivite({ totaux }: { totaux: Parameters<typeof partsParActivite>[0] }) {
  const parts = partsParActivite(totaux);
  if (parts.length === 0) {
    return <p className="tdb-direction__motif">Aucun encaissement sur douze mois.</p>;
  }
  const max = parts[0].montant;
  return (
    <ul className="barres">
      {parts.slice(0, 5).map((p) => (
        <li key={p.axe} className="barres__ligne" tabIndex={0} data-info={`${LIBELLES_AXE[p.axe]} : ${montantFcfa(p.montant)}`}>
          <span className="barres__libelle">{LIBELLES_AXE[p.axe]}</span>
          <span className="barres__piste">
            <span className="barres__barre" style={{ width: `${(p.montant / max) * 100}%` }} />
          </span>
          <span className="barres__valeur">{Math.round(p.part * 100)} %</span>
        </li>
      ))}
    </ul>
  );
}

/** Mobile Money ou guichet : la part de chaque canal dans les encaissements. */
function ParCanal({ lignes }: { lignes: LigneDuJournal[] }) {
  const mobile = lignes.filter((l) => l.canal === "MOBILE_MONEY").reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const guichet = lignes.filter((l) => l.canal === "GUICHET").reduce((s, l) => s + (Number(l.montant) || 0), 0);
  const total = mobile + guichet;
  if (total === 0) return null;
  const canaux = [
    { libelle: "Mobile Money", montant: mobile },
    { libelle: "Guichet", montant: guichet },
  ].sort((a, b) => b.montant - a.montant);
  return (
    <div className="tdb-direction__bloc">
      <h3 className="tdb-direction__sous-titre">Par canal</h3>
      <ul className="barres">
        {canaux.map((c) => (
          <li key={c.libelle} className="barres__ligne" tabIndex={0} data-info={`${c.libelle} : ${montantFcfa(c.montant)}`}>
            <span className="barres__libelle">{c.libelle}</span>
            <span className="barres__piste">
              <span className="barres__barre" style={{ width: `${(c.montant / canaux[0].montant) * 100}%` }} />
            </span>
            <span className="barres__valeur">{Math.round((c.montant / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
