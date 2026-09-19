import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { Montant } from "@/app/components/Montant";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { Link } from "@/i18n/navigation";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import {
  lireDeclarationTva,
  lireDossierDepot,
  moisPrecedent,
  type Anomalie,
  type DeclarationTVA,
  type DossierDeDepot,
} from "@/app/lib/obligations";
import { lireDossiers } from "@/app/lib/portefeuille";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";
import { ConstatDepotTva } from "@/app/components/obligations/GestesEcheancier";
import { PorteSecondFacteur } from "@/app/components/securite/PorteSecondFacteur";

export const metadata: Metadata = { title: "Déclaration de TVA — Plateforme CGA" };

/**
 * E-F02 · La déclaration de TVA d'une période, et son dépôt.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA LIGNE QUI FAIT LA VALEUR DU PRODUIT
 *
 * « TVA rejetée par le contrôle de conformité ». Dans une déclaration ordinaire,
 * une TVA rejetée est **invisible** : la case porte simplement un chiffre plus
 * faible, et rien n'explique pourquoi. Ici chaque rejet est isolé, chiffré et
 * justifié pièce par pièce, avec le code de la règle et le motif en clair.
 *
 * C'est ce qu'un adhérent redressé aurait payé, et ce que le cabinet lui a
 * évité. C'est donc l'écran qu'on montre pour vendre l'adhésion.
 *
 * LA RECEVABILITÉ EST AFFICHÉE AVANT LES CHIFFRES
 *
 * Ce qui empêche de déposer se lit en premier ; ce qui doit être assumé ensuite.
 * Les confondre produirait soit un écran qui ne laisse jamais déposer, soit un
 * écran qui laisse tout passer.
 *
 * ⚠️ LE DÉPÔT SE CONSIGNE ICI (pas 87)
 *
 * La DGI ne publie aucune interface : le bordereau se recopie sur le portail, et l'accusé
 * revient par le panneau « Consigner le dépôt ». Il n'est proposé que si la période est
 * recevable et pas encore déposée, à qui détient `DEPOSER_DECLARATION`, derrière le second
 * facteur. Le backend confronte l'accusé à l'empreinte du bordereau et refuse une date
 * d'accusé future ou antérieure à la fin de période.
 *
 * PAS 109 : LA PRÉPARATION, ÉTAPE PAR ÉTAPE (maquette « Parcours comptable », vue D)
 *
 * * **Quatre étapes** : les pièces du mois, la constitution (toujours depuis les journaux), les
 *   contrôles, le dépôt par le réviseur, fermé tant que le mois n'est pas transmis.
 * * **La déclaration ligne par ligne**, codes et libellés au référentiel, chaque ligne avec ses
 *   écritures. Aucun montant ne se saisit ici.
 * * **Ce qui l'alimente** : pièces reçues et traitées, complétude, TVA rejetée, pièces attendues.
 * * **« Transmettre au réviseur »** mène à la clôture du mois : c'est là que la transmission se
 *   fait, points de contrôle compris (pas 107). Le comptable transmet, il ne dépose pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LIGNES: Colonne[] = [
  { cle: "code", libelle: "Ligne", largeur: "56px" },
  { cle: "libelle", libelle: "Libellé", largeur: "minmax(0, 2fr)" },
  { cle: "base", libelle: "Base", largeur: "140px", aDroite: true },
  { cle: "montant", libelle: "Montant", largeur: "130px", aDroite: true },
  { cle: "ecritures", libelle: "Écritures", largeur: "90px", aDroite: true },
];

/** Les grandeurs qui se retranchent : affichées entre parenthèses, jamais avec un signe saisi. */
const EN_DEDUCTION = new Set(["TVA_REJETEE", "CREDIT_REPORTE"]);

const REJETS: Colonne[] = [
  { cle: "piece", libelle: "Pièce", largeur: "140px" },
  { cle: "regle", libelle: "Règle", largeur: "132px" },
  { cle: "motif", libelle: "Motif du rejet", largeur: "minmax(0, 2fr)" },
  { cle: "montant", libelle: "TVA écartée", largeur: "132px", aDroite: true },
];

export default async function Declarations({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; debut?: string; fin?: string }>;
}) {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403, l'erreur remonte, et le
  // visiteur voit un 500 au lieu d'un refus lisible. Voir `EcranReserve`.
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Déclaration de TVA" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const { dossier, debut, fin } = await searchParams;
  const dossiers = await lireDossiers();
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Déclarations" }]} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier" detail="Aucun dossier ne vous est affecté." />
        </div>
      </>
    );
  }

  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;
  const mois = moisPrecedent();
  const periode = { debut: debut ?? mois.debut, fin: fin ?? mois.fin };

  let declaration: DeclarationTVA | null = null;
  let depot: DossierDeDepot | null = null;
  let refus: string | null = null;
  try {
    [declaration, depot] = await Promise.all([
      lireDeclarationTva(niu, periode.debut, periode.fin),
      lireDossierDepot(niu, periode.debut, periode.fin).catch(() => null),
    ]);
  } catch (erreur) {
    // 409 : le dossier n'était pas assujetti sur la période. Ce n'est pas une
    // panne — c'est une réponse, et elle doit être lisible.
    if (erreur instanceof ErreurApi) refus = erreur.message;
    else throw erreur;
  }

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Obligations fiscales", href: "/obligations" },
          { libelle: "Déclaration de TVA" },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Déclaration de TVA</h1>
          <p>
            {courant.denomination} · période du {dateCourte(periode.debut)} au{" "}
            {dateCourte(periode.fin)} ·{" "}
            <Link href={`/obligations?dossier=${niu}`}>retour à l&rsquo;échéancier</Link>
          </p>
        </div>

        {refus && (
          <div className="avertissement-ecran" role="alert">
            <strong>Aucune déclaration à établir.</strong>
            {refus}
          </div>
        )}

        {declaration && (
          <>
            <Etapes declaration={declaration} depot={depot} />
            {depot && <Recevabilite depot={depot} />}

            <Panneau titre="Déclaration" aide="Montants issus des journaux, non modifiables ici. Codes et libellés : référentiel, à confirmer avec le formulaire de la DGI.">
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 600 }}>
                  <EnteteTableau colonnes={LIGNES} />
                  {declaration.lignes.map((ligne, rang) => (
                    <LigneTableau key={ligne.code} colonnes={LIGNES} ton={ligne.grandeur === "TVA_REJETEE" && Number(ligne.montant) > 0 ? "alerte" : rang % 2 ? "alterne" : "normal"}>
                      <Cellule tabulaire gras>{ligne.code}</Cellule>
                      <Cellule titre={ligne.base_partielle ? "Base partielle : des écritures mêlent plusieurs catégories de TVA et ne sont pas réparties." : ligne.libelle}>
                        {ligne.libelle}
                        {ligne.base_partielle && <span style={{ color: "var(--warning)" }}> · base partielle</span>}
                      </Cellule>
                      <Cellule aDroite tabulaire couleur="var(--ink-500)">
                        {ligne.base === null ? "" : <Montant valeur={ligne.base} />}
                      </Cellule>
                      <Cellule aDroite tabulaire gras>
                        {ligne.montant === null ? "—" : EN_DEDUCTION.has(ligne.grandeur) && Number(ligne.montant) > 0 ? <>(<Montant valeur={ligne.montant} />)</> : <Montant valeur={ligne.montant} />}
                      </Cellule>
                      <Cellule aDroite tabulaire couleur="var(--ink-500)" titre={ligne.ecritures.join(", ") || "aucune écriture"}>
                        {ligne.ecritures.length}
                      </Cellule>
                    </LigneTableau>
                  ))}
                  <LigneTableau colonnes={LIGNES} ton="selection">
                    <Cellule>{""}</Cellule>
                    <Cellule gras>{Number(declaration.tva_a_payer) > 0 ? "TVA à payer" : "Crédit à reporter"}</Cellule>
                    <Cellule>{""}</Cellule>
                    <Cellule aDroite tabulaire gras>
                      <Montant valeur={Number(declaration.tva_a_payer) > 0 ? declaration.tva_a_payer : declaration.credit_a_reporter} avecDevise />
                    </Cellule>
                    <Cellule>{""}</Cellule>
                  </LigneTableau>
                </div>
              </div>
              {declaration.lignes.some((l) => l.ecritures.length > 0) && (
                <details style={{ padding: "8px 14px", font: "400 12px/1.6 var(--police-texte)" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Les écritures de chaque ligne</summary>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {declaration.lignes
                      .filter((l) => l.ecritures.length > 0)
                      .map((l) => (
                        <li key={l.code}>
                          <strong>{l.code}</strong> · {l.ecritures.join(", ")}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </Panneau>

            <Panneau titre="Ce qui alimente la déclaration">
              <dl className="faits">
                <dt>Pièces de la période</dt>
                <dd>
                  {declaration.completude.pieces_recues} reçue{declaration.completude.pieces_recues > 1 ? "s" : ""} · {declaration.completude.pieces_traitees} traitée
                  {declaration.completude.pieces_traitees > 1 ? "s" : ""}
                </dd>
                <dt>Complétude</dt>
                <dd>{declaration.completude.taux === null ? "—" : `${Math.round(declaration.completude.taux * 100)} %`}</dd>
                <dt>TVA rejetée par le contrôle</dt>
                <dd>
                  <Montant valeur={declaration.tva_rejetee} avecDevise />
                </dd>
              </dl>
              {(declaration.completude.pieces_attendues.length > 0 || declaration.completude.pieces_en_souffrance.length > 0) && (
                <p style={{ margin: 0, padding: "8px 14px", borderLeft: "3px solid var(--warning)", background: "var(--warning-100)", font: "400 12.5px/1.6 var(--police-texte)" }}>
                  {declaration.completude.pieces_attendues.length > 0 && (
                    <>
                      {declaration.completude.pieces_attendues.length} pièce{declaration.completude.pieces_attendues.length > 1 ? "s" : ""} attendue
                      {declaration.completude.pieces_attendues.length > 1 ? "s ne sont" : " n'est"} pas arrivée
                      {declaration.completude.pieces_attendues.length > 1 ? "s" : ""}. Déposer maintenant expose à une déclaration rectificative :{" "}
                      <Link href={`/pieces/relancer?dossier=${encodeURIComponent(niu)}&mois=${periode.debut.slice(0, 7)}`}>relancer l&rsquo;adhérent</Link> ou documenter le choix.{" "}
                    </>
                  )}
                  {declaration.completude.pieces_en_souffrance.length > 0 && (
                    <>
                      {declaration.completude.pieces_en_souffrance.length} pièce{declaration.completude.pieces_en_souffrance.length > 1 ? "s" : ""} reçue
                      {declaration.completude.pieces_en_souffrance.length > 1 ? "s" : ""} à comptabiliser ou classer :{" "}
                      <Link href="/pieces">boîte de réception</Link>.
                    </>
                  )}
                </p>
              )}
              {detient(acces, "SAISIR_ECRITURE") && declaration.revue.statut === null && (
                <p style={{ margin: 0, padding: "10px 14px" }}>
                  <Link href={`/comptabilite/cloture?dossier=${niu}&mois=${periode.debut.slice(0, 7)}`} className="action-principale">
                    Transmettre au réviseur
                  </Link>{" "}
                  <span style={{ font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                    depuis la clôture du mois : ses points de contrôle d&rsquo;abord, le verrou ensuite.
                  </span>
                </p>
              )}
            </Panneau>
            <div className="page-travail__duo">
              <Panneau titre="Décompte de la période">
                <dl className="faits">
                  <Fait libelle="TVA collectée" valeur={declaration.tva_collectee} />
                  <Fait
                    libelle="TVA déductible théorique"
                    valeur={declaration.tva_deductible_theorique}
                  />
                  <Fait
                    libelle="dont écartée par le contrôle"
                    valeur={declaration.tva_rejetee}
                    alerte
                  />
                  <Fait
                    libelle="TVA déductible admise"
                    valeur={declaration.tva_deductible_admise}
                  />
                  <Fait
                    libelle="Crédit reporté antérieur"
                    valeur={declaration.credit_reporte_anterieur}
                  />
                  <Fait libelle="Solde" valeur={declaration.solde} gras />
                  <Fait libelle="À payer" valeur={declaration.tva_a_payer} gras />
                  <Fait
                    libelle="Crédit à reporter"
                    valeur={declaration.credit_a_reporter}
                  />
                </dl>
                {declaration.neant && (
                  <p style={{ padding: "0 var(--espace-3) var(--espace-2)", margin: 0, font: "400 12.5px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
                    Aucune opération sur la période : la déclaration est à néant.{" "}
                    <strong>Elle reste due</strong> — l&rsquo;obligation naît de
                    l&rsquo;assujettissement, pas de l&rsquo;activité.
                  </p>
                )}
              </Panneau>

              <Panneau
                titre="Ce que le contrôle a évité"
                aide="Cette TVA aurait été réclamée et refusée. C'est le chiffre qui justifie l'adhésion."
              >
                <div
                  style={{
                    padding: "var(--espace-4) var(--espace-3)",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      font: "600 32px/1.1 var(--police-titre)",
                      color:
                        Number(declaration.cout_de_la_non_conformite) > 0
                          ? "var(--danger)"
                          : "var(--ink-500)",
                    }}
                  >
                    <Montant valeur={declaration.cout_de_la_non_conformite} avecDevise />
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 6,
                      font: "400 12.5px/1.6 var(--police-texte)",
                      color: "var(--ink-500)",
                    }}
                  >
                    sur {declaration.detail_rejets.length} pièce
                    {declaration.detail_rejets.length > 1 ? "s" : ""}
                  </span>
                </div>
              </Panneau>
            </div>

            {depot && depot.recevabilite.deposable && !depot.deja_depose && detient(acces, "DEPOSER_DECLARATION") && (
              <Panneau
                titre="Consigner le dépôt"
                aide="Après le dépôt sur le portail de la DGI : l'accusé est confronté au bordereau de la période."
              >
                {acces.facteur_fort ? (
                  <ConstatDepotTva
                    dossier={niu}
                    debut={periode.debut}
                    fin={periode.fin}
                    montant={depot.document.montant_a_payer}
                  />
                ) : (
                  <PorteSecondFacteur enrole={acces.second_facteur_enrole} geste="Consigner le dépôt de TVA" />
                )}
              </Panneau>
            )}

            <Panneau
              titre="Rejets, pièce par pièce"
              aide="Chaque rejet porte le code de la règle appliquée et son motif en clair. Sans ce détail, la case de la déclaration porterait un chiffre plus faible et rien n'expliquerait pourquoi."
            >
              {declaration.detail_rejets.length === 0 ? (
                <EtatVide
                  titre="Aucun rejet"
                  detail="Toute la TVA déductible de la période a été admise."
                />
              ) : (
                // ⚠️ Pas 109 : sur téléphone, le motif et le montant du rejet étaient coupés.
                <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 560 }}>
                  <EnteteTableau colonnes={REJETS} />
                  {declaration.detail_rejets.map((rejet, rang) => (
                    <LigneTableau
                      // ⚠️ Pas 79 : l'écriture, le compte et le rang, toujours renseignés.
                      // La pièce et la règle peuvent être nulles, et deux rejets sans pièce
                      // partageaient la clé « nullnull ».
                      key={`${rejet.ecriture}-${rejet.compte}-${rang}`}
                      colonnes={REJETS}
                      ton={rang % 2 ? "alterne" : "normal"}
                    >
                      {/* Sans pièce, l'écriture : c'est elle qui porte la TVA refusée. */}
                      <Cellule tabulaire gras titre={rejet.ecriture}>{rejet.piece ?? rejet.ecriture}</Cellule>
                      <Cellule tabulaire couleur="var(--brand-indigo-700)">
                        {rejet.code_regle ?? "—"}
                      </Cellule>
                      <Cellule titre={rejet.motif ?? undefined}>{rejet.motif ?? "motif non renseigné"}</Cellule>
                      <Cellule aDroite tabulaire gras couleur="var(--danger)">
                        <Montant valeur={rejet.montant} />
                      </Cellule>
                    </LigneTableau>
                  ))}
                </div>
                </div>
              )}
            </Panneau>
          </>
        )}
      </div>
    </>
  );
}

/** Les quatre étapes de la maquette, lues sur ce que le backend a calculé. */
function Etapes({ declaration, depot }: { declaration: DeclarationTVA; depot: DossierDeDepot | null }) {
  const c = declaration.completude;
  const aTraiter = c.pieces_en_souffrance.length + c.pieces_attendues.length;
  const bloquants = depot?.recevabilite.bloquants.length ?? 0;
  const reserves = depot?.recevabilite.reserves.length ?? 0;
  const statut = declaration.revue.statut;
  const etapes: { titre: string; etat: string; ton: "fait" | "attention" | "ferme" | "encours" }[] = [
    {
      titre: "Pièces du mois",
      etat: `${c.pieces_traitees} traitée${c.pieces_traitees > 1 ? "s" : ""} sur ${c.pieces_recues} · ${c.pieces_attendues.length} attendue${c.pieces_attendues.length > 1 ? "s" : ""}`,
      ton: aTraiter > 0 ? "attention" : "fait",
    },
    { titre: "Constitution", etat: "Montants issus des journaux", ton: "fait" },
    {
      titre: "Contrôles",
      etat: depot ? `${bloquants} bloquant${bloquants > 1 ? "s" : ""} · ${reserves} réserve${reserves > 1 ? "s" : ""}` : "indisponibles",
      ton: bloquants > 0 ? "encours" : "fait",
    },
    {
      titre: "Dépôt par le réviseur",
      etat: depot?.deja_depose ? "Déposée" : statut === null ? "Fermé jusqu'à transmission" : statut === "RENVOYEE" ? "Mois renvoyé au comptable" : `Mois ${statut === "VALIDEE" ? "validé" : "transmis"}`,
      ton: depot?.deja_depose ? "fait" : statut === null || statut === "RENVOYEE" ? "ferme" : "encours",
    },
  ];
  const styles = {
    fait: { bordure: "var(--success)", fond: "var(--surface)", texte: "var(--ink-900)" },
    attention: { bordure: "var(--warning)", fond: "var(--warning-100)", texte: "var(--ink-900)" },
    encours: { bordure: "var(--brand-indigo-700)", fond: "var(--brand-indigo-100)", texte: "var(--ink-900)" },
    ferme: { bordure: "var(--line-200)", fond: "var(--surface-alt)", texte: "var(--ink-400)" },
  };
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
      {etapes.map((e, rang) => (
        <li key={e.titre} style={{ padding: "10px 12px", borderTop: `3px solid ${styles[e.ton].bordure}`, background: styles[e.ton].fond, borderRadius: "var(--rayon-petit)", color: styles[e.ton].texte, font: "400 12px/1.5 var(--police-texte)" }}>
          <span style={{ display: "block", color: "var(--ink-500)" }}>Étape {rang + 1}</span>
          <strong style={{ display: "block", font: "600 13px/1.4 var(--police-texte)" }}>{e.titre}</strong>
          {e.etat}
        </li>
      ))}
    </ol>
  );
}

function Recevabilite({ depot }: { depot: DossierDeDepot }) {
  if (depot.deja_depose && depot.accuse) {
    return (
      <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
        <strong>Cette période a déjà été déposée.</strong>
        Accusé {depot.accuse.numero}, le {dateCourte(depot.accuse.depose_le)}.
        {!depot.accuse.verifiable &&
          " ⚠️ Aucun justificatif n'est archivé : l'accusé repose sur la seule saisie du numéro."}
      </div>
    );
  }
  if (!depot.recevabilite.deposable) {
    return (
      <div className="avertissement-ecran" role="alert">
        <strong>Ce dossier n&rsquo;est pas en état d&rsquo;être déposé.</strong>
        {depot.recevabilite.bloquants.map((a) => (
          <Constat key={a.code} anomalie={a} />
        ))}
      </div>
    );
  }
  return (
    <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
      <strong>
        Déposable, sous {depot.recevabilite.reserves.length} réserve
        {depot.recevabilite.reserves.length > 1 ? "s" : ""} à assumer.
      </strong>
      {depot.recevabilite.reserves.map((a) => (
        <Constat key={a.code} anomalie={a} />
      ))}
      {/* Le dépôt lui-même exige une session renforcée par le second facteur, et
          il se fait depuis le portail de la DGI : la plateforme prépare, un
          humain saisit, puis revient consigner l'accusé. */}
      <span style={{ display: "block", marginTop: 6, color: "var(--ink-500)" }}>
        Le dépôt se fait sur le portail de la DGI, puis l&rsquo;accusé se consigne ici.
        Il réclame une session renforcée par le second facteur.
      </span>
    </div>
  );
}

function Constat({ anomalie }: { anomalie: Anomalie }) {
  return (
    <span style={{ display: "block", marginTop: 4 }}>
      <strong style={{ display: "inline", fontWeight: 600 }}>{anomalie.libelle}</strong>{" "}
      <span style={{ color: "var(--ink-700)" }}>{anomalie.remediation}</span>
      {anomalie.enjeu && Number(anomalie.enjeu) > 0 && (
        <span style={{ color: "var(--danger)" }}>
          {" "}
          — <Montant valeur={anomalie.enjeu} avecDevise />
        </span>
      )}
    </span>
  );
}

function Fait({
  libelle,
  valeur,
  gras = false,
  alerte = false,
}: {
  libelle: string;
  valeur: string;
  gras?: boolean;
  alerte?: boolean;
}) {
  return (
    <>
      <dt>{libelle}</dt>
      <dd
        style={{
          fontWeight: gras ? 600 : 500,
          color: alerte && Number(valeur) > 0 ? "var(--danger)" : undefined,
        }}
      >
        <Montant valeur={valeur} avecDevise />
      </dd>
    </>
  );
}
