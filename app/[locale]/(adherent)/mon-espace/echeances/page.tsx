import type { Metadata } from "next";

import { EnvoyerLaPreuve } from "@/app/components/adherent/EnvoyerLaPreuve";
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
  title: "Mes échéances — CGA Broad Range Consulting Group",
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
        <FicheDEcheance vue={vue} echeance={choisie} dossier={principal} />
      ) : (
        <ListeDesEcheances vue={vue} />
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
    case "DEPOSEE":
      return `Déposée le ${dateCourte(e.declaree_le!)}`;
  }
}

function ListeDesEcheances({ vue }: { vue: VueDesEcheances }) {
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
              {e.autres_periodes_en_retard > 0 && (
                <span>
                  et {e.autres_periodes_en_retard} autre{e.autres_periodes_en_retard > 1 ? "s" : ""} période
                  {e.autres_periodes_en_retard > 1 ? "s" : ""} en retard
                </span>
              )}
              {e.montant_estime && <span className="tabulaire">{montantFcfa(Number(e.montant_estime))} (estimé)</span>}
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
}: {
  vue: VueDesEcheances;
  echeance: EcheanceDeLAdherent;
  dossier: string;
}) {
  const aRegler = e.etat === "EN_RETARD" || e.etat === "A_VENIR";
  return (
    <>
      <section className="adherent__bandeau" data-etat={e.etat === "EN_RETARD" ? "A_ENVOYER" : e.etat === "DEPOSEE" ? "COMPLET" : "EN_VERIFICATION"}>
        <span className="adherent__bandeau-glyphe" aria-hidden="true">
          {e.etat === "EN_RETARD" ? "!" : e.etat === "DEPOSEE" ? "✓" : "…"}
        </span>
        <div>
          <h2 className="adherent__bandeau-titre">{situation(e)}</h2>
          <p className="adherent__bandeau-detail">
            {e.montant_estime
              ? `${montantFcfa(Number(e.montant_estime))}, montant estimé. `
              : e.etat === "DEPOSEE" && e.montant_constate
                ? `${montantFcfa(Number(e.montant_constate))}. `
                : "Le cabinet vous indique le montant. "}
            {e.etat === "DEPOSEE" ? "" : `Était à régler le ${dateLongue(e.echeance)}`}
            {e.etat === "DEPOSEE" ? "" : ` · ${e.periode}`}
          </p>
        </div>
      </section>

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
              <dt className="adherent__fait-libelle">Preuve envoyée</dt>
              <dd className="adherent__fait-valeur">
                le {dateCourte(e.preuve.envoyee_le)} (pièce {e.preuve.piece})
              </dd>
            </>
          )}
        </dl>
      </section>

      {aRegler && (
        <section className="adherent__section">
          <h2 className="adherent__titre">Vous avez réglé ?</h2>
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
