import type { Metadata } from "next";

import { Panneau } from "@/app/components/Tableau";
import { Chiffrage, EmissionProforma, PremierContact, Qualification, Reglement } from "@/app/components/acquisition/FicheDossier";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireTarifs } from "@/app/lib/souscription";
import { Link } from "@/i18n/navigation";
import {
  LIBELLES_ETAT,
  lireFicheDossier,
  lireLeLienDeLaProforma,
  lireLesCompositions,
  lireOuvertureDeLEspace,
  lireQualification,
  lireQuestionnaire,
  type CompositionOfferte,
  type OuvertureDeLEspace,
  type Questionnaire,
} from "@/app/lib/console-acquisition";
import { dateCourte } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";
import { lireDossierCreation, type FicheCreation } from "@/app/lib/creations";

export const metadata: Metadata = { title: "Dossier commercial · Plateforme CGA" };
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
  // ⚠️ Lue seulement quand le dossier est payé : avant l'encaissement, la saga
  // n'existe pas, et interroger pour rien coûte un aller-retour sur chaque
  // fiche commerciale ouverte.
  const ouverture = fiche.etat === "PAYEE" ? await lireOuvertureDeLEspace(reference) : null;
  // ⚠️ LE DOSSIER DE FORMALITÉ, depuis le 27 septembre : une création payée en
  // ouvre un toute seule, et le collaborateur n'avait aucun chemin vers lui.
  //
  // ⚠️ Lu seulement pour une CRÉATION payée : une adhésion n'en ouvre aucun, et
  // interroger pour rien coûterait un aller-retour sur chaque fiche.
  //
  // ⚠️ Son absence n'est PAS une erreur : il s'ouvre sur un événement publié
  // par le relais, donc quelques secondes plus tard. Le panneau dit lequel des
  // trois états on regarde, au lieu de lier vers une page qui rendrait 404.
  const formalite =
    fiche.etat === "PAYEE" && fiche.demande.service_souhaite === "CREATION"
      ? await lireDossierDeFormalite(`CRE-${reference}`)
      : null;
  // ⚠️ LE QUESTIONNAIRE PEUT MANQUER, ET LA FICHE DOIT TENIR.
  //
  // Tout service n'en a pas : `FORMATION`, `DOMICILIATION` et `PONCTUEL`
  // n'en ont aucun au référentiel, et un dossier déposé avant le renommage du
  // 27 septembre porte encore `creation-sarl`. Le 404 remontait jusqu'ici et
  // faisait rendre **500** à la fiche entière : le collaborateur voyait une
  // page d'erreur au lieu du dossier de son client, sans rien apprendre.
  //
  // Le panneau de qualification dit maintenant pourquoi il est vide, et le
  // reste de la fiche — la demande, les proformas, le règlement — s'affiche.
  const [questionnaire, qualification] = await Promise.all([
    lireQuestionnaireSiPublie(fiche.demande.service_souhaite),
    // ⚠️ Elle rend 404 pour la même raison : sans questionnaire, il n'y a rien à
    // qualifier. Les deux vont ensemble, et se taisent ensemble.
    lireQualificationSiPossible(reference),
  ]);
  const peutQualifier = detient(acces, "QUALIFIER_PROSPECT");
  const termine = ["ACCEPTEE", "PAYEE", "SANS_SUITE"].includes(fiche.etat);
  const d = fiche.demande;
  const acceptee = fiche.proformas.find((p) => p.etat === "ACCEPTEE") ?? null;

  // ─────────────────────────────────────────────────────────────────────────
  // ⚠️ LE LIEN DE LA PROFORMA, RELU POUR POUVOIR LE RENVOYER.
  //
  // Il n'était rendu qu'à l'émission, et `EmissionProforma` le gardait dans
  // l'état de son composant : au premier rechargement, le bouton « Envoyer sur
  // WhatsApp » disparaissait pour toujours. Vérifié le 29 septembre sur sept
  // dossiers réels en PROFORMA_EMISE : aucun ne l'affichait.
  //
  // ⚠️ Lu seulement dans cet état, et seulement par qui peut chiffrer : le lien
  // est un PORTEUR — qui l'a, peut accepter à la place du client. La fiche du
  // dossier ne le rend pas, et c'est délibéré depuis le pas 78.
  //
  // ⚠️ Son absence n'est pas une erreur : un lecteur sans l'habilitation reçoit
  // 403, et le panneau le dit au lieu de tomber.
  // ─────────────────────────────────────────────────────────────────────────
  // ⚠️ LE PRIX ARRÊTÉ PAR LA DIRECTION, POUR LES SERVICES SANS QUESTIONNAIRE.
  //
  // `FORMATION` et `DOMICILIATION` n'ont rien à qualifier : leur prix est une
  // décision, pas un calcul. Le panneau de chiffrage ne s'ouvrait pourtant que
  // sur une qualification, et ces dossiers restaient sans issue.
  //
  // ⚠️ Lu seulement quand il n'y a PAS de questionnaire : pour une création, le
  // prix vient du barème et cet appel ne servirait à rien.
  const prixArrete =
    !questionnaire && peutQualifier
      ? await lirePrixArreteSiPossible(d.service_souhaite)
      : null;
  // Les documents proposables, lus seulement quand le panneau d'émission s'ouvre.
  const compositions =
    (fiche.etat === "CHIFFREE" && peutQualifier) || fiche.etat === "PROFORMA_EMISE"
      ? await lireLesCompositionsSiPossible(d.service_souhaite)
      : [];
  const derniereProforma = fiche.proformas.at(-1) ?? null;
  const lienRelu =
    fiche.etat === "PROFORMA_EMISE" && peutQualifier && derniereProforma
      ? await lireLienSiPossible(derniereProforma.numero)
      : null;

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
            {/* ⚠️ Le NOM, et non « C-007 » : la liste d'où l'on vient l'affiche déjà. */}
            {fiche.responsable_nom ? ` · suivi par ${fiche.responsable_nom}` : ""}
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

        {/* ─────────────────────────────────────────────────────────────────
            ⚠️ LE GESTE QUI MANQUAIT : « j'ai joint le client ».

            Le seul chemin vers EN_CONVERSATION passait par la qualification. Un
            responsable qui appelait sans pouvoir qualifier laissait le dossier
            AFFECTÉE, et la veille le réaffectait à un collègue qui rappelait le
            même client. Et les services sans questionnaire n'en sortaient
            jamais, donc ne se vendaient jamais.
            ───────────────────────────────────────────────────────────────── */}
        {peutQualifier && fiche.etat === "AFFECTEE" && (
          <Panneau
            titre="Premier échange"
            aide="Déclarez-le dès que vous avez joint le client, même sans réponse de sa part : c'est ce qui arrête le compte à rebours de la réaffectation."
          >
            <PremierContact reference={reference} />
          </Panneau>
        )}

        <Panneau
          titre="Qualification"
          aide={
            questionnaire && qualification
              ? `${qualification.avancement.repondues} réponse(s) sur ${qualification.avancement.total} · questionnaire ${questionnaire.service}, version ${questionnaire.version}`
              : "Aucun questionnaire au référentiel pour ce service."
          }
        >
          {questionnaire && qualification ? (
            <Qualification
              reference={reference}
              questions={questionnaire.questions}
              faits={qualification.faits ?? {}}
              manquantes={qualification.manquantes}
              modifiable={peutQualifier && !termine}
            />
          ) : (
            <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)" }}>
              Le service «&nbsp;{d.service_souhaite}&nbsp;» n&rsquo;a pas de questionnaire au
              référentiel : il n&rsquo;y a rien à qualifier. S&rsquo;il a un prix arrêté par la
              direction, le dossier se chiffre à ce prix et la proforma s&rsquo;émet
              normalement ; sinon, il faut soit fixer ce prix, soit ajouter un
              questionnaire au référentiel.
            </p>
          )}
        </Panneau>

        {/* ⚠️ Sans questionnaire, il n'y a rien à chiffrer : le panneau se tait
            plutôt que d'offrir un geste qui ne peut pas aboutir. */}
        {peutQualifier && prixArrete && !termine && (
          <Panneau
            titre="Chiffrage"
            aide={`Prix arrêté par la direction : ${prixArrete} FCFA. Il n'y a rien à calculer, et rien à qualifier.`}
          >
            <Chiffrage reference={reference} />
          </Panneau>
        )}

        {peutQualifier && qualification && (
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

        {/*
          ⚠️ UN SEUL PANNEAU POUR « CHIFFRÉE » ET « PROFORMA ÉMISE », À LA MÊME PLACE.
          L'émission rafraîchit la page, et le dossier passe à PROFORMA_EMISE. Deux
          panneaux distincts démontaient le formulaire à ce moment précis : le lien
          d'acceptation, que le serveur ne rend qu'une fois, disparaissait de l'écran
          avant que le responsable ait pu l'envoyer. Le même composant, à la même
          place, garde son état au rafraîchissement.
        */}
        {((fiche.etat === "CHIFFREE" && peutQualifier) || fiche.etat === "PROFORMA_EMISE") && (
          <Panneau
            titre="Proforma"
            aide="Le prix que vous arrêtez après l'échange. Hors de l'intervalle recalculé, un motif est exigé."
          >
            <EmissionProforma
              reference={reference}
              referenceProposee={null}
              dejaEmise={fiche.etat === "PROFORMA_EMISE"}
              lienRelu={lienRelu}
              compositions={compositions}
              client={{
                nom: d.nom,
                telephone: d.telephone,
                courriel: d.courriel,
                whatsapp: Boolean(d.consentement?.accorde && !d.consentement.revoque_le),
              }}
            />
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
          <Panneau titre="Règlement" aide="Encaissé. L'état réel de l'espace est dit ci-dessous.">
            <p style={{ margin: 0, padding: "12px 16px 4px", font: "400 13px/1.5 var(--police-texte)" }}>
              Payé{fiche.payee_le ? ` le ${dateCourte(fiche.payee_le.slice(0, 10))}` : ""}
              {fiche.slug_retenu ? ` · espace « ${fiche.slug_retenu} »` : ""}.
            </p>
            <EtatDeLOuverture ouverture={ouverture} />
            {fiche.demande.service_souhaite === "CREATION" && (
              <EtatDeLaFormalite formalite={formalite} reference={reference} />
            )}
          </Panneau>
        )}
      </div>
    </>
  );
}

/**
 * Le dossier de formalité, ou `null` s'il n'est pas encore ouvert.
 *
 * ⚠️ Un 404 n'est pas une panne ici : le dossier s'ouvre sur un événement, donc
 * quelques secondes après l'encaissement. Laisser remonter l'erreur ferait
 * planter la fiche commerciale entière pour une course de quelques secondes.
 */
/**
 * Où en est la formalité, du point de vue de CELUI QUI REGARDE.
 *
 * ⚠️ TROIS RÉPONSES, ET NON DEUX, PARCE QUE DEUX MENTIRAIENT.
 *
 * Rendre `null` sur un 404 comme sur un 403 ferait dire « le dossier n'est pas
 * encore ouvert » à un collaborateur qui, simplement, ne suit pas les
 * formalités. C'est faux, et c'est le genre de fausseté qui fait attendre
 * quelqu'un devant un écran, puis appeler.
 */
type EtatDeLaFormalite =
  | { readonly etat: "ouvert"; readonly dossier: FicheCreation }
  | { readonly etat: "pas-encore" }
  | { readonly etat: "non-habilite" };

async function lireDossierDeFormalite(reference: string): Promise<EtatDeLaFormalite> {
  try {
    return { etat: "ouvert", dossier: await lireDossierCreation(reference) };
  } catch (echec: unknown) {
    // ⚠️ 404 : le dossier n'est pas encore ouvert — il part sur un événement.
    // ⚠️ 403 : SUIVRE_FORMALITE manque à ce compte. La fiche commerciale ne lui
    //    est pas fermée pour autant : elle se tait sur la formalité, et le dit.
    //    Sans cette reprise, ouvrir la fiche d'un dossier payé rendait **500** à
    //    tous ceux qui ne suivent pas les formalités — la direction comprise.
    if (echec instanceof ErreurApi && echec.statut === 404) return { etat: "pas-encore" };
    if (echec instanceof ErreurApi && echec.statut === 403) return { etat: "non-habilite" };
    throw echec;
  }
}

/** Le questionnaire du service, ou `null` si le référentiel n'en publie pas. */
async function lireQuestionnaireSiPublie(service: string): Promise<Questionnaire | null> {
  try {
    return await lireQuestionnaire(service);
  } catch (echec: unknown) {
    if (echec instanceof ErreurApi && echec.statut === 404) return null;
    throw echec;
  }
}

/** L'avancement de la qualification, ou `null` s'il n'y a rien à qualifier. */
async function lireQualificationSiPossible(reference: string) {
  try {
    return await lireQualification(reference);
  } catch (echec: unknown) {
    if (echec instanceof ErreurApi && echec.statut === 404) return null;
    throw echec;
  }
}

/**
 * Le lien de la proforma, ou `null` si ce lecteur n'y a pas droit.
 *
 * ⚠️ **403 ET 404 SE TAISENT, LE RESTE REMONTE.** Le lien demande
 * `QUALIFIER_PROSPECT` : un chargé de clientèle l'obtient, un comptable non. Ce
 * n'est pas une panne, c'est le cloisonnement qui fonctionne, et faire tomber la
 * fiche entière priverait le comptable de tout le reste du dossier — le défaut
 * exact corrigé le 28 septembre sur le dossier de formalité.
 *
 * Une erreur de réseau, elle, doit se voir : la taire ferait croire à une
 * habilitation manquante là où le serveur ne répond pas.
 */
/**
 * Le prix que la direction a arrêté pour ce service, ou `null`.
 *
 * ⚠️ **`null` DÈS QU'IL Y A UN DOUTE.** Un tarif encore `A_VALIDER` vient de la
 * maquette de la vitrine : personne au cabinet ne l'a fixé, et le proposer au
 * chiffrage ferait facturer un prix que nul n'a décidé. Le serveur tient la même
 * garde ; celle-ci n'existe que pour ne pas ouvrir un panneau qui échouerait.
 */
async function lirePrixArreteSiPossible(service: string): Promise<string | null> {
  try {
    const etat = await lireTarifs(new Date().toISOString().slice(0, 10));
    const ligne = etat.lignes.find((l) => l.service === service && l.statut === "FIXE");
    return ligne?.montant ?? null;
  } catch (echec: unknown) {
    if (echec instanceof ErreurApi) return null;
    throw echec;
  }
}

/**
 * Les documents proposables pour ce service (pas 148).
 *
 * ⚠️ Tolérante comme ses voisines : un référentiel absent ou une habilitation
 * courte rend une liste vide, et le formulaire propose alors « aucun document ».
 * L'émission reste possible, elle produit seulement l'empreinte du résumé. Faire
 * échouer la page entière pour un menu déroulant serait disproportionné.
 */
async function lireLesCompositionsSiPossible(service: string): Promise<CompositionOfferte[]> {
  try {
    return await lireLesCompositions(service);
  } catch (echec: unknown) {
    if (echec instanceof ErreurApi) return [];
    throw echec;
  }
}

async function lireLienSiPossible(numero: string) {
  try {
    return await lireLeLienDeLaProforma(numero);
  } catch (echec: unknown) {
    if (echec instanceof ErreurApi && (echec.statut === 403 || echec.statut === 404)) return null;
    throw echec;
  }
}

/**
 * Où en est la société que le client vient de payer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ TROIS ÉTATS, ET AUCUN N'EST UN LIEN POSÉ À L'AVEUGLE.
 *
 * Le client a payé pour une société immatriculée. Le dossier de formalité
 * s'ouvre tout seul à l'encaissement — mais il s'ouvre par un événement, donc
 * avec quelques secondes de retard, et il ne s'ouvre **pas du tout** si un fait
 * fondateur manquait à la qualification.
 *
 * Un lien posé sans vérifier mènerait tantôt à la fiche, tantôt à un 404 que le
 * collaborateur interpréterait comme une panne. Le panneau dit donc lequel des
 * trois cas on regarde, et ce qu'il y a à faire dans le troisième.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function EtatDeLaFormalite({
  formalite,
  reference,
}: {
  formalite: EtatDeLaFormalite | null;
  reference: string;
}) {
  const style = { margin: 0, padding: "4px 16px 12px", font: "400 13px/1.5 var(--police-texte)" };
  if (formalite === null || formalite.etat === "non-habilite") {
    return (
      <p style={style}>
        Le suivi de la formalité demande l&rsquo;habilitation «&nbsp;suivre les
        formalités&nbsp;». Un chargé de formalités vous dira où en est
        l&rsquo;immatriculation.
      </p>
    );
  }
  if (formalite.etat === "pas-encore") {
    return (
      <p style={style}>
        ⏳ Le dossier de formalité s&rsquo;ouvre dans les secondes qui suivent
        l&rsquo;encaissement. S&rsquo;il tarde, c&rsquo;est qu&rsquo;un fait manquait à la
        qualification, le journal d&rsquo;exploitation le nomme, et le dossier est
        alors à ouvrir à la main.
      </p>
    );
  }
  return (
    <p style={style}>
      ✅ Dossier de formalité ouvert pour «&nbsp;
      {formalite.dossier.dossier.denomination_souhaitee}&nbsp;».{" "}
      <Link href={`/creation-entreprise/CRE-${reference}`}>Suivre l&rsquo;immatriculation</Link>
    </p>
  );
}

/**
 * Ce que l'ouverture a réellement fait, dit sans détour.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE BLOC EXISTE PARCE QUE L'ÉCRAN MENTAIT PAR OMISSION.
 *
 * Il annonçait « Payé · espace « client » » et s'arrêtait là. Or la saga
 * d'ouverture peut se terminer avec des étapes **substituées** — le tenant
 * existe, son sous-domaine répond, et le client n'a ni schéma, ni stockage, ni
 * compte administrateur, donc **ni identifiant ni lien d'activation**.
 *
 * Le serveur le sait et l'inscrit depuis toujours ; c'est l'écran qui ne le
 * demandait pas. Le chargé de clientèle raccrochait en disant au client que son
 * espace était ouvert, et le client le découvrait à sa première connexion.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function EtatDeLOuverture({ ouverture }: { ouverture: OuvertureDeLEspace | null }) {
  const base: React.CSSProperties = {
    margin: "0 16px 14px",
    padding: "10px 12px",
    borderRadius: "var(--rayon-petit)",
    font: "400 12.5px/1.6 var(--police-texte)",
  };

  if (!ouverture || !ouverture.demarree) {
    return (
      <p style={{ ...base, background: "var(--surface-alt)", color: "var(--ink-500)" }}>
        {/* ⚠️ Ce n'est PAS une erreur : l'ouverture part sur un événement publié
            toutes les cinq secondes. Annoncer un problème ici ferait douter le
            collaborateur d'un geste qu'il vient de réussir. */}
        ⏳ L&rsquo;ouverture de l&rsquo;espace n&rsquo;a pas encore démarré. Elle part dans les
        secondes qui suivent le règlement ; revenez sur cette fiche pour en voir l&rsquo;issue.
      </p>
    );
  }

  if (ouverture.utilisable) {
    return (
      <p style={{ ...base, background: "var(--success-100)", color: "var(--ink-900)" }}>
        <strong style={{ color: "var(--success)" }}>✓ Espace ouvert et utilisable.</strong> Le
        compte administrateur existe et son lien d&rsquo;activation est parti à l&rsquo;adresse du
        client.
      </p>
    );
  }

  if (!ouverture.terminee) {
    return (
      <p style={{ ...base, background: "var(--warning-100)", color: "var(--ink-900)" }}>
        <strong style={{ color: "var(--warning)" }}>△ Ouverture en cours.</strong> Ne promettez
        pas encore l&rsquo;accès au client.
        {ouverture.dernier_echec ? ` Dernier incident : ${ouverture.dernier_echec}` : ""}
      </p>
    );
  }

  // Terminée, et pas utilisable : le cas qu'il fallait rendre visible.
  const manqueLeCompte = ouverture.etapes_substituees.includes("ADMINISTRATEUR_CREE");
  return (
    <p style={{ ...base, background: "var(--danger-100)", color: "var(--ink-900)" }}>
      <strong style={{ color: "var(--danger)" }}>
        ⬣ L&rsquo;espace existe, mais il n&rsquo;est pas utilisable.
      </strong>{" "}
      {manqueLeCompte
        ? "Le client n'a ni identifiant ni lien d'activation : ne lui annoncez pas que son espace est ouvert."
        : "Une partie de l'ouverture n'a rien fait."}{" "}
      Étapes sans effet : {ouverture.etapes_substituees.join(", ")}. À reprendre par
      l&rsquo;administration avant de prévenir le client.
    </p>
  );
}
