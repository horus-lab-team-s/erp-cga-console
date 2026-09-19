import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { ReinitialiserSecondFacteur } from "@/app/components/securite/ReinitialiserSecondFacteur";
import { InvitationCollaborateur, RetablirCompte, SuspendreCompte } from "@/app/components/administration/GestesComptes";
import {
  ConfierUnDossier,
  FermerLesSessions,
  FermerUneHabilitation,
} from "@/app/components/administration/GestesHabilitations";
import { AccorderUnMandat, RevoquerUnMandat } from "@/app/components/administration/GestesMandats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { LIBELLES_ROLE, detient } from "@/app/lib/acces";
import {
  lireAudit,
  lireComptes,
  lireMandats,
  lireRoles,
  verifierChaine,
  type LigneCompte,
} from "@/app/lib/administration";
import { LIBELLES_MOTIF_MANDAT, type MandatAccorde } from "@/app/lib/mandats";
import { dateCourte } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Comptes et habilitations — Plateforme CGA" };

/**
 * E-K01 · Les comptes, leurs habilitations, et le journal d'audit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES RÔLES SONT RÉSOLUS À UNE DATE, ET L'ÉCRAN LE DIT
 *
 * La question qu'un contrôle pose n'est jamais « qui est comptable » mais « qui
 * était habilité le 12 mars, jour de ce dépôt ». Les rôles affichés sont ceux du
 * jour ; un collaborateur parti apparaît sans rôle, et son compte demeure —
 * parce que son identifiant figure dans les écritures qu'il a validées.
 *
 * TROIS SIGNAUX QUE CET ÉCRAN EXISTE POUR MONTRER
 *
 * Un compte **jamais activé** — créé, lien parti, mot de passe jamais défini.
 * C'est l'état le plus fréquent en production, et celui qu'on oublie de traiter.
 *
 * Un compte **habilité sans dossier** — ni erreur, ni état normal : du travail
 * qui n'a été confié à personne.
 *
 * Une **chaîne d'audit rompue** — et le rang exact où elle l'est.
 *
 * ⚠️ LES GESTES, ET CE QUI LES BORNE
 *
 * Réinitialiser le second facteur d'un collaborateur (pas 61), inviter un
 * collaborateur et suspendre un compte (pas 69), confier un dossier, fermer une
 * habilitation et fermer les sessions d'un compte (pas 70). Aucun geste qui retire
 * un accès ne s'applique à son propre compte, et aucun ne renvoie de secret.
 *
 * Les gestes irréversibles (suspendre, fermer une habilitation) exigent une case ;
 * une confirmation bâclée sur ces gestes-là vaudrait moins que pas de bouton du tout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COMPTES: Colonne[] = [
  { cle: "nom", libelle: "Collaborateur", largeur: "minmax(0, 1.5fr)" },
  { cle: "courriel", libelle: "Adresse", largeur: "minmax(0, 1.6fr)" },
  { cle: "roles", libelle: "Rôles au jour", largeur: "minmax(0, 1.4fr)" },
  { cle: "dossiers", libelle: "Périmètre", largeur: "132px", aDroite: true },
  { cle: "facteur", libelle: "2ᵉ facteur", largeur: "150px" },
  { cle: "etat", libelle: "État", largeur: "200px" },
];

const MANDATS: Colonne[] = [
  { cle: "mandataire", libelle: "Locataire mandaté", largeur: "minmax(0, 1.2fr)" },
  { cle: "roles", libelle: "Rôles autorisés", largeur: "minmax(0, 1.4fr)" },
  { cle: "comptes", libelle: "Comptes désignés", largeur: "minmax(0, 1.2fr)" },
  { cle: "periode", libelle: "Période", largeur: "minmax(0, 1fr)" },
  { cle: "titre", libelle: "À quel titre", largeur: "minmax(0, 1fr)" },
  { cle: "etat", libelle: "État", largeur: "240px" },
];

const HABILITATIONS: Colonne[] = [
  { cle: "nom", libelle: "Collaborateur", largeur: "minmax(0, 1.3fr)" },
  { cle: "role", libelle: "Rôle", largeur: "minmax(0, 1fr)" },
  { cle: "portee", libelle: "Dossiers", largeur: "minmax(0, 1.6fr)" },
  { cle: "intervalle", libelle: "Depuis", largeur: "150px" },
  { cle: "gestes", libelle: "", largeur: "minmax(0, 1.6fr)" },
];

const AUDIT: Colonne[] = [
  { cle: "rang", libelle: "#", largeur: "56px", aDroite: true },
  { cle: "horodatage", libelle: "Horodatage", largeur: "150px" },
  { cle: "acteur", libelle: "Acteur", largeur: "104px" },
  { cle: "action", libelle: "Action", largeur: "minmax(0, 1.3fr)" },
  { cle: "objet", libelle: "Objet", largeur: "minmax(0, 1.2fr)" },
  // Pas 130 : la colonne qui distingue « quelqu'un d'ici » de « quelqu'un d'ailleurs,
  // à ce titre ». Sans elle, le champ existait en base et ne se lisait nulle part.
  { cle: "titre", libelle: "À quel titre", largeur: "minmax(0, 0.9fr)" },
];

export default async function Comptes() {
  const acces = await exigerAcces();
  // ⚠️ Le garde est **avant** tout appel. Sans lui, `lireComptes` recevait un
  // 403 de l'API, l'erreur remontait, et le visiteur voyait un 500 — « le
  // logiciel est cassé » au lieu de « ce n'est pas pour vous ».
  if (!detient(acces, "GERER_COMPTES")) {
    return (
      <EcranReserve
        titre="Comptes et habilitations"
        permission="GERER_COMPTES"
        acces={acces}
      />
    );
  }
  const jour = aujourdhui();
  const [comptes, roles, entrees, verification, mandats] = await Promise.all([
    lireComptes(jour),
    lireRoles(),
    lireAudit(),
    verifierChaine(),
    lireMandats(),
  ]);

  // ⚠️ Les rôles internes seulement : l'accès d'un adhérent s'ouvre par sa souscription,
  // et celui d'un inspecteur ne se donne pas par une invitation de collaborateur.
  const rolesInvitables = roles
    .map((r) => r.role)
    .filter((r) => r !== "ADHERENT" && r !== "INSPECTEUR");
  const dossiers = detient(acces, "LIRE_DOSSIER")
    ? (await lireDossiers(jour)).map((d) => ({ niu: d.niu, denomination: d.denomination }))
    : null;

  const affecte = detient(acces, "AFFECTER_DOSSIER");

  // ⚠️ Compté sur le journal, pas sur les mandats. Un mandat accordé dit ce qui est
  // **permis** ; le journal dit ce qui a été **fait**, et c'est l'écart entre les deux
  // qu'un adhérent inquiet vient chercher.
  const interventions = entrees.filter((e) => e.mandat !== null);
  const mandatsExerces = new Set(interventions.map((e) => e.mandat)).size;

  const jamaisActives = comptes.filter(
    (l) => l.compte.etat === "EN_ATTENTE_ACTIVATION",
  );
  const sansDossier = comptes.filter((l) => l.sans_dossier && l.roles.length > 0);

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Comptes et habilitations" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Comptes et habilitations</h1>
          <p>
            {comptes.length} comptes · rôles résolus au {dateCourte(jour)} ·{" "}
            {roles.length} rôles au catalogue
            {mandats.length > 0 && (
              <>
                {" · "}
                {mandats.filter((m) => m.en_vigueur).length} mandat
                {mandats.filter((m) => m.en_vigueur).length > 1 ? "s" : ""} en vigueur
              </>
            )}
            {interventions.length > 0 && (
              <>
                {" · "}
                {interventions.length} action
                {interventions.length > 1 ? "s" : ""} exercée
                {interventions.length > 1 ? "s" : ""} sous {mandatsExerces} mandat
                {mandatsExerces > 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>

        {!verification.intacte && (
          <div className="avertissement-ecran" role="alert">
            <strong>Le journal d&rsquo;audit ne se vérifie plus.</strong>
            {verification.rupture}
          </div>
        )}

        {(jamaisActives.length > 0 || sansDossier.length > 0) && (
          <div className="avertissement-ecran avertissement-ecran--reserve">
            {jamaisActives.length > 0 && (
              <span style={{ display: "block" }}>
                <strong style={{ display: "inline", fontWeight: 600 }}>
                  {jamaisActives.length} compte
                  {jamaisActives.length > 1 ? "s" : ""} jamais activé
                  {jamaisActives.length > 1 ? "s" : ""}.
                </strong>{" "}
                Le lien de définition du mot de passe est parti, personne ne l&rsquo;a
                suivi. Ni actif, ni inexistant.
              </span>
            )}
            {sansDossier.length > 0 && (
              <span style={{ display: "block", marginTop: 4 }}>
                <strong style={{ display: "inline", fontWeight: 600 }}>
                  {sansDossier.length} collaborateur
                  {sansDossier.length > 1 ? "s" : ""} sans dossier affecté.
                </strong>{" "}
                Habilité, mais son périmètre est vide : du travail qui n&rsquo;a été
                confié à personne.
              </span>
            )}
          </div>
        )}

        <Panneau
          titre="Inviter"
          aide="Crée le compte et son habilitation ; le lien d'activation part au collaborateur."
        >
          <InvitationCollaborateur roles={rolesInvitables} dossiers={dossiers} aujourdhui={jour} />
        </Panneau>

        <Panneau
          titre="Comptes"
          aide="Un compte n'est jamais supprimé : son identifiant figure dans les écritures qu'il a validées et dans le journal d'audit. Un collaborateur qui part est suspendu."
        >
          <EnteteTableau colonnes={COMPTES} />
          {comptes.map((ligne, rang) => (
            <Ligne key={ligne.compte.identifiant} ligne={ligne} rang={rang} soi={acces.compte} />
          ))}
        </Panneau>

        <Panneau
          titre="Mandats accordés"
          aide="Ce que ce cabinet a ouvert à d'autres locataires. Un mandat n'accorde aucun rôle : il autorise l'exercice, ici, de rôles déjà tenus ailleurs. Les mandats retirés restent affichés, parce qu'un retrait se relit."
        >
          <AccorderUnMandat roles={rolesInvitables} aujourdhui={jour} />
          {mandats.length === 0 ? (
            <EtatVide
              titre="Aucun mandat accordé"
              detail="Personne d'autre que ce cabinet n'agit sur ses données."
            />
          ) : (
            <>
              <EnteteTableau colonnes={MANDATS} />
              {mandats.map((mandat, rang) => (
                <LigneMandat key={mandat.identifiant} mandat={mandat} rang={rang} />
              ))}
            </>
          )}
        </Panneau>

        <Panneau
          titre="Habilitations du jour"
          aide="Un rôle, un périmètre, un intervalle. Confier un dossier vaut à compter d'aujourd'hui : l'historique antérieur n'est pas réécrit."
        >
          <EnteteTableau colonnes={HABILITATIONS} />
          {comptes
            .flatMap((l) => l.habilitations.map((h) => ({ h, compte: l.compte })))
            .map(({ h, compte }, rang) => (
              <LigneTableau key={h.identifiant} colonnes={HABILITATIONS} ton={rang % 2 ? "alterne" : "normal"}>
                <Cellule gras>{compte.nom_complet}</Cellule>
                <Cellule>{LIBELLES_ROLE[h.role]}</Cellule>
                <Cellule couleur="var(--ink-500)" titre={h.portee?.join(", ") ?? ""}>
                  {h.portee === null ? "tout le cabinet" : h.portee.length ? h.portee.join(", ") : "aucun dossier"}
                </Cellule>
                <Cellule tabulaire couleur="var(--ink-500)">
                  {dateCourte(h.debut)}
                  {h.fin ? ` → ${dateCourte(h.fin)}` : ""}
                </Cellule>
                <Cellule>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                    {/* ⚠️ Masqué quand le refus est certain ; le backend reste juge des autres. */}
                    {affecte && !h.transverse && h.role !== "ADHERENT" && h.role !== "INSPECTEUR" && (
                      <ConfierUnDossier habilitation={h.identifiant} />
                    )}
                    {h.compte !== acces.compte && (
                      <FermerUneHabilitation
                        habilitation={h.identifiant}
                        libelle={`${LIBELLES_ROLE[h.role]} de ${compte.nom_complet}`}
                        aujourdhui={jour}
                      />
                    )}
                  </span>
                </Cellule>
              </LigneTableau>
            ))}
        </Panneau>

        <Panneau
          titre="Journal d'audit"
          aide="Append-only et chaîné par hachage. Modifier une entrée ancienne invalide toutes les suivantes — la falsification devient détectable."
        >
          {entrees.length === 0 ? (
            <EtatVide
              titre="Journal vierge"
              detail="Aucune action n'a encore été journalisée. Un historique fabriqué produirait une chaîne qui n'atteste de rien."
            />
          ) : (
            <>
              <EnteteTableau colonnes={AUDIT} />
              {entrees
                .slice(-40)
                .reverse()
                .map((entree) => (
                  <LigneTableau key={entree.rang} colonnes={AUDIT}>
                    <Cellule aDroite tabulaire couleur="var(--ink-500)">
                      {entree.rang}
                    </Cellule>
                    <Cellule tabulaire couleur="var(--ink-500)">
                      {entree.horodatage.replace("T", " ").slice(0, 19)}
                    </Cellule>
                    <Cellule tabulaire>{entree.acteur}</Cellule>
                    <Cellule gras titre={entree.motif ?? undefined}>
                      {entree.action}
                    </Cellule>
                    <Cellule couleur="var(--ink-500)" titre={entree.objet_id ?? ""}>
                      {entree.objet_type}
                      {entree.objet_id ? ` · ${entree.objet_id}` : ""}
                    </Cellule>
                    {/* ⚠️ « chez lui » est écrit, et non laissé vide. Une colonne vide se
                        lit comme une donnée manquante ; ici l'absence de mandat est une
                        information, et c'est même la plus fréquente. */}
                    <Cellule
                      couleur={entree.mandat ? "var(--ink-900)" : "var(--ink-500)"}
                      titre={entree.mandat ?? undefined}
                    >
                      {entree.mandat ? `mandat ${entree.mandat}` : "chez lui"}
                    </Cellule>
                  </LigneTableau>
                ))}
            </>
          )}
        </Panneau>
      </div>
    </>
  );
}

function Ligne({
  ligne,
  rang,
  soi,
}: {
  ligne: LigneCompte;
  rang: number;
  /** L'identifiant du compte connecté : il ne reçoit pas le bouton de réinitialisation. */
  soi: string;
}) {
  const suspendu = ligne.compte.etat === "SUSPENDU";
  const enAttente = ligne.compte.etat === "EN_ATTENTE_ACTIVATION";
  return (
    <LigneTableau colonnes={COMPTES} ton={rang % 2 ? "alterne" : "normal"}>
      <Cellule gras>{ligne.compte.nom_complet}</Cellule>
      <Cellule couleur="var(--ink-500)" titre={ligne.compte.courriel}>
        {ligne.compte.courriel}
      </Cellule>
      {/* Aucun rôle au jour ne veut pas dire « compte vide » : c'est souvent une
          habilitation fermée, et l'historique la conserve. */}
      <Cellule couleur={ligne.roles.length ? undefined : "var(--ink-500)"}>
        {ligne.roles.map((r) => LIBELLES_ROLE[r]).join(", ") || "aucun à cette date"}
      </Cellule>
      <Cellule aDroite tabulaire couleur="var(--ink-500)">
        {ligne.dossiers === null
          ? "tout le cabinet"
          : `${ligne.dossiers.length} dossier${ligne.dossiers.length > 1 ? "s" : ""}`}
      </Cellule>
      <Cellule couleur={ligne.compte.second_facteur_actif ? undefined : "var(--ink-500)"}>
        {ligne.compte.second_facteur_actif ? "Enrôlé" : "—"}
        {ligne.compte.second_facteur_actif && ligne.compte.identifiant !== soi && (
          <ReinitialiserSecondFacteur
            identifiant={ligne.compte.identifiant}
            nom={ligne.compte.nom_complet}
          />
        )}
      </Cellule>
      <Cellule
        couleur={
          suspendu ? "var(--danger)" : enAttente ? "var(--ink-500)" : "var(--ink-900)"
        }
      >
        {suspendu ? "Suspendu" : enAttente ? "Jamais activé" : "Actif"}
        {!suspendu && ligne.compte.identifiant !== soi && (
          <SuspendreCompte identifiant={ligne.compte.identifiant} nom={ligne.compte.nom_complet} />
        )}
        {/* Pas 91 : la levée de suspension a sa route. */}
        {suspendu && <RetablirCompte identifiant={ligne.compte.identifiant} />}
        {ligne.compte.etat === "ACTIF" && ligne.compte.identifiant !== soi && (
          <FermerLesSessions identifiant={ligne.compte.identifiant} />
        )}
      </Cellule>
    </LigneTableau>
  );
}


/**
 * Une ligne de mandat.
 *
 * ⚠️ **Les mandats retirés et expirés restent affichés**, en retrait. Un mandat retiré
 * est une trace : c'est la première chose qu'un litige demande, et une liste qui ne
 * montrerait que les mandats en vigueur donnerait l'impression qu'il n'y en a jamais eu
 * d'autre.
 */
function LigneMandat({ mandat, rang }: { mandat: MandatAccorde; rang: number }) {
  const retire = mandat.revoque_le !== null;
  const eteint = !mandat.en_vigueur;
  return (
    <LigneTableau colonnes={MANDATS} ton={rang % 2 ? "alterne" : "normal"}>
      <Cellule gras couleur={eteint ? "var(--ink-500)" : undefined}>
        {mandat.mandataire}
      </Cellule>
      <Cellule couleur={eteint ? "var(--ink-500)" : undefined}>
        {mandat.roles.map((r) => LIBELLES_ROLE[r]).join(", ")}
      </Cellule>
      {/* ⚠️ « tous les comptes » et « aucun » ne se confondent pas : `null` ouvre à tout
          le monde chez le mandataire, et c'est l'inverse de ce qu'une liste vide
          laisserait croire. */}
      <Cellule couleur="var(--ink-500)" titre={mandat.comptes?.join(", ") ?? ""}>
        {mandat.comptes === null ? "tous ses comptes" : mandat.comptes.join(", ")}
      </Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">
        {dateCourte(mandat.debut)}
        {mandat.fin ? ` → ${dateCourte(mandat.fin)}` : ""}
      </Cellule>
      <Cellule couleur="var(--ink-500)" titre={mandat.precision ?? ""}>
        {LIBELLES_MOTIF_MANDAT[mandat.motif]}
      </Cellule>
      <Cellule couleur={retire ? "var(--danger)" : eteint ? "var(--ink-500)" : "var(--ink-900)"}>
        {retire
          ? `Retiré le ${dateCourte(mandat.revoque_le as string)}`
          : eteint
            ? "Expiré"
            : "En vigueur"}
        {mandat.en_vigueur && (
          <RevoquerUnMandat identifiant={mandat.identifiant} mandataire={mandat.mandataire} />
        )}
      </Cellule>
    </LigneTableau>
  );
}
