import type { Metadata } from "next";
import { AccesDesAdherents } from "@/app/components/portefeuille/AccesDesAdherents";
import { notFound } from "next/navigation";

import { Cellule, EnteteTableau, EtatErreur, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { LIBELLES_ROLE, detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import {
  lireAccesAuDossier,
  lireAnomaliesDuPortefeuille,
  lireCompletude,
  lireFicheEntreprise,
  lireStatutsResolus,
  moisPrecedent,
  type FicheEntreprise,
} from "@/app/lib/fiche-dossier";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { LIBELLES_NIVEAU, lireDecisionsDuDossier, type DecisionLue } from "@/app/lib/pilotage";
import { aujourdhui, lireLesAccesAdherents } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Fiche du dossier — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * E04 · La fiche adhérent 360° (pas 86).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'ON VIENT Y CHERCHER, DANS L'ORDRE
 *
 * 1. **Ce qui ne va pas** : un identifiant douteux, une collecte qui empêche le dépôt.
 * 2. **Où en est le dossier à une date** : régime, centre, TVA, adhésion, exercice,
 *    obligations mandatées. La date se choisit (`?au=`) : on traite souvent une pièce
 *    ancienne, et le régime d'aujourd'hui n'est pas celui de la pièce.
 * 3. **Pourquoi** : l'histoire des statuts, chaque période avec son motif.
 * 4. **Qui** : dirigeants, associés, et les personnes qui ont accès au dossier.
 *
 * ⚠️ UN DOSSIER HORS PÉRIMÈTRE N'EXISTE PAS ICI
 *
 * Le backend refuse la fiche d'un dossier qui n'est pas confié à la session ; la page
 * rend alors « introuvable », sans distinguer un dossier inconnu d'un dossier d'un
 * collègue. C'est la règle du projet : ne rien apprendre de l'existence d'un dossier.
 *
 * ⚠️ CHAQUE PANNEAU SE LIT SÉPARÉMENT
 *
 * La collecte exige `LIRE_PIECE`, que tous les lecteurs du dossier n'ont pas. Un panneau
 * qui ne se lit pas dit pourquoi, et n'empêche pas la fiche de s'afficher.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PERIODES: Colonne[] = [
  { cle: "valeur", libelle: "Statut", largeur: "minmax(0, 1fr)" },
  { cle: "du", libelle: "Du", largeur: "100px" },
  { cle: "au", libelle: "Au (exclu)", largeur: "100px" },
  { cle: "motif", libelle: "Motif", largeur: "minmax(0, 2fr)" },
];

const ACCES: Colonne[] = [
  { cle: "compte", libelle: "Compte", largeur: "90px" },
  { cle: "role", libelle: "Rôle", largeur: "minmax(0, 1fr)" },
  { cle: "etendue", libelle: "Étendue", largeur: "minmax(0, 1fr)" },
  { cle: "depuis", libelle: "Depuis", largeur: "100px" },
  { cle: "motif", libelle: "Accordé", largeur: "minmax(0, 1.4fr)" },
];

const LIBELLES_MOTIF: Record<string, string> = {
  CREATION: "Création",
  ADHESION: "Adhésion",
  DEPASSEMENT_SEUIL: "Dépassement de seuil",
  RECLASSEMENT_AUTOMATIQUE: "Reclassement automatique",
  OPTION: "Option",
  RETOUR_APRES_PROBATOIRE: "Retour après période probatoire",
  DECISION_ADMINISTRATION: "Décision de l'administration",
  RESILIATION: "Résiliation",
  CORRECTION: "Correction",
};

async function lirePanneau<T>(lecture: () => Promise<T>): Promise<{ valeur: T } | { echec: string; statut: number | null }> {
  try {
    return { valeur: await lecture() };
  } catch (erreur) {
    if (erreur instanceof ErreurApi) return { echec: erreur.message, statut: erreur.statut };
    throw erreur;
  }
}

export default async function FicheDuDossier({
  params,
  searchParams,
}: {
  params: Promise<{ niu: string }>;
  searchParams: Promise<{ au?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_DOSSIER")) {
    return <EcranReserve titre="Fiche du dossier" permission="LIRE_DOSSIER" acces={acces} />;
  }
  const { niu } = await params;
  const { au } = await searchParams;
  const jour = aujourdhui();
  const date = au && /^\d{4}-\d{2}-\d{2}$/.test(au) ? au : jour;
  const mois = moisPrecedent(jour);

  const fiche = await lirePanneau(() => lireFicheEntreprise(niu));
  if ("echec" in fiche) {
    // 403 (hors périmètre) et 404 (inconnu) se confondent volontairement.
    if (fiche.statut === 403 || fiche.statut === 404) notFound();
    return (
      <div className="page-travail">
        <EtatErreur titre="La fiche ne se lit pas" detail={fiche.echec} />
      </div>
    );
  }
  const f = fiche.valeur;

  const [statuts, anomalies, collecte, habilitations, decisions] = await Promise.all([
    lirePanneau(() => lireStatutsResolus(niu, date)),
    lirePanneau(() => lireAnomaliesDuPortefeuille(jour)),
    detient(acces, "LIRE_PIECE") ? lirePanneau(() => lireCompletude(niu, mois.debut, mois.fin, jour)) : null,
    lirePanneau(() => lireAccesAuDossier(niu, jour)),
    // Pas 100 : réservées au cabinet. L'adhérent ne lit pas qu'on envisage de mettre fin
    // à son adhésion avant que le comité en ait décidé ; le backend rend 404, et le
    // panneau n'est même pas demandé.
    acces.interne ? lirePanneau(() => lireDecisionsDuDossier(niu)) : null,
  ]);
  const acces_adherents = detient(acces, "RELANCER_ADHERENT") ? await lirePanneau(() => lireLesAccesAdherents(niu)) : null;
  const siennes = "valeur" in anomalies ? anomalies.valeur.filter((a) => a.niu_entreprise === niu) : [];

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Portefeuille", href: "/portefeuille" }, { libelle: f.denomination }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>{f.denomination}</h1>
          <p>
            {f.forme_juridique} · NIU {f.niu}
            {f.rccm && ` · RCCM ${f.rccm}`} · créée le {dateCourte(f.date_creation)}
            {f.capital && ` · capital ${montantFcfa(f.capital)}`}
          </p>
        </div>

        {(siennes.length > 0 || (collecte && "valeur" in collecte && !collecte.valeur.depot_possible)) && (
          <div className="avertissement-ecran" role="alert">
            {siennes.map((a) => (
              <span key={`${a.champ}-${a.motif}`} style={{ display: "block" }}>
                <strong style={{ display: "inline", fontWeight: 600 }}>
                  {a.champ.toUpperCase()} {a.valeur ? `« ${a.valeur} »` : "absent"}
                  {a.bloquante ? " (bloquant)" : ""} :
                </strong>{" "}
                {a.motif}
              </span>
            ))}
            {collecte && "valeur" in collecte && !collecte.valeur.depot_possible && (
              <span style={{ display: "block" }}>
                <strong style={{ display: "inline", fontWeight: 600 }}>Collecte de {mois.libelle} :</strong> {collecte.valeur.libelle}
              </span>
            )}
          </div>
        )}

        <Panneau titre={`Statuts au ${dateCourte(date)}`} aide="Résolus à la date choisie : le régime d'une pièce ancienne n'est pas celui d'aujourd'hui.">
          <form style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", flexWrap: "wrap" }}>
            <label style={{ font: "600 12px/1.4 var(--police-texte)" }}>
              Résoudre au{" "}
              <input type="date" name="au" defaultValue={date} style={{ padding: "3px 6px" }} />
            </label>
            <button type="submit" className="bouton-discret">Résoudre</button>
          </form>
          {"echec" in statuts ? (
            <EtatErreur titre="Les statuts ne se lisent pas à cette date" detail={statuts.echec} />
          ) : (
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px 16px", margin: "0 16px 14px" }}>
              <Fait terme="Régime" valeur={statuts.valeur.regime === "REEL" ? "Réel" : "IGS"} />
              <Fait terme="Centre" valeur={statuts.valeur.centre} />
              <Fait terme="TVA" valeur={statuts.valeur.assujettie_tva ? "Assujettie" : "Non assujettie"} />
              <Fait terme="Adhésion au centre" valeur={statuts.valeur.adherente ? "Adhérente" : "Non adhérente"} />
              <Fait
                terme="Exercice"
                valeur={statuts.valeur.exercice ? `${statuts.valeur.exercice.libelle}${statuts.valeur.exercice.clos ? " (clos)" : ""}` : "aucun à cette date"}
              />
              <Fait
                terme="Obligations mandatées"
                valeur={statuts.valeur.obligations_mandatees.length ? statuts.valeur.obligations_mandatees.join(", ") : "aucune : le centre ne dépose rien"}
              />
            </dl>
          )}
        </Panneau>

        {collecte && (
          <Panneau titre={`Collecte de ${mois.libelle}`} aide="Pièces reçues et demandes émises. Ce n'est pas une exhaustivité : le système ignore les factures dont personne n'a parlé.">
            {"echec" in collecte ? (
              <EtatErreur titre="La collecte ne se lit pas" detail={collecte.echec} />
            ) : (
              <div style={{ padding: "10px 16px", font: "400 13px/1.6 var(--police-texte)" }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: collecte.valeur.depot_possible ? "var(--success)" : "var(--danger)" }}>
                  {collecte.valeur.libelle}
                </p>
                <p style={{ margin: 0 }}>
                  {collecte.valeur.pieces_recues} pièce(s) reçue(s), {collecte.valeur.pieces_traitees} traitée(s)
                  {collecte.valeur.pieces_en_souffrance.length > 0 &&
                    `, ${collecte.valeur.pieces_en_souffrance.length} en souffrance (la plus ancienne depuis ${collecte.valeur.plus_ancienne_en_souffrance ?? "?"} jours)`}
                  {" · "}
                  {collecte.valeur.demandes_ouvertes} demande(s) ouverte(s)
                  {collecte.valeur.demandes_en_retard.length > 0 && `, dont ${collecte.valeur.demandes_en_retard.length} en retard`}
                  {collecte.valeur.demandes_bloquantes_ouvertes.length > 0 && ` : ${collecte.valeur.demandes_bloquantes_ouvertes.join(", ")} bloquent le dépôt`}
                </p>
                <p style={{ margin: "6px 0 0" }}>
                  <Link href="/pieces">Boîte de réception</Link>
                  {" · "}
                  <Link href="/pieces/attendues">Pièces attendues</Link>
                </p>
              </div>
            )}
          </Panneau>
        )}

        {decisions && <DecisionsDeDirection decisions={decisions} niu={niu} voitLeRisque={detient(acces, "LIRE_PILOTAGE")} />}

        <Historique fiche={f} />

        <Panneau titre="Exercices" aide="Bornes incluses. Un exercice clos n'accepte plus aucune écriture.">
          {f.exercices.length === 0 ? (
            <EtatVide titre="Aucun exercice" />
          ) : (
            <p style={{ margin: "10px 16px", font: "400 13px/1.8 var(--police-texte)" }}>
              {[...f.exercices]
                .sort((a, b) => b.ouverture.localeCompare(a.ouverture))
                .map((e) => `${e.libelle} (${dateCourte(e.ouverture)} au ${dateCourte(e.cloture)}${e.clos ? ", clos" : ""})`)
                .join(" · ")}
            </p>
          )}
        </Panneau>

        <Panneau titre="Dirigeants, associés et tiers" aide={f.activite ? `Activité : ${f.activite}${f.siege ? ` · siège : ${f.siege}` : ""}` : undefined}>
          <div style={{ padding: "10px 16px", font: "400 13px/1.7 var(--police-texte)" }}>
            <p style={{ margin: 0 }}>
              <strong>Dirigeants :</strong>{" "}
              {f.dirigeants.length
                ? f.dirigeants.map((d) => `${d.nom}, ${d.qualite} depuis le ${dateCourte(d.depuis)}${d.jusqu_a ? ` jusqu'au ${dateCourte(d.jusqu_a)}` : ""}`).join(" ; ")
                : "aucun renseigné"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Associés :</strong>{" "}
              {f.associes.length ? f.associes.map((a) => `${a.nom} (${a.parts} parts)`).join(" ; ") : "aucun renseigné"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Tiers connus :</strong> {f.tiers.filter((t) => t.type !== "CLIENT").length} fournisseur(s),{" "}
              {f.tiers.filter((t) => t.type !== "FOURNISSEUR").length} client(s)
              {f.tiers.some((t) => !t.niu && !t.etranger) && ` · ${f.tiers.filter((t) => !t.niu && !t.etranger).length} sans NIU`}
            </p>
            {f.etablissements.length > 0 && (
              <p style={{ margin: 0 }}>
                <strong>Établissements :</strong> {f.etablissements.join(" ; ")}
              </p>
            )}
          </div>
        </Panneau>

        {/* Pas 116 : le chargé de clientèle rend l'accès à l'adhérent qui l'appelle. */}
        {acces_adherents !== null && (
          <Panneau
            titre="Accès des adhérents"
            aide="L'adhérent n'a jamais reçu son lien, ou a oublié son mot de passe : renvoyez un lien à l'adresse du compte, après l'avoir reconnu."
          >
            {"echec" in acces_adherents ? (
              <EtatErreur titre="Les accès des adhérents ne se lisent pas" detail={acces_adherents.echec} />
            ) : (
              <AccesDesAdherents dossier={niu} acces={acces_adherents.valeur} />
            )}
          </Panneau>
        )}

        <Panneau titre="Qui a accès au dossier" aide="Au jour. Les habilitations transverses (direction, révision, administration) couvrent ce dossier aussi.">
          {"echec" in habilitations ? (
            <EtatErreur titre="Les accès ne se lisent pas" detail={habilitations.echec} />
          ) : (
            <>
              <EnteteTableau colonnes={ACCES} />
              {[...habilitations.valeur]
                .sort((a, b) => Number(a.transverse) - Number(b.transverse) || a.role.localeCompare(b.role))
                .map((h, rang) => (
                  <LigneTableau key={h.identifiant} colonnes={ACCES} ton={rang % 2 ? "alterne" : "normal"}>
                    <Cellule tabulaire gras>{h.compte}</Cellule>
                    <Cellule>{LIBELLES_ROLE[h.role] ?? h.role}</Cellule>
                    <Cellule couleur="var(--ink-500)">{h.transverse ? "tout le cabinet" : "ce dossier"}</Cellule>
                    <Cellule tabulaire couleur="var(--ink-500)">{dateCourte(h.debut)}</Cellule>
                    <Cellule couleur="var(--ink-500)" titre={h.precision ?? ""}>
                      {h.motif.toLowerCase().replaceAll("_", " ")} par {h.accordee_par}
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

function Fait({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div>
      <dt style={{ font: "600 11.5px/1.4 var(--police-texte)", color: "var(--ink-500)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{terme}</dt>
      <dd style={{ margin: 0, font: "600 14px/1.4 var(--police-texte)" }}>{valeur}</dd>
    </div>
  );
}

/** Régimes, rattachements, adhésions et mandats : chaque période avec son motif, la plus récente d'abord. */
function Historique({ fiche }: { fiche: FicheEntreprise }) {
  const lignes = [
    ...fiche.regimes.map((p) => ({ ...p, valeur: `Régime ${p.regime === "REEL" ? "réel" : "IGS"}` })),
    ...fiche.rattachements.map((p) => ({ ...p, valeur: `Centre ${p.centre}` })),
    ...fiche.adhesions.map((p) => ({ ...p, valeur: `Adhésion${p.numero ? ` ${p.numero}` : ""}` })),
    ...fiche.mandats.map((p) => ({ ...p, valeur: `Mandat : ${p.obligations.join(", ")}`, precision: p.precision ?? `signé par ${p.signe_par} le ${dateCourte(p.signe_le)}` })),
  ].sort((a, b) => b.debut.localeCompare(a.debut));
  return (
    <Panneau titre="Histoire des statuts" aide="Une entreprise n'est pas au réel : elle y est depuis une date, pour un motif.">
      <EnteteTableau colonnes={PERIODES} />
      {lignes.map((l, rang) => (
        <LigneTableau key={`${l.valeur}-${l.debut}`} colonnes={PERIODES} ton={rang % 2 ? "alterne" : "normal"}>
          <Cellule gras>{l.valeur}</Cellule>
          <Cellule tabulaire>{dateCourte(l.debut)}</Cellule>
          <Cellule tabulaire couleur="var(--ink-500)">{l.fin ? dateCourte(l.fin) : "en cours"}</Cellule>
          <Cellule couleur="var(--ink-500)" titre={l.precision ?? ""}>
            {LIBELLES_MOTIF[l.motif] ?? l.motif}
            {l.precision ? ` : ${l.precision}` : ""}
          </Cellule>
        </LigneTableau>
      ))}
    </Panneau>
  );
}

/**
 * Les décisions de la direction sur le dossier (pas 100) : ce qui a été décidé, par qui,
 * jusqu'à quand. Le collaborateur qui porte le dossier est celui qui suivra la mesure.
 *
 * Le panneau ne s'affiche que s'il y a quelque chose à dire : un dossier sans décision
 * n'a pas besoin d'un panneau vide de plus sur sa fiche.
 */
function DecisionsDeDirection({
  decisions,
  niu,
  voitLeRisque,
}: {
  decisions: { valeur: DecisionLue[] } | { echec: string; statut: number | null };
  niu: string;
  voitLeRisque: boolean;
}) {
  if ("echec" in decisions) {
    return (
      <Panneau titre="Décisions de la direction">
        <EtatErreur titre="Les décisions ne se lisent pas" detail={decisions.echec} />
      </Panneau>
    );
  }
  if (decisions.valeur.length === 0) return null;
  return (
    <Panneau
      titre="Décisions de la direction"
      aide="Datées et signées. Une mesure en cours se suit jusqu'à sa clôture."
      action={voitLeRisque ? <Link href={`/pilotage/${niu}`}>Vue risque</Link> : undefined}
    >
      {decisions.valeur.map(({ decision: d, echue }) => (
        <div key={d.identifiant} style={{ padding: "9px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.5 var(--police-texte)" }}>
          <strong>{d.libelle}</strong>{" "}
          <span style={{ font: "600 11.5px/1.4 var(--police-texte)", color: echue ? "var(--danger)" : d.statut === "EN_COURS" ? "var(--warning)" : "var(--ink-500)" }}>
            {echue ? "échue" : d.statut === "EN_COURS" ? "en cours" : "close"}
            {d.echeance && ` · échéance ${dateCourte(d.echeance)}`}
          </span>
          <span style={{ display: "block", color: "var(--ink-500)", fontSize: 12 }}>
            {d.prise_par_nom}, le {dateCourte(d.prise_le)} ({LIBELLES_NIVEAU[d.score.niveau].toLowerCase()} à {Number(d.score.total)} pts) : {d.motif}
            {d.close_le && ` · close le ${dateCourte(d.close_le)} par ${d.close_par_nom}`}
          </span>
        </div>
      ))}
    </Panneau>
  );
}
