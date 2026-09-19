import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatErreur,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { ActiverSouscription, TachesDExploitation } from "@/app/components/souscription/GestesSouscriptions";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import {
  lireAActiver,
  lireRelancesDAbonnement,
  lireServicesASuspendre,
  type RappelEcheance,
  type ServiceASuspendre,
  type Souscription,
} from "@/app/lib/souscription";

export const metadata: Metadata = { title: "Souscriptions en ligne — Plateforme CGA" };

/**
 * Les souscriptions en ligne, côté cabinet (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS RÔLES, TROIS PANNEAUX, AUCUNE PERMISSION COMMUNE
 *
 * | Panneau                          | Permission          | Rôle            |
 * |----------------------------------|---------------------|-----------------|
 * | Payées, accès à ouvrir           | GERER_COMPTES ou    | administration, |
 * |                                  | LIRE_PILOTAGE       | direction       |
 * | Ouvrir l'accès (le geste)        | GERER_COMPTES       | administration  |
 * | Rapprocher, appeler, suspendre   | LIRE_PILOTAGE       | direction       |
 * | Relances d'impayés               | RELANCER_ADHERENT   | chargé clientèle|
 *
 * Chaque panneau n'est lu que si la permission est détenue : appeler une route qu'on
 * sait refusée ferait remonter un 403 en erreur de page.
 *
 * ⚠️ POURQUOI LA LISTE « À OUVRIR » EXISTE
 *
 * Depuis le pas 83, un paiement n'ouvre plus l'accès à un dossier : un inconnu pouvait
 * payer au NIU d'une autre entreprise et lire sa comptabilité. Toute adhésion payée
 * arrive donc ici, et y reste jusqu'à ce que l'administration vérifie l'identité. Un
 * client qui a payé et attend est le signal que cet écran existe pour montrer : la plus
 * ancienne d'abord.
 *
 * ⚠️ SUSPENDRE N'EST PAS EXÉCUTÉ ICI
 *
 * Le backend rend une décision et sa consigne, pas une exécution : suspendre le compte
 * couperait aussi la lecture des documents, que l'adhérent doit conserver dix ans.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const A_OUVRIR: Colonne[] = [
  { cle: "payeur", libelle: "Payeur", largeur: "minmax(0, 1.4fr)" },
  { cle: "entreprise", libelle: "Entreprise déclarée", largeur: "minmax(0, 1.4fr)" },
  { cle: "service", libelle: "Service", largeur: "minmax(0, 1fr)" },
  { cle: "payee", libelle: "Payée le", largeur: "104px" },
  { cle: "montant", libelle: "Montant", largeur: "120px", aDroite: true },
  { cle: "geste", libelle: "", largeur: "minmax(0, 1.8fr)" },
];

const RELANCES: Colonne[] = [
  { cle: "courriel", libelle: "Adhérent", largeur: "minmax(0, 1.6fr)" },
  { cle: "niu", libelle: "NIU", largeur: "150px" },
  { cle: "montant", libelle: "Montant", largeur: "120px", aDroite: true },
  { cle: "retard", libelle: "Retard", largeur: "90px", aDroite: true },
  { cle: "jalon", libelle: "Relance", largeur: "minmax(0, 1fr)" },
];

const SUSPENSIONS: Colonne[] = [
  { cle: "courriel", libelle: "Adhérent", largeur: "minmax(0, 1.3fr)" },
  { cle: "du", libelle: "Dû", largeur: "120px", aDroite: true },
  { cle: "depuis", libelle: "Depuis le", largeur: "104px" },
  { cle: "consigne", libelle: "Consigne", largeur: "minmax(0, 2.4fr)" },
];

/** Une lecture de panneau : un refus ou une panne s'affiche dans le panneau, pas en page 500. */
async function lirePanneau<T>(lecture: () => Promise<T>): Promise<{ valeur: T } | { echec: string }> {
  try {
    return { valeur: await lecture() };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message };
    throw erreur;
  }
}

export default async function Souscriptions() {
  const acces = await exigerAcces();
  const administre = detient(acces, "GERER_COMPTES");
  const pilote = detient(acces, "LIRE_PILOTAGE");
  const relance = detient(acces, "RELANCER_ADHERENT");
  if (!administre && !pilote && !relance) {
    return (
      <EcranReserve
        titre="Souscriptions en ligne"
        permission="GERER_COMPTES"
        ouAussi={["LIRE_PILOTAGE", "RELANCER_ADHERENT"]}
        acces={acces}
      />
    );
  }
  const jour = aujourdhui();
  const [aOuvrir, relances, suspensions] = await Promise.all([
    administre || pilote ? lirePanneau(lireAActiver) : null,
    relance ? lirePanneau(() => lireRelancesDAbonnement(jour)) : null,
    pilote ? lirePanneau(() => lireServicesASuspendre(jour)) : null,
  ]);

  const enAttente = aOuvrir && "valeur" in aOuvrir ? aOuvrir.valeur.length : 0;

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Souscriptions en ligne" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Souscriptions en ligne</h1>
          <p>Au {dateCourte(jour)}</p>
        </div>

        {enAttente > 0 && (
          <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
            <strong style={{ display: "inline", fontWeight: 600 }}>
              {enAttente} client{enAttente > 1 ? "s ont" : " a"} payé et attend{enAttente > 1 ? "ent" : ""} l&rsquo;ouverture
              de son accès.
            </strong>{" "}
            L&rsquo;accès s&rsquo;ouvre après vérification de l&rsquo;identité : un NIU se lit sur chaque facture, il ne prouve pas
            qu&rsquo;on représente l&rsquo;entreprise.
          </div>
        )}

        {aOuvrir && (
          <Panneau
            titre="Payées, accès à ouvrir"
            aide={
              administre
                ? "Vérifiez l'identité du payeur (RCCM, pièce d'identité du représentant, contact connu du cabinet), décrivez la vérification, puis ouvrez l'accès."
                : "L'ouverture de l'accès est un geste de l'administration des comptes."
            }
          >
            {"echec" in aOuvrir ? (
              <EtatErreur titre="La liste ne se lit pas" detail={aOuvrir.echec} />
            ) : aOuvrir.valeur.length === 0 ? (
              <EtatVide titre="Aucun client en attente" detail="Chaque souscription payée a son accès ouvert, ou n'en demande pas." />
            ) : (
              <>
                <EnteteTableau colonnes={A_OUVRIR} />
                {aOuvrir.valeur.map((s, rang) => (
                  <LigneAOuvrir key={s.reference} s={s} rang={rang} administre={administre} />
                ))}
              </>
            )}
          </Panneau>
        )}

        {pilote && (
          <Panneau titre="Exploitation" aide="Normalement planifiées ; à relancer à la main si la planification a manqué.">
            <TachesDExploitation />
          </Panneau>
        )}

        {relances && (
          <Panneau titre="Relances d'impayés du jour" aide="Jalons à J+1, J+7 et J+14 ; le premier informe, l'adhérent ignore souvent que le prélèvement a échoué.">
            {"echec" in relances ? (
              <EtatErreur titre="Les relances ne se lisent pas" detail={relances.echec} />
            ) : relances.valeur.length === 0 ? (
              <EtatVide titre="Aucune relance à émettre aujourd'hui" />
            ) : (
              <>
                <EnteteTableau colonnes={RELANCES} />
                {relances.valeur.map((r, rang) => (
                  <LigneRelance key={`${r.souscription}-${r.echeance}-${r.jalon}`} r={r} rang={rang} />
                ))}
              </>
            )}
          </Panneau>
        )}

        {suspensions && (
          <Panneau titre="Services à suspendre" aide="Une décision, pas une exécution : l'adhérent garde la lecture de ses documents.">
            {"echec" in suspensions ? (
              <EtatErreur titre="La liste ne se lit pas" detail={suspensions.echec} />
            ) : suspensions.valeur.length === 0 ? (
              <EtatVide titre="Aucun service à suspendre" />
            ) : (
              <>
                <EnteteTableau colonnes={SUSPENSIONS} />
                {suspensions.valeur.map((x, rang) => (
                  <LigneSuspension key={x.souscription} x={x} rang={rang} />
                ))}
              </>
            )}
          </Panneau>
        )}
      </div>
    </>
  );
}

function LigneAOuvrir({ s, rang, administre }: { s: Souscription; rang: number; administre: boolean }) {
  return (
    <LigneTableau colonnes={A_OUVRIR} ton={rang % 2 ? "alterne" : "normal"} hauteur="auto">
      <Cellule gras titre={`${s.prospect.courriel} · ${s.prospect.telephone}`}>
        {s.prospect.prenom} {s.prospect.nom}
      </Cellule>
      <Cellule titre={s.niu ?? ""}>
        {s.prospect.denomination ?? "non déclarée"}
        {s.niu ? ` · ${s.niu}` : ""}
      </Cellule>
      <Cellule>{s.libelle}</Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">
        {s.payee_le ? dateCourte(s.payee_le.slice(0, 10)) : "—"}
      </Cellule>
      <Cellule aDroite tabulaire>
        {montantFcfa(s.montant)}
      </Cellule>
      <span style={{ minWidth: 0, paddingBlock: 6 }}>
        {administre ? (
          <ActiverSouscription reference={s.reference} courriel={s.prospect.courriel} niu={s.niu} />
        ) : (
          <span style={{ font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>À ouvrir par l&rsquo;administration</span>
        )}
      </span>
    </LigneTableau>
  );
}

function LigneRelance({ r, rang }: { r: RappelEcheance; rang: number }) {
  return (
    <LigneTableau colonnes={RELANCES} ton={r.derniere ? "alerte" : rang % 2 ? "alterne" : "normal"}>
      <Cellule gras titre={r.telephone}>{r.courriel}</Cellule>
      <Cellule tabulaire>{r.niu ?? "—"}</Cellule>
      <Cellule aDroite tabulaire>{montantFcfa(r.montant)}</Cellule>
      <Cellule aDroite tabulaire>{r.jours_de_retard} j</Cellule>
      <Cellule>{r.derniere ? "Dernière : annonce l'arrêt du service" : `Jalon J+${r.jalon}`}</Cellule>
    </LigneTableau>
  );
}

function LigneSuspension({ x, rang }: { x: ServiceASuspendre; rang: number }) {
  return (
    <LigneTableau colonnes={SUSPENSIONS} ton={rang % 2 ? "alterne" : "normal"} hauteur="auto">
      <Cellule gras titre={x.niu ?? ""}>{x.courriel}</Cellule>
      <Cellule aDroite tabulaire>{montantFcfa(x.montant_du)}</Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">{dateCourte(x.depuis_le.slice(0, 10))}</Cellule>
      <span style={{ minWidth: 0, paddingBlock: 6, font: "400 12px/1.5 var(--police-texte)" }}>{x.consigne}</span>
    </LigneTableau>
  );
}
