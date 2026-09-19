import type { Metadata } from "next";

import { Panneau } from "@/app/components/Tableau";
import { Chiffrage, EmissionProforma, Qualification, Reglement } from "@/app/components/acquisition/FicheDossier";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import {
  LIBELLES_ETAT,
  lireFicheDossier,
  lireQualification,
  lireQuestionnaire,
} from "@/app/lib/console-acquisition";
import { dateCourte } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Dossier commercial — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * La fiche d'un dossier commercial : la demande, la qualification, le chiffrage (pas 66).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA PROFORMA S'ÉMET DEPUIS UN DOSSIER CHIFFRÉ (pas 67)
 *
 * Elle est venue avec la page où le client la lit et l'accepte, `/proforma/[numero]` :
 * un lien d'acceptation sans destination aurait été une promesse vide.
 *
 * La qualification et le chiffrage ne sont proposés qu'à qui qualifie les prospects,
 * et le chiffrage qu'une fois la qualification complète : le backend le refuserait,
 * et l'écran ne propose pas un geste refusé.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function FicheDossierCommercial({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PROSPECT")) {
    return <EcranReserve titre="Dossier commercial" permission="LIRE_PROSPECT" acces={acces} />;
  }
  const { reference } = await params;
  const fiche = await lireFicheDossier(reference);
  const [questionnaire, qualification] = await Promise.all([
    lireQuestionnaire(fiche.demande.service_souhaite),
    lireQualification(reference),
  ]);
  const peutQualifier = detient(acces, "QUALIFIER_PROSPECT");
  const termine = ["ACCEPTEE", "PAYEE", "SANS_SUITE"].includes(fiche.etat);
  const d = fiche.demande;
  const acceptee = fiche.proformas.find((p) => p.etat === "ACCEPTEE") ?? null;

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Demandes entrantes", href: "/acquisition" }, { libelle: d.nom }]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>{d.nom}</h1>
          <p>
            {d.service_souhaite} · {LIBELLES_ETAT[fiche.etat]} depuis le {dateCourte(fiche.depuis_le.slice(0, 10))} ·
            déposée le {dateCourte(d.deposee_le.slice(0, 10))}
          </p>
        </div>

        <Panneau titre="La demande" aide="Ce que le visiteur a écrit sur le site, tel quel.">
          <div style={{ padding: "12px 16px", font: "400 13px/1.6 var(--police-texte)" }}>
            <p style={{ margin: 0 }}>
              {d.telephone}
              {d.courriel ? ` · ${d.courriel}` : ""} · rappel souhaité : {d.canal_prefere.toLowerCase()}
            </p>
            {d.message && <p style={{ margin: "6px 0 0", color: "var(--ink-700)" }}>« {d.message} »</p>}
            {fiche.motif_affectation && (
              <p style={{ margin: "6px 0 0", color: "var(--ink-500)", fontSize: 12 }}>
                Affectation : {fiche.motif_affectation}
              </p>
            )}
          </div>
        </Panneau>

        <Panneau
          titre="Qualification"
          aide={`${qualification.avancement.repondues} réponse(s) sur ${qualification.avancement.total} · questionnaire ${questionnaire.service}, version ${questionnaire.version}`}
        >
          <Qualification
            reference={reference}
            questions={questionnaire.questions}
            faits={qualification.faits ?? {}}
            manquantes={qualification.manquantes}
            modifiable={peutQualifier && !termine}
          />
        </Panneau>

        {peutQualifier && (
          <Panneau
            titre="Chiffrage"
            aide="Un intervalle calculé sur les réponses enregistrées, jamais sur ce que l'écran enverrait."
          >
            {qualification.complete ? (
              <Chiffrage reference={reference} />
            ) : (
              <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                Le chiffrage s&rsquo;ouvre quand la qualification est complète. Il manque :{" "}
                {qualification.manquantes.join(", ")}.
              </p>
            )}
          </Panneau>
        )}

        {peutQualifier && fiche.etat === "CHIFFREE" && (
          <Panneau
            titre="Proforma"
            aide="Le montant que vous arrêtez. Hors de l'intervalle recalculé, un motif est exigé."
          >
            <EmissionProforma reference={reference} referenceProposee={null} />
          </Panneau>
        )}
        {fiche.etat === "PROFORMA_EMISE" && (
          <Panneau titre="Proforma" aide="Émise. Le lien d'acceptation a été affiché à l'émission et ne se réaffiche pas.">
            <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              En attente de l&rsquo;accord du client.
            </p>
          </Panneau>
        )}
        {fiche.etat === "ACCEPTEE" && acceptee && (
          <Panneau
            titre="Règlement"
            aide="Le client a accepté. Le règlement ouvre son espace, à l'adresse retenue."
          >
            {detient(acces, "GERER_COMPTES") ? (
              <Reglement
                numero={acceptee.numero}
                montant={acceptee.montant}
                telephone={d.telephone}
                slugRetenu={fiche.slug_retenu}
              />
            ) : (
              <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                Proposition {acceptee.numero} acceptée. Le règlement se confirme par l&rsquo;administration du cabinet.
              </p>
            )}
          </Panneau>
        )}
        {fiche.etat === "PAYEE" && (
          <Panneau titre="Règlement" aide="Encaissé.">
            <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)" }}>
              Payé{fiche.payee_le ? ` le ${dateCourte(fiche.payee_le.slice(0, 10))}` : ""}
              {fiche.slug_retenu ? ` · espace « ${fiche.slug_retenu} »` : ""}.
            </p>
          </Panneau>
        )}
      </div>
    </>
  );
}
