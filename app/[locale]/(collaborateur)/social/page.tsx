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
import { Montant } from "@/app/components/Montant";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ErreurApi } from "@/app/lib/api";
import { detient } from "@/app/lib/acces";
import { dateCourte, TIRET } from "@/app/lib/formats";
import { aujourdhui, lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import {
  LIBELLES_MOIS,
  lireBulletin,
  lireDeclaration,
  lireGroupeDeRisque,
  lirePersonnel,
  moisDePaieParDefaut,
  type Bulletin,
  type Declaration,
  type GroupeRisque,
  type LigneSalarie,
} from "@/app/lib/social";
import { ContratDuSalarie, EmbaucheSalarie } from "@/app/components/social/GestesPersonnel";
import { GroupeDeRisque } from "@/app/components/social/GroupeDeRisque";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Social et paie · Plateforme CGA" };

// La déclaration se calcule à la date du jour pour juger le retard : un rendu
// figé au build afficherait un retard périmé.
export const dynamic = "force-dynamic";

/**
 * E-G01 · Le personnel d'un dossier et sa déclaration mensuelle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE CET ÉCRAN RÉPOND, DANS L'ORDRE
 *
 * 1. **Combien devons-nous verser ce mois-ci, et avant quand ?** C'est la
 *    question de trésorerie, et elle passe avant tout le reste — un retard de
 *    cotisation coûte des pénalités que l'adhérent ne comprendra pas.
 * 2. **Qui est employé, et qui est entré ou sorti ?** Les mouvements ouvrent et
 *    ferment des droits à la CNPS ; un départ non déclaré laisse le salarié
 *    réputé en poste et l'employeur continue de lui devoir des cotisations.
 * 3. **Combien coûte chacun ?** Le détail par salarié, en dernier.
 *
 * LE MOIS AFFICHÉ PAR DÉFAUT EST LE MOIS PRÉCÉDENT
 *
 * Et non le mois en cours, qui n'est pas terminé : sa déclaration serait
 * incomplète, et l'afficher par défaut ferait croire à un effectif qui a fondu.
 * Le cabinet travaille sur le mois clos.
 *
 * ⚠️ LE BANDEAU DE RÉSERVE N'EST PAS DÉCORATIF
 *
 * Toutes les valeurs de paie sont au statut `A_VALIDER`. Un employeur qui remet
 * une fiche de paie engage sa responsabilité ; il doit lire, sur l'écran qui la
 * produit, que les taux n'ont pas encore été confirmés sur le texte.
 *
 * ⚠️ LES GESTES DU FICHIER DU PERSONNEL (pas 89)
 *
 * Embaucher, ouvrir un contrat, le clore : réservés à `SAISIR_ECRITURE`. Le bulletin d'un
 * salarié s'ouvre par `?bulletin=matricule`. Le groupe de risque professionnel notifié par
 * la CNPS est porté par le dossier depuis le 16 octobre 2026 et s'applique d'office ;
 * `?groupe=` ne fait que simuler un autre groupe.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "salarie", libelle: "Salarié", largeur: "minmax(0, 2fr)" },
  { cle: "poste", libelle: "Poste", largeur: "minmax(0, 1.4fr)" },
  { cle: "contrat", libelle: "Contrat", largeur: "110px" },
  { cle: "depuis", libelle: "Depuis", largeur: "104px" },
  { cle: "cnps", libelle: "N° CNPS", largeur: "120px" },
  { cle: "base", libelle: "Salaire de base", largeur: "136px", aDroite: true },
  { cle: "gestes", libelle: "", largeur: "minmax(0, 1.8fr)" },
];

export default async function SocialEtPaie({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; annee?: string; mois?: string; bulletin?: string; groupe?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Social et paie" permission="LIRE_COMPTABILITE" acces={acces} />;
  }

  const parametres = await searchParams;
  const dossiers = await lireDossiers();
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Social et paie" }]} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier" detail="Aucun dossier ne vous est affecté." />
        </div>
      </>
    );
  }

  const niu =
    parametres.dossier && dossiers.some((d) => d.niu === parametres.dossier)
      ? parametres.dossier
      : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;

  const defaut = moisDePaieParDefaut();
  const annee = Number(parametres.annee) || defaut.annee;
  const mois = Number(parametres.mois) || defaut.mois;
  const jour = aujourdhui();

  let personnel: LigneSalarie[] = [];
  let declaration: Declaration | null = null;
  let erreur: string | null = null;
  try {
    [personnel, declaration] = await Promise.all([
      lirePersonnel(niu, jour),
      lireDeclaration(niu, annee, mois, jour),
    ]);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  const saisit = detient(acces, "SAISIR_ECRITURE");
  // Une simulation seulement : sans elle, le backend applique le groupe du dossier.
  const groupe: GroupeRisque | undefined =
    parametres.groupe === "A" || parametres.groupe === "B" || parametres.groupe === "C" ? parametres.groupe : undefined;
  const groupeDuDossier = await lireGroupeDeRisque(niu).catch(() => null);
  let bulletin: Bulletin | null = null;
  let refusBulletin: string | null = null;
  if (parametres.bulletin && !erreur) {
    try {
      bulletin = await lireBulletin(niu, annee, mois, parametres.bulletin, groupe);
    } catch (cause) {
      if (!(cause instanceof ErreurApi)) throw cause;
      refusBulletin = cause.message;
    }
  }

  const enPoste = personnel.filter((s) => !s.sans_contrat);
  const sortis = personnel.filter((s) => s.sans_contrat);

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Social et paie" }, { libelle: courant.denomination }]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>
            Paie de {LIBELLES_MOIS[mois - 1]} {annee}
          </h1>
          <p>
            {courant.denomination} · {enPoste.length} salarié
            {enPoste.length > 1 ? "s" : ""} en poste
            {sortis.length > 0 && ` · ${sortis.length} sorti${sortis.length > 1 ? "s" : ""}`}
            {" · changez de dossier dans la barre latérale"}
          </p>
        </div>

        {erreur ? (
          <EtatErreur titre="Paie indisponible" detail={erreur} />
        ) : (
          <>
            {declaration?.repose_sur_des_valeurs_non_validees && (
              <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
                <span style={{ display: "block" }}>
                  {/* Réécrit le 15 octobre 2026 : les taux CNPS, CFC et FNE sont validés, et
                      chaque valeur cite désormais son article du CGI 2026. */}
                  <strong style={{ display: "inline", fontWeight: 600 }}>
                    Certaines valeurs de cette paie attendent la validation du fiscaliste.
                  </strong>{" "}
                  Chacune est relue dans l&rsquo;édition officielle 2026 du Code général des
                  impôts et ses annexes, avec son article au référentiel ; les lignes
                  concernées portent « à valider par le fiscaliste ».
                </span>
                <span style={{ display: "block" }}>
                  Tant qu&rsquo;une ligne l&rsquo;indique, le bulletin n&rsquo;est pas opposable.
                </span>
              </div>
            )}

            {groupeDuDossier && (
              <GroupeDeRisque dossier={niu} etat={groupeDuDossier} peutEnregistrer={saisit} aujourdhui={jour} />
            )}

            {declaration && <SyntheseVersement declaration={declaration} />}

            {declaration && declaration.mouvements.length > 0 && (
              <Panneau
                titre="Mouvements du mois"
                aide="La CNPS ouvre et ferme les droits sur ces mouvements"
              >
                {declaration.mouvements.map((m) => (
                  <div
                    key={`${m.salarie}-${m.sens}-${m.survenu_le}`}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 12,
                      padding: "9px 14px",
                      borderBottom: "1px solid var(--line-100)",
                    }}
                  >
                    <span
                      style={{
                        font: "600 11px/1.3 var(--police-texte)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color:
                          m.sens === "ENTREE" ? "var(--success)" : "var(--warning)",
                      }}
                    >
                      {m.sens === "ENTREE" ? "Entrée" : "Sortie"}
                    </span>
                    <strong style={{ font: "600 13px/1.3 var(--police-texte)" }}>
                      {nomDuMatricule(m.salarie, personnel)}
                    </strong>
                    <span
                      style={{
                        marginLeft: "auto",
                        font: "400 12px/1.3 var(--police-texte)",
                        color: "var(--ink-500)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {dateCourte(m.survenu_le)}
                    </span>
                  </div>
                ))}
              </Panneau>
            )}

            {parametres.bulletin && (
              <Panneau
                titre={`Bulletin de ${nomDuMatricule(parametres.bulletin, personnel)}, ${LIBELLES_MOIS[mois - 1]} ${annee}`}
                aide="Calculé, jamais stocké : les taux du référentiel à la fin du mois."
              >
                <form style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", flexWrap: "wrap" }}>
                  <input type="hidden" name="dossier" value={niu} />
                  <input type="hidden" name="annee" value={annee} />
                  <input type="hidden" name="mois" value={mois} />
                  <input type="hidden" name="bulletin" value={parametres.bulletin} />
                  <label style={{ font: "600 12px/1.4 var(--police-texte)" }}>
                    Simuler un groupe CNPS{" "}
                    <select name="groupe" defaultValue={groupe ?? ""}>
                      <option value="">celui du dossier</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </label>
                  <button type="submit" className="bouton-discret">Recalculer</button>
                  {bulletin && (
                    // 15 octobre 2026 : le bulletin se remet au salarié, du même calcul que l'écran.
                    <a
                      className="bouton-discret"
                      href={`/api/bulletins/${encodeURIComponent(niu)}/${annee}/${mois}/${encodeURIComponent(parametres.bulletin!)}${groupe ? `?groupe_risque=${groupe}` : ""}`}
                      target="_blank"
                      rel="noopener"
                    >
                      Imprimer le bulletin (PDF) ↗
                    </a>
                  )}
                  {groupe && (
                    <span style={{ font: "400 12px/1.5 var(--police-texte)", color: "var(--warning, #9a6700)" }}>
                      Simulation du groupe {groupe} : le bulletin réel applique le groupe du dossier.
                    </span>
                  )}
                </form>
                {refusBulletin ? (
                  <EtatErreur titre="Pas de bulletin" detail={refusBulletin} />
                ) : (
                  bulletin && <DetailBulletin bulletin={bulletin} />
                )}
              </Panneau>
            )}

            {saisit && (
              <Panneau titre="Embaucher" aide="Inscrire le salarié et ouvrir son premier contrat. Un matricule ne se réattribue pas.">
                <EmbaucheSalarie dossier={niu} aujourdhui={jour} />
              </Panneau>
            )}

            <Panneau
              titre="Fichier du personnel"
              aide="Les sortis restent au fichier : la CNPS peut les réclamer des années après"
            >
              {personnel.length === 0 ? (
                <EtatVide
                  titre="Aucun salarié"
                  detail="Ce dossier n'emploie personne. Il n'a donc aucune obligation sociale."
                />
              ) : (
                <>
                  <EnteteTableau colonnes={COLONNES} />
                  {personnel.map((salarie) => (
                    <LigneTableau key={salarie.matricule} colonnes={COLONNES} hauteur="auto">
                      <Cellule>
                        <strong style={{ fontWeight: 600 }}>
                          {salarie.prenom} {salarie.nom}
                        </strong>
                      </Cellule>
                      <Cellule>{salarie.poste ?? TIRET}</Cellule>
                      <Cellule>{salarie.type_contrat ?? "sorti"}</Cellule>
                      <Cellule>
                        {salarie.depuis ? dateCourte(salarie.depuis) : TIRET}
                      </Cellule>
                      <Cellule>{salarie.matricule_cnps ?? "à obtenir"}</Cellule>
                      <Cellule aDroite>
                        {salarie.salaire_base ? (
                          <Montant valeur={Number(salarie.salaire_base)} />
                        ) : (
                          TIRET
                        )}
                      </Cellule>
                      <span style={{ minWidth: 0, paddingBlock: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Link
                          href={`/social?dossier=${encodeURIComponent(niu)}&annee=${annee}&mois=${mois}&bulletin=${encodeURIComponent(salarie.matricule)}`}
                        >
                          Bulletin
                        </Link>
                        {saisit && (
                          <ContratDuSalarie
                            dossier={niu}
                            matricule={salarie.matricule}
                            enPoste={!salarie.sans_contrat}
                            aujourdhui={jour}
                          />
                        )}
                      </span>
                    </LigneTableau>
                  ))}
                </>
              )}
            </Panneau>
          </>
        )}
      </div>
    </>
  );
}

/** Le bulletin, dans l'ordre d'une fiche de paie : ce qui est dû, ce qui est retenu, ce qui est versé. */
function DetailBulletin({ bulletin }: { bulletin: Bulletin }) {
  const salariales = bulletin.lignes.filter((l) => l.a_charge_du_salarie);
  const patronales = bulletin.lignes.filter((l) => !l.a_charge_du_salarie);
  const ligne = (l: Bulletin["lignes"][number]) => (
    <li key={l.code} style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
      <span>
        {l.libelle}
        {l.taux ? ` · ${l.taux} %` : ""}
        {l.non_valide && <span style={{ color: "var(--warning, #9a6700)" }}> · à valider par le fiscaliste</span>}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        <Montant valeur={Number(l.montant)} />
      </span>
    </li>
  );
  const liste: React.CSSProperties = { listStyle: "none", margin: "4px 0 10px", padding: 0, font: "400 13px/1.7 var(--police-texte)" };
  return (
    <div style={{ padding: "6px 16px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
      {bulletin.alertes.map((a) => (
        <p key={a} role="alert" style={{ gridColumn: "1 / -1", margin: 0, padding: "8px 12px", borderRadius: "var(--rayon)", background: "var(--warning-100, #fff4d6)", font: "500 13px/1.5 var(--police-texte)" }}>
          {a}
        </p>
      ))}
      <div>
        <strong style={{ font: "600 13px/1.4 var(--police-texte)" }}>Rémunération</strong>
        <ul style={liste}>
          <li style={{ display: "flex", justifyContent: "space-between" }}><span>Salaire de base</span><Montant valeur={Number(bulletin.salaire_base)} /></li>
          <li style={{ display: "flex", justifyContent: "space-between" }}><span>Primes</span><Montant valeur={Number(bulletin.primes)} /></li>
          <li style={{ display: "flex", justifyContent: "space-between" }}><span>Avantages en nature (non versés)</span><Montant valeur={Number(bulletin.avantages_evalues)} /></li>
          <li style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}><span>Brut taxable</span><Montant valeur={Number(bulletin.brut_taxable)} /></li>
        </ul>
        <strong style={{ font: "600 13px/1.4 var(--police-texte)" }}>Retenues du salarié</strong>
        <ul style={liste}>{salariales.map(ligne)}</ul>
        <p style={{ margin: 0, display: "flex", justifyContent: "space-between", font: "700 15px/1.4 var(--police-texte)" }}>
          <span>Net à payer</span>
          <Montant valeur={Number(bulletin.net_a_payer)} />
        </p>
      </div>
      <div>
        <strong style={{ font: "600 13px/1.4 var(--police-texte)" }}>Charges de l&rsquo;employeur</strong>
        <ul style={liste}>{patronales.map(ligne)}</ul>
        <p style={{ margin: 0, display: "flex", justifyContent: "space-between", font: "600 14px/1.4 var(--police-texte)" }}>
          <span>Coût employeur</span>
          <Montant valeur={Number(bulletin.cout_employeur)} />
        </p>
      </div>
    </div>
  );
}

function nomDuMatricule(matricule: string, personnel: LigneSalarie[]): string {
  const trouve = personnel.find((s) => s.matricule === matricule);
  return trouve ? `${trouve.prenom} ${trouve.nom}` : matricule;
}

/**
 * Ce qu'il faut verser, et avant quand.
 *
 * ⚠️ Le total mis en avant est **patronales + retenues**, jamais les seules
 * charges patronales. L'erreur de trésorerie classique est de ne provisionner que
 * sa part : la retenue salariale n'appartient pas à l'employeur, il la détient
 * pour le compte de l'administration et la doit intégralement.
 */
function SyntheseVersement({ declaration }: { declaration: Declaration }) {
  const cases = [
    { libelle: "Effectif déclaré", valeur: String(declaration.effectif), brut: true },
    { libelle: "Masse salariale brute", valeur: declaration.masse_salariale_brute },
    { libelle: "Retenues salariales", valeur: declaration.retenues_salariales },
    { libelle: "Charges patronales", valeur: declaration.charges_patronales },
  ];
  return (
    <section
      style={{
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
          padding: "14px 16px",
          borderBottom: "1px solid var(--line-200)",
          background: declaration.en_retard ? "var(--danger-100)" : "var(--surface-2)",
        }}
      >
        <span style={{ font: "400 13px/1.3 var(--police-texte)", color: "var(--ink-500)" }}>
          Total à verser
        </span>
        <strong
          style={{
            font: "700 24px/1 var(--police-titre, var(--police-texte))",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Montant valeur={Number(declaration.total_a_verser)} />
        </strong>
        <span style={{ font: "400 12px/1.3 var(--police-texte)", color: "var(--ink-500)" }}>
          dont CNPS <Montant valeur={Number(declaration.cotisations_cnps)} />
        </span>
        <span
          style={{
            marginLeft: "auto",
            font: "600 13px/1.3 var(--police-texte)",
            color: declaration.en_retard ? "var(--danger)" : "var(--ink-700, var(--ink-900))",
          }}
        >
          {declaration.en_retard ? "En retard depuis le " : "À déposer avant le "}
          {dateCourte(declaration.a_deposer_avant)}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 1,
          background: "var(--line-100)",
        }}
      >
        {cases.map((c) => (
          <div key={c.libelle} style={{ background: "var(--surface)", padding: "12px 16px" }}>
            <span
              style={{
                display: "block",
                font: "400 12px/1.3 var(--police-texte)",
                color: "var(--ink-500)",
              }}
            >
              {c.libelle}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: 4,
                font: "600 16px/1.2 var(--police-texte)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {c.brut ? c.valeur : <Montant valeur={Number(c.valeur)} />}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
