import type { Metadata } from "next";

import { Montant } from "@/app/components/Montant";
import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { CreerLaContrepassation, SignalerAuReviseur } from "@/app/components/comptabilite/GestesFicheEcriture";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import {
  lireLApercuDeContrepassation,
  lireLaFicheDEcriture,
  lireLImpactDeLaContrepassation,
  type ApercuDeContrepassation,
  type FicheDEcriture,
  type ImpactDeLaContrepassation,
  type LigneDeFiche,
} from "@/app/lib/fiche-ecriture";
import { dateCourte } from "@/app/lib/formats";
import { aujourdhui, lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Écriture — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * La fiche d'une écriture (pas 110). Maquette « Parcours comptable », vue E.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE ÉCRITURE VALIDÉE NE SE MODIFIE NI NE SE SUPPRIME
 *
 * La fiche le dit en tête, puis montre ce qui peut se faire : contre-passer, dupliquer pour une
 * nouvelle saisie, ouvrir la pièce, signaler au réviseur.
 *
 * LA CONTRE-PASSATION SE VOIT AVANT DE SE CRÉER
 *
 * `?contrepasser=AAAA-MM-JJ` ouvre le panneau : le serveur calcule l'aperçu (les lignes inversées,
 * non modifiables, ou le refus dans les mots du geste) et l'impact sur la déclaration de TVA du
 * mois (« sera recalculée », ou « déjà déposée : rectificative »). Changer la date recalcule les
 * deux. Rien n'est écrit avant « Créer la contre-passation ».
 * ─────────────────────────────────────────────────────────────────────────────
 */

const nomsDesMois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function moisDe(jour: string) {
  return `${nomsDesMois[Number(jour.slice(5, 7)) - 1]} ${jour.slice(0, 4)}`;
}

function attribut(ligne: LigneDeFiche): string {
  const a = ligne.attribut_fiscal;
  if (!a) return "—";
  const morceaux = [];
  if (a.tva_deductible === false) morceaux.push("TVA non déductible");
  if (a.charge_deductible === false) morceaux.push("charge non déductible");
  if (a.code_regle_origine) morceaux.push(a.code_regle_origine);
  return morceaux.join(" · ") || "neutre";
}

export default async function FicheEcriture({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; exercice?: string; journal?: string; numero?: string; contrepasser?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Écriture" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const brut = await searchParams;
  const miettes = [{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Écriture" }];
  const numero = Number(brut.numero);
  if (!brut.dossier || !brut.exercice || !brut.journal || !Number.isInteger(numero) || numero < 1) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatVide titre="Choisir une écriture" detail="La fiche s'ouvre depuis le journal, le grand livre ou une notification." />
        </div>
      </>
    );
  }
  const ids = { dossier: brut.dossier, exercice: brut.exercice, journal: brut.journal, numero };
  let fiche: FicheDEcriture;
  try {
    fiche = await lireLaFicheDEcriture(ids.dossier, ids.exercice, ids.journal, numero);
  } catch (erreur) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatErreur titre="L'écriture ne se lit pas" detail={erreur instanceof ErreurApi ? erreur.message : String(erreur)} />
        </div>
      </>
    );
  }
  const e = fiche.ecriture;
  const dossiers = await lireDossiers().catch(() => []);
  const denomination = dossiers.find((d) => d.niu === ids.dossier)?.denomination ?? ids.dossier;
  const peutSaisir = detient(acces, "SAISIR_ECRITURE");
  const validee = e.etat === "VALIDEE";
  const cle = `${e.exercice}/${e.journal}/${String(e.numero).padStart(6, "0")}`;
  const base = `/comptabilite/ecritures?dossier=${encodeURIComponent(ids.dossier)}&exercice=${ids.exercice}&journal=${ids.journal}&numero=${numero}`;

  const dateContrepassation = brut.contrepasser && /^\d{4}-\d{2}-\d{2}$/.test(brut.contrepasser) ? brut.contrepasser : null;
  let apercu: ApercuDeContrepassation | null = null;
  let impact: ImpactDeLaContrepassation | null = null;
  if (dateContrepassation && peutSaisir && fiche.peut_contrepasser) {
    [apercu, impact] = await Promise.all([
      lireLApercuDeContrepassation(ids.dossier, ids.exercice, ids.journal, numero, dateContrepassation),
      lireLImpactDeLaContrepassation(ids.dossier, ids.exercice, ids.journal, numero, dateContrepassation).catch(() => null),
    ]);
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: denomination }, { libelle: `Écriture ${cle}` }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Écriture {cle}</h1>
          <p>
            {denomination} · journal {e.journal} · du {dateCourte(e.date_operation)}
            {e.validee_le && ` · validée le ${dateCourte(e.validee_le)}`}
            {fiche.historique.find((h) => h.quoi === "Validée")?.qui && ` par ${fiche.historique.find((h) => h.quoi === "Validée")!.qui}`}
          </p>
        </div>

        <div role="status" className={validee ? "avertissement-ecran avertissement-ecran--reserve" : "avertissement-ecran avertissement-ecran--reserve"}>
          <strong>{validee ? "Validée, non modifiable." : "Brouillon, modifiable depuis la saisie."}</strong>
          {validee && " Une écriture validée ne se modifie ni ne se supprime : la correction passe par une contre-passation, qui conserve les deux mouvements au grand livre."}
          <span style={{ display: "block", marginTop: 4 }}>
            {fiche.exercice_clos
              ? `Exercice ${e.exercice} clos : seule une écriture de l'exercice suivant est possible.`
              : fiche.verrou
                ? `La période de ${moisDe(e.date_operation)} est verrouillée depuis le ${dateCourte(fiche.verrou.depuis)} (${fiche.verrou.par}) : une contre-passation se date d'un mois ouvert.`
                : `La période de ${moisDe(e.date_operation)} n'est pas encore verrouillée. Après sa transmission au réviseur, une correction se datera d'un mois ouvert.`}
          </span>
        </div>

        <div className="page-travail__duo">
          <Panneau titre="Lignes" aide={e.libelle}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", font: "400 12.5px/1.5 var(--police-texte)" }}>
                <thead>
                  <tr style={{ background: "var(--brand-indigo-100)", textAlign: "left" }}>
                    <th style={{ padding: "6px 10px" }}>Compte</th>
                    <th style={{ padding: "6px 10px" }}>Libellé</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Débit</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Crédit</th>
                    <th style={{ padding: "6px 10px" }}>Attribut fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lignes.map((l, rang) => (
                    <tr key={rang} style={{ borderBottom: "1px solid var(--line-100)" }}>
                      <td style={{ padding: "6px 10px", fontVariantNumeric: "tabular-nums" }}>
                        <Link href={`/comptabilite?dossier=${encodeURIComponent(ids.dossier)}&exercice=${e.exercice}&compte=${l.compte}`}>{l.compte}</Link>
                      </td>
                      <td style={{ padding: "6px 10px" }}>{l.libelle}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{l.sens === "DEBIT" ? <Montant valeur={l.montant} /> : ""}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{l.sens === "CREDIT" ? <Montant valeur={l.montant} /> : ""}</td>
                      <td style={{ padding: "6px 10px", color: l.attribut_fiscal?.tva_deductible === false ? "var(--warning)" : "var(--ink-500)" }}>{attribut(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panneau>

          <Panneau titre="Historique de l'écriture">
            <ol style={{ listStyle: "none", margin: 0, padding: "8px 14px", display: "grid", gap: 8 }}>
              {fiche.historique.map((h, rang) => (
                <li key={rang} style={{ font: "400 12.5px/1.5 var(--police-texte)" }}>
                  <span style={{ color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}>{h.quand ? dateCourte(h.quand) : "date non conservée"}</span> · {h.quoi}
                  {h.qui && <span style={{ color: "var(--ink-500)" }}> · {h.qui}</span>}
                </li>
              ))}
            </ol>
          </Panneau>
        </div>

        <Panneau titre="Actions">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "12px 14px" }}>
            {peutSaisir && fiche.peut_contrepasser && !dateContrepassation && (
              <Link href={`${base}&contrepasser=${aujourdhui()}`} className="action-principale">
                Contre-passer cette écriture
              </Link>
            )}
            {peutSaisir && (
              <Link href={`/comptabilite/saisie?dossier=${encodeURIComponent(ids.dossier)}&exercice=${e.exercice}&modele=${e.journal}/${e.numero}`} className="action-secondaire">
                Dupliquer pour une nouvelle saisie
              </Link>
            )}
            {e.piece_justificative && (
              <Link href={`/recherche?q=${encodeURIComponent(e.piece_justificative)}`} className="action-secondaire">
                Ouvrir la pièce {e.piece_justificative}
              </Link>
            )}
            {peutSaisir && <SignalerAuReviseur ids={ids} />}
          </div>
          {fiche.raison_de_ne_pas_contrepasser && (
            <p style={{ margin: 0, padding: "0 14px 12px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              {fiche.raison_de_ne_pas_contrepasser}
              {fiche.contrepassee_par.map((inverse) => {
                const [ex, jnl, num] = inverse.split("/");
                return (
                  <span key={inverse}>
                    {" "}
                    <Link href={`/comptabilite/ecritures?dossier=${encodeURIComponent(ids.dossier)}&exercice=${ex}&journal=${jnl}&numero=${Number(num)}`}>Ouvrir {inverse}</Link>
                  </span>
                );
              })}
            </p>
          )}
        </Panneau>

        {dateContrepassation && apercu && (
          <Panneau titre={`Contre-passer l'écriture ${cle}`} aide="Une écriture inverse est créée à la date choisie. L'écriture d'origine reste au grand livre.">
            <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end", padding: "12px 14px" }}>
              <input type="hidden" name="dossier" value={ids.dossier} />
              <input type="hidden" name="exercice" value={ids.exercice} />
              <input type="hidden" name="journal" value={ids.journal} />
              <input type="hidden" name="numero" value={numero} />
              <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
                Date de contre-passation
                <input type="date" name="contrepasser" defaultValue={dateContrepassation} min={e.date_operation} style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }} />
              </label>
              <span style={{ font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>Journal {e.journal} : la contre-passation reste dans le journal de l&rsquo;écriture qu&rsquo;elle annule.</span>
              <button type="submit" className="action-secondaire">
                Recalculer
              </button>
            </form>
            {apercu.refus ? (
              <p role="alert" style={{ margin: 0, padding: "0 14px 12px", color: "var(--danger)", font: "400 13px/1.5 var(--police-texte)" }}>
                {apercu.refus}
              </p>
            ) : (
              apercu.inverse && (
                <>
                  <div style={{ overflowX: "auto", padding: "0 14px" }}>
                    <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", font: "400 12.5px/1.5 var(--police-texte)" }}>
                      <caption style={{ textAlign: "left", font: "600 12px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
                        Lignes proposées, inversées et non modifiables · {apercu.inverse.journal} n° {apercu.inverse.numero} pressenti
                      </caption>
                      <tbody>
                        {apercu.inverse.lignes.map((l, rang) => (
                          <tr key={rang} style={{ borderBottom: "1px solid var(--line-100)" }}>
                            <td style={{ padding: "5px 8px", fontVariantNumeric: "tabular-nums" }}>{l.compte}</td>
                            <td style={{ padding: "5px 8px" }}>{l.libelle}</td>
                            <td style={{ padding: "5px 8px", textAlign: "right" }}>{l.sens === "DEBIT" ? <Montant valeur={l.montant} /> : ""}</td>
                            <td style={{ padding: "5px 8px", textAlign: "right" }}>{l.sens === "CREDIT" ? <Montant valeur={l.montant} /> : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {impact && (
                    <p
                      style={{
                        margin: "10px 14px 0",
                        padding: "8px 10px",
                        borderLeft: `3px solid ${impact.deja_deposee ? "var(--danger)" : "var(--warning)"}`,
                        background: impact.deja_deposee ? "var(--danger-100)" : "var(--warning-100)",
                        font: "400 12.5px/1.6 var(--police-texte)",
                      }}
                    >
                      {impact.message}
                      {impact.avant && impact.apres && (
                        <span style={{ display: "block" }}>
                          TVA à payer : <Montant valeur={impact.avant.tva_a_payer} /> → <Montant valeur={impact.apres.tva_a_payer} /> · crédit à reporter :{" "}
                          <Montant valeur={impact.avant.credit_a_reporter} /> → <Montant valeur={impact.apres.credit_a_reporter} /> FCFA
                        </span>
                      )}
                    </p>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    <CreerLaContrepassation ids={ids} dateOperation={dateContrepassation} />
                    <p style={{ margin: "6px 0 0" }}>
                      <Link href={base}>Annuler</Link>
                    </p>
                  </div>
                </>
              )
            )}
          </Panneau>
        )}
      </div>
    </>
  );
}
