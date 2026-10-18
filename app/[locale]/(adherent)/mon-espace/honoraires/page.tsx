import type { Metadata } from "next";

import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import { ReglerUnePeriode } from "@/app/components/adherent/ReglerUnePeriode";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { dateCourte, montantFcfa, TIRET } from "@/app/lib/formats";
import { lireLesHonoraires } from "@/app/lib/honoraires";
import {
  LIBELLES_CANAL,
  LIBELLES_ETAT,
  LIBELLES_PERIODICITE,
  nomDeLaPeriode,
  type EcheanceDHonoraires,
  type MesHonoraires,
} from "@/app/lib/honoraires-etats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";
import { jourADouala, jourDuFait } from "@/app/lib/heure-douala";

export const metadata: Metadata = {
  title: "Mes honoraires · CGA Broad Range Consulting Group",
};

export const dynamic = "force-dynamic";

/**
 * Mes honoraires : ce que l'adhérent doit au cabinet, et le moyen de le régler (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ : « paiement Tara ou manuel des frais, avec
 * changement de statut », et l'échéancier complet. En tête, ce qui est dû
 * aujourd'hui ; puis chaque période, avec son état, son règlement et son canal.
 *
 * ⚠️ CE N'EST NI LA TVA NI LA CNPS. Ce sont des sommes dues à l'administration ;
 * elles vivent dans « Échéances », avec leurs propres voies de règlement.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MesHonorairesPage() {
  const acces = await exigerAcces();
  const { principal } = await monEntrepriseChoisie(acces);
  if (!principal) {
    return (
      <main className="adherent">
        <p className="adherent__vide">
          Aucun dossier ne vous est rattaché. <Link href="/mon-espace">Retour à l&rsquo;accueil</Link>
        </p>
      </main>
    );
  }
  const vue = await lireLesHonoraires(principal).catch(() => null);

  return (
    <main className="adherent">
      <header className="adherent__entete">
        <h1 className="adherent__nom">Mes honoraires</h1>
        <Link href="/mon-espace" className="adherent__quitter">
          Accueil
        </Link>
      </header>
      <OngletsAdherent actif="honoraires" />

      {vue === null ? (
        <p className="adherent__vide">
          La lecture de vos honoraires n&rsquo;a pas abouti. <Link href="/mon-espace/honoraires">Réessayer</Link>
        </p>
      ) : vue.contrat === null ? (
        <p className="adherent__vide">
          Aucun contrat d&rsquo;honoraires n&rsquo;est encore enregistré pour votre dossier. Votre interlocuteur
          au cabinet vous le communique.
        </p>
      ) : (
        <Echeancier vue={vue} niu={principal} />
      )}
    </main>
  );
}

function Echeancier({ vue, niu }: { vue: MesHonoraires; niu: string }) {
  const contrat = vue.contrat!;
  const dues = vue.echeances.filter((e) => e.etat === "EN_RETARD" || e.etat === "A_REGLER");
  const autres = vue.echeances.filter((e) => e.etat !== "EN_RETARD" && e.etat !== "A_REGLER").reverse();
  // 18 octobre 2026 : le prix du jour, révisions comprises ; la prochaine révision s'annonce.
  const jour = jourADouala();
  const revisions = contrat.revisions ?? [];
  const enVigueur = [...revisions].reverse().find((r) => r.a_partir_du <= jour);
  const prochaine = revisions.find((r) => r.a_partir_du > jour);
  const situation = vue.situation;

  return (
    <>
      {situation?.etat === "BLOQUE" && (
        <p className="honoraires__alerte" role="alert">
          <strong>Le traitement de votre dossier est suspendu.</strong> Vos honoraires sont en retard depuis le{" "}
          {situation.en_retard_depuis ? dateCourte(situation.en_retard_depuis) : TIRET} : le cabinet reprend votre
          comptabilité et vos déclarations dès le règlement. Vous pouvez toujours déposer vos pièces.
        </p>
      )}
      {situation?.etat === "EN_RETARD" && situation.bloque_le && (
        <p className="honoraires__alerte" data-ton="attention" role="status">
          Sans règlement avant le {dateCourte(situation.bloque_le)}, le traitement de votre dossier sera suspendu.
        </p>
      )}
      <section className="honoraires__resume" aria-label="En résumé">
        <p className="honoraires__contrat">
          {montantFcfa(enVigueur?.montant ?? contrat.montant)} {LIBELLES_PERIODICITE[contrat.periodicite]}, payables en début de période.
          {prochaine && ` ${montantFcfa(prochaine.montant)} à partir du ${dateCourte(prochaine.a_partir_du)}.`}
        </p>
        {dues.length === 0 ? (
          <p className="honoraires__a-jour">
            <strong>Vous êtes à jour.</strong> Merci.
          </p>
        ) : (
          <p className="honoraires__du">
            <span>À régler aujourd&rsquo;hui</span>
            <strong>{montantFcfa(vue.du)}</strong>
            {vue.en_retard > 0 && (
              <span className="honoraires__retard">
                dont {vue.en_retard} période{vue.en_retard > 1 ? "s" : ""} en retard
              </span>
            )}
          </p>
        )}
      </section>

      {dues.length > 0 && (
        <section className="adherent__section">
          <h2 className="adherent__titre">À régler</h2>
          <ul className="honoraires__liste">
            {dues.map((e) => (
              <li key={e.debut} className="honoraires__ligne" data-etat={e.etat}>
                <Periode echeance={e} periodicite={contrat.periodicite} />
                <NoteDHonoraires niu={e.niu} periode={e.debut} />
                <ReglerUnePeriode niu={niu} periode={e.debut} montant={montantFcfa(e.montant)} telephone={null} />
              </li>
            ))}
          </ul>
          <p className="adherent__note">
            Vous pouvez aussi régler au cabinet, en espèces ou par virement : la responsable de caisse le
            constate, et la ligne passe à « Réglée ».
          </p>
        </section>
      )}

      <section className="adherent__section">
        <h2 className="adherent__titre">Échéancier</h2>
        <ul className="honoraires__liste">
          {autres.map((e) => (
            <li key={e.debut} className="honoraires__ligne" data-etat={e.etat}>
              <Periode echeance={e} periodicite={contrat.periodicite} />
              {e.reglement && (
                <span className="honoraires__regle">
                  Réglée le {dateCourte(jourDuFait(e.reglement.constate_le))} {LIBELLES_CANAL[e.reglement.canal]}
                  <span className="honoraires__reference"> · {e.reglement.reference_externe}</span>{" "}
                  <a
                    href={`/api/honoraires/${encodeURIComponent(e.niu)}/${encodeURIComponent(e.reglement.identifiant)}`}
                    target="_blank"
                    rel="noopener"
                  >
                    Reçu (PDF)
                  </a>
                </span>
              )}
              {e.etat !== "A_VENIR" && <NoteDHonoraires niu={e.niu} periode={e.debut} />}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** 18 octobre 2026 (points 19 et 20) : la note d'une échéance, à classer ou à imprimer. */
function NoteDHonoraires({ niu, periode }: { niu: string; periode: string }) {
  return (
    <a
      className="honoraires__note"
      href={`/api/honoraires/${encodeURIComponent(niu)}/note/${encodeURIComponent(periode)}`}
      target="_blank"
      rel="noopener"
    >
      Note d&rsquo;honoraires (PDF)
    </a>
  );
}

function Periode({
  echeance,
  periodicite,
}: {
  echeance: EcheanceDHonoraires;
  periodicite: NonNullable<MesHonoraires["contrat"]>["periodicite"];
}) {
  return (
    <span className="honoraires__periode">
      <strong>{nomDeLaPeriode(echeance.debut, periodicite)}</strong>
      <span className="honoraires__montant">{montantFcfa(echeance.montant)}</span>
      <span className="honoraires__etat" data-etat={echeance.etat}>
        {LIBELLES_ETAT[echeance.etat]}
      </span>
      {echeance.etat !== "REGLEE" && echeance.etat !== "A_VENIR" && (
        <span className="honoraires__exigible">exigible depuis le {dateCourte(echeance.exigible_le)}</span>
      )}
      {echeance.etat === "A_VENIR" && (
        <span className="honoraires__exigible">exigible le {dateCourte(echeance.exigible_le)}</span>
      )}
    </span>
  );
}
