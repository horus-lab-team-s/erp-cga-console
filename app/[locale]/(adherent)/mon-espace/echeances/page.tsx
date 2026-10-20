import type { Metadata } from "next";

import { EnvoyerLaPreuve } from "@/app/components/adherent/EnvoyerLaPreuve";
import { ReglerUnePeriode } from "@/app/components/adherent/ReglerUnePeriode";
import { confierLesFonds } from "@/app/lib/actions-fonds";
import { lireLesFondsConfies } from "@/app/lib/fonds";
import type { MesFondsConfies } from "@/app/lib/fonds-etats";
import { DocumentDeLaPiece } from "@/app/components/creation/DocumentDeLaPiece";
import { lireLeDocumentDUnePiece } from "@/app/lib/actions-collecte";
import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import {
  cleDEcheance,
  lireMesEcheances,
  type EcheanceDeLAdherent,
  type VueDesEcheances,
} from "@/app/lib/espace-adherent";
import { dateCourte, dateLongue, montantFcfa } from "@/app/lib/formats";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Mes échéances · CGA Broad Range Consulting Group",
};

/**
 * Mes échéances (pas 113, maquette « Espace adhérent CGA », vue D, sans le paiement en ligne).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE CARTE PAR OBLIGATION, PUIS SA FICHE
 *
 * La liste montre, pour chaque obligation, la carte qui demande un geste (la plus ancienne période
 * en retard, « et 3 autres périodes ») ; la fiche (`?echeance=CODE|début|fin`) dit de quoi il
 * s'agit, la période précédente, la prochaine échéance, et porte « J'ai déjà payé : envoyer la
 * preuve ». Tout arrive calculé et rédigé par le backend : l'écran ne compte aucun jour.
 *
 * ⚠️ « PAYER MAINTENANT » N'EXISTE PAS, ET L'ÉCRAN LE DIT
 *
 * Le paiement par Mobile Money attend une décision du cabinet (question Q29 : agrégateur, ou
 * paiement direct à l'administration). Un bouton qui ne mène nulle part serait pire que la
 * phrase « réglez au guichet, puis envoyez la quittance ici ».
 *
 * ⚠️ Les explications sont une proposition du cabinet tant que le fiscaliste ne les a pas validées :
 * la fiche le mentionne.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MesEcheances({
  searchParams,
}: {
  searchParams: Promise<{ echeance?: string }>;
}) {
  const acces = await exigerAcces();
  const { echeance } = await searchParams;
  // Pas 116 : l'entreprise choisie, et non la première (voir `entreprise-choisie.ts`).
  const { principal } = await monEntrepriseChoisie(acces);
  if (!principal) {
    return (
      <main className="adherent">
        <p className="adherent__vide">
          Aucun dossier ne vous est rattaché : vos échéances apparaîtront ici dès son ouverture.{" "}
          <Link href="/mon-espace">Retour à l&rsquo;accueil</Link>
        </p>
      </main>
    );
  }
  const vue = await lireMesEcheances(principal).catch(() => null);
  // 14 octobre 2026 : ce que le cabinet paie pour lui, sous mandat de paiement.
  const fonds = await lireLesFondsConfies(principal).catch(() => null);
  const choisie = vue?.echeances.find((e) => cleDEcheance(e) === echeance);

  return (
    <main className="adherent">
      <header className="adherent__entete">
        <h1 className="adherent__nom">{choisie ? choisie.titre : "Mes échéances"}</h1>
        <Link href={choisie ? "/mon-espace/echeances" : "/mon-espace"} className="adherent__quitter">
          {choisie ? "Toutes mes échéances" : "Accueil"}
        </Link>
      </header>
      {vue === null ? (
        <section className="adherent__section">
          <h2 className="adherent__titre">Impossible d&rsquo;afficher vos échéances</h2>
          <p className="adherent__vide">La lecture n&rsquo;a pas abouti. Le cabinet suit votre calendrier.</p>
          <p className="adherent__suite">
            <Link href="/mon-espace/echeances">Réessayer</Link>
          </p>
        </section>
      ) : choisie ? (
        <FicheDEcheance vue={vue} echeance={choisie} dossier={principal} fonds={fonds} />
      ) : (
        <ListeDesEcheances vue={vue} fonds={fonds} />
      )}
      <OngletsAdherent actif="echeances" />
    </main>
  );
}

function situation(e: EcheanceDeLAdherent): string {
  switch (e.etat) {
    case "EN_RETARD":
      return `En retard de ${e.jours} jour${e.jours > 1 ? "s" : ""}`;
    case "A_VENIR":
      return e.jours === 0 ? "À régler aujourd'hui" : `À régler dans ${e.jours} jour${e.jours > 1 ? "s" : ""}`;
    case "PREUVE_ENVOYEE":
      return `Preuve envoyée le ${dateCourte(e.preuve!.envoyee_le)} : le cabinet la vérifie`;
    case "FONDS_RECUS":
      return `Fonds reçus par le cabinet le ${dateCourte(e.fonds!.recus_le)} : il règle l'administration`;
    case "PAYEE":
      return `Payée : quittance vérifiée par le cabinet${e.preuve?.verifiee_le ? ` le ${dateCourte(e.preuve.verifiee_le)}` : ""}`;
    case "DEPOSEE":
      return `Déposée le ${dateCourte(e.declaree_le!)}`;
  }
}

/** L'appel de fonds encore à régler pour cette échéance, sous mandat de paiement. */
function appelDe(fonds: MesFondsConfies | null, e: EcheanceDeLAdherent) {
  return fonds?.appels.find(
    (a) => a.code_obligation === e.code_obligation && a.periode_debut === e.periode_debut && a.etat === "A_REGLER",
  );
}

function ListeDesEcheances({ vue, fonds }: { vue: VueDesEcheances; fonds: MesFondsConfies | null }) {
  if (vue.echeances.length === 0) {
    return (
      <section className="adherent__section">
        <p className="adherent__vide">
          Aucune échéance dans les deux prochains mois, et rien en retard. Le cabinet vous préviendra de la
          suivante.
        </p>
      </section>
    );
  }
  return (
    <section className="adherent__section">
      <ul className="adherent__echeances">
        {vue.echeances.map((e) => (
          <li key={cleDEcheance(e)} data-etat={e.etat}>
            <Link href={`/mon-espace/echeances?echeance=${encodeURIComponent(cleDEcheance(e))}`}>
              <strong>{e.titre}</strong>
              <span>{e.periode}</span>
              <span className="adherent__echeance-etat" data-etat={e.etat}>
                {situation(e)}
              </span>
              {e.preuve?.verdict === "REFUSEE" && (
                <span className="adherent__refus">Quittance refusée : {e.preuve.motif}</span>
              )}
              {(e.etat === "EN_RETARD" || e.etat === "A_VENIR") && appelDe(fonds, e) && (
                <span className="adherent__confie">
                  Le cabinet paie pour vous : {montantFcfa(Number(appelDe(fonds, e)!.montant))} à lui remettre
                </span>
              )}
              {e.autres_periodes_en_retard > 0 && (
                <span>
                  et {e.autres_periodes_en_retard} autre{e.autres_periodes_en_retard > 1 ? "s" : ""} période
                  {e.autres_periodes_en_retard > 1 ? "s" : ""} en retard
                </span>
              )}
              {e.montant_estime && <span className="tabulaire">{montantFcfa(Number(e.montant_estime))} (estimé)</span>}
              {e.explication_estimation && <span className="echeance__explication">{e.explication_estimation}</span>}
              {e.etat === "DEPOSEE" && e.montant_constate && (
                <span className="tabulaire">{montantFcfa(Number(e.montant_constate))}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FicheDEcheance({
  vue,
  echeance: e,
  dossier,
  fonds,
}: {
  vue: VueDesEcheances;
  echeance: EcheanceDeLAdherent;
  dossier: string;
  fonds: MesFondsConfies | null;
}) {
  const aRegler = e.etat === "EN_RETARD" || e.etat === "A_VENIR";
  const mandatee = fonds?.obligations_mandatees.includes(e.code_obligation) ?? false;
  const appel = fonds?.appels.find((a) => a.code_obligation === e.code_obligation && a.periode_debut === e.periode_debut);
  return (
    <>
      <section className="adherent__bandeau" data-etat={e.etat === "EN_RETARD" ? "A_ENVOYER" : e.etat === "DEPOSEE" || e.etat === "PAYEE" ? "COMPLET" : "EN_VERIFICATION"}>
        <span className="adherent__bandeau-glyphe" aria-hidden="true">
          {e.etat === "EN_RETARD" ? "!" : e.etat === "DEPOSEE" || e.etat === "PAYEE" ? "✓" : "…"}
        </span>
        <div>
          <h2 className="adherent__bandeau-titre">{situation(e)}</h2>
          <p className="adherent__bandeau-detail">
            {/* ⚠️ Sous mandat, le montant arrêté par le cabinet fait foi : « le cabinet vous indique le
                montant » au-dessus de « montant à lui remettre : 184 500 » se contredisait (prise 1). */}
            {appel
              ? `${montantFcfa(Number(appel.montant))}, montant arrêté par le cabinet. `
              : e.montant_estime
                ? `${montantFcfa(Number(e.montant_estime))}, montant estimé. `
                : e.etat === "DEPOSEE" && e.montant_constate
                  ? `${montantFcfa(Number(e.montant_constate))}. `
                  : "Le cabinet vous indique le montant. "}
            {e.etat === "DEPOSEE" ? "" : `Était à régler le ${dateLongue(e.echeance)}`}
            {e.etat === "DEPOSEE" ? "" : ` · ${e.periode}`}
          </p>
        </div>
      </section>

      {/* ⚠️ 14 octobre 2026 : le motif du refus, en tête. Sans lui, l'adhérent renverrait la même
          quittance, ou croirait l'affaire réglée. */}
      {e.preuve?.verdict === "REFUSEE" && (
        <p className="adherent__consigne" role="alert">
          Le cabinet a refusé la quittance envoyée le {dateCourte(e.preuve.envoyee_le)} : {e.preuve.motif} Envoyez
          la bonne ci-dessous.
        </p>
      )}

      {e.autres_periodes_en_retard > 0 && (
        <p className="adherent__consigne">
          {e.autres_periodes_en_retard} autre{e.autres_periodes_en_retard > 1 ? "s" : ""} période
          {e.autres_periodes_en_retard > 1 ? "s" : ""} de cette obligation {e.autres_periodes_en_retard > 1 ? "sont" : "est"} en
          retard. Commencez par celle-ci, la plus ancienne : le cabinet vous aide pour les suivantes.
        </p>
      )}

      {(e.de_quoi_s_agit_il || e.en_cas_de_retard) && (
        <section className="adherent__section">
          <h2 className="adherent__titre">De quoi s&rsquo;agit-il ?</h2>
          {e.de_quoi_s_agit_il && <p className="adherent__texte">{e.de_quoi_s_agit_il}</p>}
          {e.en_cas_de_retard && aRegler && <p className="adherent__texte">{e.en_cas_de_retard}</p>}
          {!vue.explications_validees && (
            <p className="adherent__mention">Explication en cours de validation par le cabinet.</p>
          )}
        </section>
      )}

      <section className="adherent__section">
        <dl className="adherent__faits">
          {e.precedente && (
            <>
              <dt className="adherent__fait-libelle">Période précédente</dt>
              <dd className="adherent__fait-valeur">
                {e.precedente.periode}
                {" · "}
                {e.precedente.declaree_le
                  ? `${e.precedente.montant_constate ? `${montantFcfa(Number(e.precedente.montant_constate))}, ` : ""}déposée le ${dateCourte(e.precedente.declaree_le)}`
                  : "pas encore déposée"}
              </dd>
            </>
          )}
          <dt className="adherent__fait-libelle">Prochaine échéance</dt>
          <dd className="adherent__fait-valeur">
            {e.prochaine_echeance ? dateLongue(e.prochaine_echeance) : "aucune dans votre calendrier actuel"}
          </dd>
          {e.preuve && (
            <>
              {/* « Quittance » : sous mandat, c'est le cabinet qui l'a portée, pas l'adhérent. */}
              <dt className="adherent__fait-libelle">Quittance</dt>
              <dd className="adherent__fait-valeur">
                le {dateCourte(e.preuve.envoyee_le)} (pièce {e.preuve.piece})
                {e.preuve.verdict === "VALIDEE" && " · vérifiée par le cabinet"}
                {e.preuve.verdict === "REFUSEE" && " · refusée par le cabinet"}
              </dd>
            </>
          )}
        </dl>
        {/* Ce qu'il a envoyé, relu sans quitter la page (« prévisualisation des documents chargés »). */}
        {e.preuve && (
          <DocumentDeLaPiece
            champs={{ identifiant: e.preuve.piece }}
            libelle="la quittance envoyée"
            lire={lireLeDocumentDUnePiece}
          />
        )}
      </section>

      {/* ⚠️ 14 octobre 2026 : sous mandat de paiement, le cabinet paie pour lui. Il lui remet les
          fonds ; « payée » n'arrive qu'avec la quittance de l'administration, portée par le cabinet. */}
      {aRegler && mandatee && (
        <section className="adherent__section">
          <h2 className="adherent__titre">Le cabinet paie pour vous</h2>
          {appel && appel.etat === "A_REGLER" ? (
            <>
              <p className="adherent__texte">
                Vous avez confié au cabinet le paiement de cette obligation. Montant à lui remettre :{" "}
                <strong>{montantFcfa(Number(appel.montant))}</strong>. Il paie l&rsquo;administration dès réception,
                et vous lirez « Payée » avec sa quittance.
              </p>
              <ReglerUnePeriode
                niu={dossier}
                periode={appel.identifiant}
                montant={montantFcfa(Number(appel.montant))}
                telephone={null}
                action={confierLesFonds}
              />
              <p className="adherent__mention">Vous pouvez aussi remettre ces fonds au guichet du cabinet.</p>
            </>
          ) : (
            <p className="adherent__texte">
              Vous avez confié au cabinet le paiement de cette obligation : il vous indique le montant à lui remettre
              dès qu&rsquo;il est arrêté.
            </p>
          )}
        </section>
      )}

      {aRegler && (
        <section className="adherent__section">
          <h2 className="adherent__titre">{mandatee ? "Vous avez réglé vous-même ?" : "Vous avez réglé ?"}</h2>
          <p className="adherent__texte">
            Le paiement en ligne n&rsquo;est pas encore ouvert. Réglez au guichet de votre centre des impôts
            (ou de la CNPS), puis envoyez ici la quittance : le cabinet la joint à votre dossier.
          </p>
          <EnvoyerLaPreuve dossier={dossier} echeance={cleDEcheance(e)} />
        </section>
      )}
    </>
  );
}
