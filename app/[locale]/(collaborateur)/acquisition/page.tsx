import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { Affecter, ClasserSansSuite, RappelFait } from "@/app/components/acquisition/ActesDossier";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import {
  LIBELLES_ETAT,
  lireDossiersCommerciaux,
  lireDossiersPayes,
  lireDossiersEnSouffrance,
  lireMotifsDeClassement,
  lireEtatDesCanaux,
  lireRappels,
} from "@/app/lib/console-acquisition";
import { dateCourte } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Demandes entrantes · Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * La console d'acquisition : les demandes venues du site, et ce qu'on en fait (pas 64).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORDRE DE LECTURE EST L'ORDRE D'URGENCE
 *
 *   1. les rappels à passer : un client attend un appel promis
 *   2. ce qui dort au-delà du délai de son état
 *   3. tous les dossiers en cours
 *
 * ⚠️ CE QUE CET ÉCRAN NE FAIT PAS ENCORE
 *
 * Qualifier, chiffrer, émettre et transmettre une proforma, encaisser : les routes
 * existent, les formulaires non. Ce premier écran rend visibles les prospects et
 * permet de les confier, de les rappeler et de clore ceux qui s'arrêtent.
 *
 * Chaque geste n'est proposé qu'à qui détient sa permission : affecter
 * (`AFFECTER_DOSSIER`), rappeler et classer (`QUALIFIER_PROSPECT`).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES_DOSSIERS: Colonne[] = [
  { cle: "prospect", libelle: "Prospect", largeur: "minmax(0, 1.4fr)" },
  { cle: "service", libelle: "Service", largeur: "minmax(0, 1fr)" },
  { cle: "etat", libelle: "État", largeur: "130px" },
  { cle: "responsable", libelle: "Responsable", largeur: "minmax(0, 1fr)" },
  { cle: "gestes", libelle: "", largeur: "230px" },
];

const COLONNES_PAYES: Colonne[] = [
  { cle: "prospect", libelle: "Prospect", largeur: "minmax(0, 1.4fr)" },
  { cle: "service", libelle: "Service", largeur: "minmax(0, 1fr)" },
  { cle: "depuis", libelle: "Réglé", largeur: "minmax(0, 1fr)" },
];

const COLONNES_SOUFFRANCE: Colonne[] = [
  { cle: "prospect", libelle: "Prospect", largeur: "minmax(0, 1.4fr)" },
  { cle: "etat", libelle: "État", largeur: "130px" },
  { cle: "immobile", libelle: "Immobile depuis", largeur: "150px", aDroite: true },
  { cle: "signale", libelle: "Signalé", largeur: "130px" },
];

const COLONNES_RAPPELS: Colonne[] = [
  { cle: "motif", libelle: "À rappeler", largeur: "minmax(0, 2fr)" },
  { cle: "depuis", libelle: "Depuis", largeur: "110px" },
  { cle: "geste", libelle: "", largeur: "160px" },
];

function duree(heures: number): string {
  return heures >= 48 ? `${Math.floor(heures / 24)} j` : `${heures} h`;
}

export default async function ConsoleAcquisition() {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PROSPECT")) {
    return <EcranReserve titre="Demandes entrantes" permission="LIRE_PROSPECT" acces={acces} />;
  }
  // Pas 90 : l'état des canaux, lu à côté ; sa panne ne fait pas tomber la console.
  const canaux = await lireEtatDesCanaux().catch(() => null);
  const [dossiers, payes, enSouffrance, rappels, motifs] = await Promise.all([
    lireDossiersCommerciaux(),
    lireDossiersPayes(),
    lireDossiersEnSouffrance(),
    lireRappels(),
    lireMotifsDeClassement(),
  ]);
  const peutAffecter = detient(acces, "AFFECTER_DOSSIER");
  const peutQualifier = detient(acces, "QUALIFIER_PROSPECT");
  const aAffecter = dossiers.filter((d) => d.etat === "DEPOSEE").length;

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Demandes entrantes" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Demandes entrantes</h1>
          <p>
            {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""} en cours · {aAffecter} à affecter ·{" "}
            {rappels.length} rappel{rappels.length > 1 ? "s" : ""} à passer · {enSouffrance.length} en souffrance
          </p>
        </div>

        <Panneau
          titre="Rappels à passer"
          aide="Ce que la machine a confié à un humain : un client à qui l'on a promis un appel. Du plus ancien au plus récent."
        >
          {rappels.length === 0 ? (
            <EtatVide titre="Aucun rappel en attente" detail="Personne n'attend un appel du cabinet." />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES_RAPPELS} />
              {rappels.map((r, rang) => (
                <LigneTableau key={r.identifiant} colonnes={COLONNES_RAPPELS} ton={rang % 2 ? "alterne" : "normal"}>
                  <Cellule titre={r.dossier}>{r.motif}</Cellule>
                  <Cellule tabulaire couleur="var(--ink-500)">{dateCourte(r.cree_le.slice(0, 10))}</Cellule>
                  <Cellule>{peutQualifier ? <RappelFait identifiant={r.identifiant} /> : null}</Cellule>
                </LigneTableau>
              ))}
            </>
          )}
        </Panneau>

        <Panneau
          titre="Ce qui dort"
          aide="Les dossiers immobiles au-delà du délai que le référentiel accorde à leur état, du plus en retard au moins en retard."
        >
          {enSouffrance.length === 0 ? (
            <EtatVide titre="Rien ne dort" detail="Aucun dossier n'a dépassé le délai de son état." />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES_SOUFFRANCE} />
              {enSouffrance.map((d, rang) => (
                <LigneTableau key={d.reference} colonnes={COLONNES_SOUFFRANCE} ton={rang === 0 ? "alerte" : rang % 2 ? "alterne" : "normal"}>
                  <Cellule gras titre={d.reference}>{d.nom}</Cellule>
                  <Cellule>{LIBELLES_ETAT[d.etat]}</Cellule>
                  <Cellule aDroite tabulaire>
                    {duree(d.immobile_depuis_heures)} · délai {duree(d.delai_heures)}
                  </Cellule>
                  <Cellule couleur="var(--ink-500)">{d.signale_le ? dateCourte(d.signale_le.slice(0, 10)) : "pas encore"}</Cellule>
                </LigneTableau>
              ))}
            </>
          )}
        </Panneau>

        <Panneau
          titre="Dossiers en cours"
          aide="Du plus ancien dans son état au plus récent : celui qui attend depuis le plus longtemps se traite d'abord."
        >
          {dossiers.length === 0 ? (
            <EtatVide titre="Aucun dossier en cours" detail="Aucune demande n'est arrivée, ou toutes ont abouti." />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES_DOSSIERS} />
              {dossiers.map((d, rang) => (
                <LigneTableau key={d.reference} colonnes={COLONNES_DOSSIERS} ton={rang % 2 ? "alterne" : "normal"}>
                  <Cellule gras titre={d.reference}>
                    <Link href={`/acquisition/${d.reference}`} style={{ color: "var(--brand-indigo-700)" }}>
                      {d.nom}
                    </Link>
                    <span style={{ display: "block", font: "400 11.5px/1.4 var(--police-mono)", color: "var(--ink-500)" }}>
                      {d.telephone}
                    </span>
                  </Cellule>
                  <Cellule couleur="var(--ink-500)">{d.service_souhaite}</Cellule>
                  <Cellule>
                    {LIBELLES_ETAT[d.etat]}
                    <span style={{ display: "block", font: "400 11.5px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>
                      depuis le {dateCourte(d.depuis_le.slice(0, 10))}
                    </span>
                  </Cellule>
                  <Cellule couleur={d.responsable ? undefined : "var(--ink-500)"}>
                    {d.responsable_nom ?? d.responsable ?? "personne"}
                  </Cellule>
                  <Cellule>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                      {peutAffecter && (d.etat === "DEPOSEE" || d.etat === "AFFECTEE") && (
                        <Affecter reference={d.reference} reaffecter={d.etat === "AFFECTEE"} />
                      )}
                      {peutQualifier && d.etat !== "ACCEPTEE" && d.etat !== "PAYEE" && (
                        <ClasserSansSuite reference={d.reference} motifs={motifs} />
                      )}
                    </div>
                  </Cellule>
                </LigneTableau>
              ))}
            </>
          )}
        </Panneau>
        {/* ─────────────────────────────────────────────────────────────────
            ⚠️ POURQUOI UN PANNEAU POUR DES DOSSIERS QUI N'ATTENDENT PLUS RIEN.

            Une création payée ouvre toute seule son dossier de formalité. Si un
            fait manquait à la qualification, elle n'en ouvre AUCUN — et le
            dossier commercial, lui, a quitté la file « en cours » au moment du
            paiement.

            Sans ce panneau, une société payée et jamais commencée n'apparaît
            nulle part. C'est exactement la faute que ce produit s'interdit :
            le client a payé, le travail n'a pas commencé, et rien ne le dit.

            ⚠️ Il ne dit pas lui-même si le dossier est ouvert : la fiche le
            fait, en une requête par dossier. Le faire ici coûterait un
            aller-retour par ligne sur un réseau qu'on sait mauvais.
            ───────────────────────────────────────────────────────────────── */}
        {payes.length > 0 && (
          <Panneau
            titre={`Créations payées (${payes.filter((d) => d.service_souhaite === "CREATION").length})`}
            aide="Elles ont quitté la file. Ouvrir la fiche dit si le dossier de formalité s'est bien ouvert."
          >
            <EnteteTableau colonnes={COLONNES_PAYES} />
            {payes
              .filter((d) => d.service_souhaite === "CREATION")
              .map((d, rang) => (
                <LigneTableau key={d.reference} colonnes={COLONNES_PAYES} ton={rang % 2 ? "alterne" : "normal"}>
                  <Cellule gras titre={d.reference}>
                    <Link href={`/acquisition/${d.reference}`} style={{ color: "var(--brand-indigo-700)" }}>
                      {d.nom}
                    </Link>
                  </Cellule>
                  <Cellule couleur="var(--ink-500)">{d.service_souhaite}</Cellule>
                  <Cellule couleur="var(--ink-500)">
                    payé depuis le {dateCourte(d.depuis_le.slice(0, 10))}
                  </Cellule>
                </LigneTableau>
              ))}
          </Panneau>
        )}

        {canaux && (
          <Panneau
            titre="Canaux de contact"
            aide="Ceux que le centre exploite réellement, dans l'ordre proposé au visiteur. Un canal inactif dit pourquoi."
          >
            {canaux.detail.map((c) => (
              <p key={c.canal} style={{ margin: 0, padding: "6px 14px", borderBottom: "1px solid var(--line-100)", font: "400 12.5px/1.5 var(--police-texte)" }}>
                <strong>{c.canal.toLowerCase()}</strong> · {c.actif ? "exploité" : "non exploité"}
                {c.motif && <span style={{ color: "var(--ink-500)" }}> · {c.motif}</span>}
              </p>
            ))}
            <p style={{ margin: 0, padding: "6px 14px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              Messagerie d&rsquo;envoi : {canaux.messagerie_prete ? "prête" : "aucun modèle envoyable"}.
            </p>
          </Panneau>
        )}
      </div>
    </>
  );
}
