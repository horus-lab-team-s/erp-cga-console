import type { Metadata } from "next";
import { ListeDesNotifications } from "@/app/components/coquille/ListeDesNotifications";
import { lireMesNotifications } from "@/app/lib/notifications";

import { deconnexion } from "@/app/lib/actions-session";
import { DepotDePiece } from "@/app/components/collecte/DepotDePiece";
import {
  LIBELLES_CANAL,
  LIBELLES_ETAT,
  lireDemandes,
  lirePieces,
  type DemandePiece,
  type LignePiece,
} from "@/app/lib/collecte";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { lireEcheancier, type LigneEcheance } from "@/app/lib/obligations";
import { RepondreAuCabinet } from "@/app/components/adherent/RepondreAuCabinet";
import { EtatHorsLigne } from "@/app/components/adherent/EtatHorsLigne";
import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import {
  deMois,
  lireLesReponsesPossibles,
  lireMonMois,
  type ReglagesDesReponses,
  type VueDuMois,
} from "@/app/lib/espace-adherent";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import type { Dossier } from "@/app/lib/portefeuille";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { ChoisirMonEntreprise } from "@/app/components/adherent/ChoisirMonEntreprise";
import { initiales } from "@/app/lib/acces";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Mon espace — CGA Broad Range Consulting Group",
};

/**
 * L'espace de l'adhérent — le premier écran après le lien d'activation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST LE POINT D'ARRIVÉE DU PARCOURS DE SOUSCRIPTION
 *
 * Devis → paiement → lien reçu par courriel → mot de passe défini → **cet
 * écran**. Sans lui, la chaîne construite dans les contextes M et K s'arrêtait
 * sur une page introuvable.
 *
 * CE QU'IL MONTRE, ET RIEN DE PLUS
 *
 * Son dossier, avec les statuts résolus à aujourd'hui, et ses dernières pièces.
 * L'adhérent ne détient que `LIRE_DOSSIER`, `LIRE_PIECE` et `DEPOSER_PIECE` :
 * demander autre chose produirait un refus de l'API, et proposer un bouton qui
 * échoue est pire que ne rien proposer.
 *
 * LA LISTE VIENT DÉJÀ RESTREINTE
 *
 * `lireDossiers()` rend **son** dossier, parce que la route filtre sur le
 * périmètre de la session. Cet écran ne filtre rien : le faire donnerait
 * l'illusion qu'il protège quelque chose, alors qu'un appel direct à l'API
 * rendrait la même chose. La protection est côté serveur.
 *
 * ⚠️ PAS 81 : LE DÉPÔT EXISTE, ET CE COMMENTAIRE MENTAIT
 *
 * Il disait que le dépôt de pièce manquait parce que « le magasin de fichiers n'a
 * pas d'adaptateur réel ». Le magasin local sur disque existait, avec la route
 * d'envoi du fichier : l'affirmation, périmée, a bloqué le geste le plus attendu de
 * l'adhérent. L'écran porte désormais :
 *
 *   E07  déposer un justificatif      POST /collecte/fichiers puis /collecte/pieces
 *   E06  ce que le cabinet attend     GET  /collecte/demandes, ouvertes, de son dossier
 *   E09  mes échéances                GET  /obligations/dossiers/{niu}/echeancier
 *
 * Toutes restreintes au dossier de la session par le backend : l'écran ne filtre rien.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MonEspace() {
  const acces = await exigerAcces();

  // ─────────────────────────────────────────────────────────────────────────
  // « AUCUN DOSSIER » ET « PAS LE DROIT D'EN AVOIR » NE SE DISENT PAS PAREIL
  //
  // Une première correction avait rendu la page vide plutôt que cassée pour un
  // rôle sans `LIRE_DOSSIER` — c'était mieux qu'un 500, mais faux quand même :
  // l'administrateur lisait « si vous venez de souscrire, le cabinet finalise
  // l'ouverture de votre dossier ». Il n'a pas souscrit, et rien ne se
  // finalise. Un message d'attente adressé à qui n'attend rien fait chercher
  // une panne là où il n'y a qu'une habilitation absente.
  //
  // L'espace adhérent n'est pas un écran de travail : le refus s'écrit donc
  // dans sa propre langue, sans la coquille collaborateur.
  // ─────────────────────────────────────────────────────────────────────────
  if (!detient(acces, "LIRE_DOSSIER")) {
    return (
      <main className="adherent">
        <header className="adherent__entete">
          <div className="adherent__identite">
            <span className="adherent__jeton" aria-hidden="true">
              {initiales(acces.nom_complet)}
            </span>
            <span>
              <strong className="adherent__nom">{acces.nom_complet}</strong>
              <span className="adherent__role">Espace adhérent</span>
            </span>
          </div>
          <form action={deconnexion}>
            <button type="submit" className="adherent__quitter">
              Se déconnecter
            </button>
          </form>
        </header>
        <p className="adherent__vide">
          {/* « Accès réservé » est le mot du produit pour un refus d'habilitation.
              Il est repris ici tel quel : la recette le cherche pour distinguer un
              refus d'un écran vide, et un adhérent qui appellerait le cabinet doit
              lire la même formule que celle affichée aux collaborateurs. */}
          <strong>Accès réservé.</strong> Cet espace est celui des adhérents du
          centre, et votre rôle n&rsquo;ouvre aucun dossier — rien n&rsquo;a
          échoué, votre session est valide. Si vous travaillez au cabinet, votre
          espace est le <Link href="/tableau-de-bord">tableau de bord</Link>.
        </p>
      </main>
    );
  }

  // Pas 116 : l'entreprise choisie parmi celles du compte, et non la première.
  const { dossiers, principal } = await monEntrepriseChoisie(acces);
  // ⚠️ Trois lectures indépendantes : une échéance illisible (un dossier sans exercice
  // ouvert) ne doit pas priver l'adhérent de ses pièces ni du dépôt.
  // Pas 112 : le mois (bandeau, ce qu'on attend) et les réponses toutes faites. Sans eux, la page
  // retombe sur la liste brute des demandes du pas 81 : l'adhérent garde l'essentiel.
  const [pieces, demandes, echeances, mois, reponses] = principal
    ? await Promise.all([
        lirePieces({ entreprise: principal }),
        lireDemandes({ entreprise: principal }).catch(() => [] as DemandePiece[]),
        lireEcheancier(principal, exerciceCourant()).catch(() => null),
        lireMonMois(principal).catch(() => null),
        lireLesReponsesPossibles().catch(() => null),
      ])
    : [[], [] as DemandePiece[], null, null, null];
  // Pas 94 : les avis qui concernent l'adhérent (une déclaration déposée pour son dossier).
  // Lecture de commodité : sans elle, l'espace reste entier.
  const nouvelles = await lireMesNotifications().catch(() => null);

  // ⚠️ Pas 76 : `en_attente_de_traitement` n'existe pas dans la réponse ; ce compte valait toujours zéro.
  const enSouffrance = pieces.filter((p) => !p.traitee);

  return (
    <main className="adherent">
      <header className="adherent__entete">
        <div className="adherent__identite">
          <span className="adherent__jeton" aria-hidden="true">
            {initiales(acces.nom_complet)}
          </span>
          <span>
            <strong className="adherent__nom">{acces.nom_complet}</strong>
            <span className="adherent__role">Espace adhérent</span>
          </span>
        </div>
        <span className="adherent__actions">
          <Link href="/mon-espace/reglages" className="adherent__quitter">
            Réglages
          </Link>
          <form action={deconnexion}>
            <button type="submit" className="adherent__quitter">
              Se déconnecter
            </button>
          </form>
        </span>
      </header>

      {principal && <ChoisirMonEntreprise dossiers={dossiers} principal={principal} />}

      {/* Pas 115 : hors ligne, ou des envois en attente, en tête de page (vue F). */}
      {principal && <EtatHorsLigne dossier={principal} />}

      {mois && <BandeauDuMois mois={mois} />}

      {mois && mois.attendues.length > 0 && reponses && (
        <CeQuOnAttend mois={mois} reponses={reponses} />
      )}

      {principal && (
        <section className="adherent__section" id="envoyer">
          <h2 className="adherent__titre">Envoyer un justificatif</h2>
          <DepotDePiece dossier={principal} />
        </section>
      )}

      {/* Repli du pas 81 : le mois illisible, la liste brute des demandes reste. */}
      {!(mois && reponses) && demandes.length > 0 && (
        <section className="adherent__section">
          <h2 className="adherent__titre">Ce que le cabinet attend de vous</h2>
          <ul className="adherent__liste">
            {demandes.map((d) => (
              <li key={d.identifiant}>
                <strong>{d.motif}</strong>
                <span>
                  Demandée le {dateCourte(d.demandee_le)}
                  {d.attendue_pour && ` · attendue pour le ${dateCourte(d.attendue_pour)}`}
                </span>
                {d.bloquante && <span data-alerte="true">Sans elle, une déclaration ne peut pas être déposée.</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {nouvelles && nouvelles.non_lues > 0 && (
        <section className="adherent__section">
          <h2 className="adherent__titre">Du nouveau sur votre dossier</h2>
          <ListeDesNotifications lecture={nouvelles} espaceAdherent />
        </section>
      )}

      {mois && <VotreMois mois={mois} />}

      <Echeances echeances={echeances} />

      <section className="adherent__section">
        <h2 className="adherent__titre">Mes derniers envois</h2>
        {enSouffrance.length > 0 && (
          <p className="adherent__note">
            {enSouffrance.length} pièce{enSouffrance.length > 1 ? "s" : ""} en cours de
            traitement par le cabinet.
          </p>
        )}
        {pieces.length === 0 ? (
          <p className="adherent__vide">
            Aucune pièce reçue pour l&rsquo;instant. Vos factures d&rsquo;achat, relevés
            et reçus arrivent ici dès que vous les transmettez.
          </p>
        ) : (
          <ul className="adherent__pieces">
            {pieces.slice(0, 5).map((piece) => (
              <LigneDeposee key={piece.identifiant} piece={piece} />
            ))}
          </ul>
        )}
        <p className="adherent__suite">
          <Link href="/mon-espace/justificatifs">Tous mes justificatifs, mois par mois</Link>
        </p>
      </section>

      {dossiers.length === 0 ? (
        <p className="adherent__vide">
          Aucun dossier ne vous est encore rattaché. Si vous venez de souscrire, le
          cabinet finalise l&rsquo;ouverture de votre dossier — vous n&rsquo;avez rien à
          faire.
        </p>
      ) : (
        dossiers
          .filter((dossier) => dossier.niu === principal)
          .map((dossier) => <FicheDossier key={dossier.niu} dossier={dossier} />)
      )}

      {principal && <OngletsAdherent actif="accueil" />}
    </main>
  );
}

function FicheDossier({ dossier }: { dossier: Dossier }) {
  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">{dossier.denomination}</h2>
      <dl className="adherent__faits">
        <Fait libelle="NIU" valeur={dossier.niu} />
        <Fait
          libelle="Régime fiscal"
          valeur={dossier.regime === "REEL" ? "Réel" : "Impôt libératoire"}
        />
        <Fait libelle="Centre de rattachement" valeur={dossier.centre} />
        <Fait
          libelle="TVA"
          valeur={dossier.assujettie_tva ? "Assujettie" : "Non assujettie"}
        />
        <Fait
          libelle="Adhésion au centre agréé"
          valeur={dossier.adherente ? "En cours" : "Non adhérente"}
        />
        {dossier.exercice_courant && (
          <Fait libelle="Exercice en cours" valeur={dossier.exercice_courant} />
        )}
      </dl>
      {/* Le régime est affiché tel que le backend l'a résolu **à aujourd'hui**.
          Il a pu être différent l'an dernier, et c'est ce que la fiche complète
          montrera le jour où elle existera. */}
      <p className="adherent__suite">
        <Link href="/mon-espace/entreprise">Mon entreprise, mon interlocuteur, signaler un changement</Link>
      </p>
      <p className="adherent__mention">
        Statuts résolus au jour d&rsquo;aujourd&rsquo;hui. Un régime change de date à
        date : celui-ci ne dit rien de vos exercices antérieurs.
      </p>
    </section>
  );
}

function Fait({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <>
      <dt className="adherent__fait-libelle">{libelle}</dt>
      <dd className="adherent__fait-valeur">{valeur}</dd>
    </>
  );
}

function LigneDeposee({ piece }: { piece: LignePiece }) {
  return (
    <li className="adherent__piece">
      <span className="adherent__piece-tete">
        <strong>{piece.reference_document ?? "Référence non encore lue"}</strong>
        <span className="adherent__piece-etat" data-attente={!piece.traitee}>
          {LIBELLES_ETAT[piece.etat]}
        </span>
      </span>
      <span className="adherent__piece-detail">
        {piece.emetteur ?? "Émetteur non encore identifié"}
        {piece.date_document ? ` · ${dateCourte(piece.date_document)}` : ""}
        {` · ${LIBELLES_CANAL[piece.canal]}`}
      </span>
      {piece.montant_ttc && (
        <span className="adherent__piece-montant tabulaire">
          {montantFcfa(Number(piece.montant_ttc))}
        </span>
      )}
    </li>
  );
}

/** Nombre d'échéances montrées : les prochaines, et les retards. Au-delà, le cabinet suit. */
const ECHEANCES_MONTREES = 6;

/**
 * E09 · Mes échéances (pas 81).
 *
 * Les obligations non encore déposées, en retard d'abord puis par date. Le retard et
 * les jours restants arrivent calculés par le backend : l'écran les montre sans
 * recompter. Un échéancier illisible s'annonce, il ne fait pas disparaître la page.
 */
function Echeances({ echeances }: { echeances: LigneEcheance[] | null }) {
  if (echeances === null) {
    return (
      <section className="adherent__section">
        <h2 className="adherent__titre">Mes échéances</h2>
        <p className="adherent__vide">Votre calendrier fiscal n&rsquo;est pas disponible pour l&rsquo;instant. Le cabinet le suit.</p>
      </section>
    );
  }
  const aVenir = echeances
    .filter((l) => !l.obligation.deposee)
    .sort((a, b) => Number(b.en_retard) - Number(a.en_retard) || a.obligation.echeance.localeCompare(b.obligation.echeance))
    .slice(0, ECHEANCES_MONTREES);
  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">Mes échéances</h2>
      {aVenir.length === 0 ? (
        <p className="adherent__vide">Aucune déclaration en attente sur l&rsquo;exercice en cours.</p>
      ) : (
        <ul className="adherent__liste">
          {aVenir.map((l) => (
            <li key={`${l.obligation.code_obligation}-${l.obligation.periode_debut}`}>
              <strong>{l.obligation.libelle}</strong>
              <span data-alerte={l.en_retard}>
                {l.en_retard
                  ? `En retard de ${Math.abs(l.jours_restants)} jour${Math.abs(l.jours_restants) > 1 ? "s" : ""}`
                  : `Avant le ${dateCourte(l.obligation.echeance)} · ${l.jours_restants} jour${l.jours_restants > 1 ? "s" : ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Pas 113 : la fiche de chaque échéance, et l'envoi de la preuve de paiement. */}
      <p className="adherent__suite">
        <Link href="/mon-espace/echeances">Toutes mes échéances, et envoyer une preuve de paiement</Link>
      </p>
    </section>
  );
}


/**
 * Le bandeau du mois (pas 112, vue B, note 1) : « la première chose lue, et ne dit qu'une chose ».
 *
 * Titre et texte arrivent rédigés par le backend. L'état change la couleur **et** le glyphe : la
 * couleur ne porte jamais seule l'information.
 */
function BandeauDuMois({ mois }: { mois: VueDuMois }) {
  const glyphe = { A_ENVOYER: "!", EN_VERIFICATION: "…", AUCUNE_PIECE: "＋", COMPLET: "✓" }[mois.bandeau.etat];
  return (
    <section className="adherent__bandeau" data-etat={mois.bandeau.etat} aria-labelledby="bandeau-titre">
      <span className="adherent__bandeau-glyphe" aria-hidden="true">
        {glyphe}
      </span>
      <div>
        <h2 id="bandeau-titre" className="adherent__bandeau-titre">
          {mois.bandeau.titre}
        </h2>
        <p className="adherent__bandeau-detail">{mois.bandeau.detail}</p>
        <a className="adherent__bandeau-action" href="#envoyer">
          ＋ Envoyer un justificatif
        </a>
      </div>
    </section>
  );
}

/**
 * Ce qu'on attend de vous (pas 112, vue B et vue C « Demande du cabinet », « Facture refusée »).
 *
 * Une facture à corriger dit **à qui** s'adresser : le fournisseur. « Le bouton principal d'une
 * pièce refusée agit sur le fournisseur, pas sur le cabinet : c'est là que se règle le problème. »
 * La réponse déjà envoyée est montrée : l'adhérent voit qu'elle est arrivée, sans rappeler.
 */
function CeQuOnAttend({ mois, reponses }: { mois: VueDuMois; reponses: ReglagesDesReponses }) {
  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">Ce qu&rsquo;on attend de vous</h2>
      <ul className="adherent__attendues">
        {mois.attendues.map((a) => (
          <li key={a.demande} className="adherent__attendue" data-corriger={a.a_corriger}>
            <strong>{a.a_corriger ? "Facture à corriger" : a.libelle}</strong>
            {a.a_corriger && <span>{a.libelle}</span>}
            <span data-alerte={a.en_retard}>
              {a.attendue_pour
                ? a.en_retard
                  ? `Attendue pour le ${dateCourte(a.attendue_pour)} : la date est passée`
                  : `Avant le ${dateCourte(a.attendue_pour)}`
                : `Demandée le ${dateCourte(a.demandee_le)}`}
            </span>
            {a.a_corriger && (
              <span className="adherent__consigne">
                Ce que vous devez faire : demandez à votre fournisseur une nouvelle facture corrigée,
                puis envoyez-la ici.
              </span>
            )}
            {a.bloquante && !a.a_corriger && (
              <span data-alerte="true">Sans elle, votre déclaration ne peut pas être déposée.</span>
            )}
            {a.reponse && a.reponse_le && (
              <span className="adherent__reponse-envoyee">
                Votre réponse du {dateCourte(a.reponse_le)} : {a.reponse}
              </span>
            )}
            <RepondreAuCabinet demande={a.demande} reponses={reponses.reponses} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Votre mois (pas 112, vue B, « Votre mois de juillet »). Le nombre de justificatifs toujours ; les
 * achats **seulement pour un mois revu**, avec la date où ils ont été arrêtés, et la mention
 * « montants indicatifs », permanente (vue B, note 4).
 */
function VotreMois({ mois }: { mois: VueDuMois }) {
  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">Votre mois {deMois(mois.nom_du_mois)}</h2>
      <dl className="adherent__faits">
        <Fait libelle="Justificatifs envoyés" valeur={String(mois.justificatifs_du_mois)} />
        <Fait
          libelle="Achats enregistrés"
          valeur={mois.achats !== null ? montantFcfa(Number(mois.achats)) : "après la revue du mois"}
        />
      </dl>
      <p className="adherent__mention">
        {mois.achats !== null && mois.achats_arretes_le
          ? `Montants indicatifs, arrêtés au ${dateCourte(mois.achats_arretes_le)}.`
          : "Montants indicatifs : ils s'affichent une fois le mois revu par le cabinet, pour ne jamais vous montrer un chiffre en cours de saisie."}
      </p>
    </section>
  );
}
