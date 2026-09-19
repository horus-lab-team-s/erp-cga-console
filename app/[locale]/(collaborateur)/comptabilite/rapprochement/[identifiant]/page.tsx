import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Montant } from "@/app/components/Montant";
import { EtatVide, Panneau } from "@/app/components/Tableau";
import {
  AbandonnerLeReleve,
  ArreterLeRapprochement,
  DissocierLaLigne,
  JustifierLaLigne,
  RapprocherCetteEcriture,
} from "@/app/components/comptabilite/GestesRapprochement";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { LIBELLES_FORCE, NATURES_DE_JUSTIFICATION } from "@/app/lib/libelles-rapprochement";
import { lireRapprochement, signe, type LigneLue, type VueRapprochement } from "@/app/lib/rapprochement";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Rapprochement — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Rapprochement bancaire, l'espace de travail d'un relevé (pas 101).
 * Maquette « Parcours comptable », vue B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ÉCRAN NE MONTRE QUE CE QUI RÉSISTE, AVEC L'ÉCART EN TÊTE
 *
 * Le rapprochement automatique a eu lieu à l'import. En tête : le solde du relevé, le
 * solde comptable, l'écart inexpliqué et ce qui reste à traiter. Les lignes non traitées
 * viennent d'abord ; la ligne choisie (`?ligne=`) s'ouvre à droite avec ses écritures
 * possibles, **chacune avec son motif** (« montant exact · référence présente dans le
 * libellé · date proche ») : le comptable refuse en connaissance de cause.
 *
 * UN MOUVEMENT SANS PIÈCE SE DEMANDE, IL NE SE COMPTABILISE PAS EN ATTENTE
 *
 * Quand aucune écriture ne correspond, l'écran propose d'abord « pièce demandée à
 * l'adhérent » : la demande part à qui relance, et aucune écriture d'attente n'est passée.
 *
 * ⚠️ La sélection passe par l'adresse et non par un état client : un lien vers « la ligne
 * 3 du relevé de juillet » se partage avec le réviseur, et le retour arrière fonctionne.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function etatDe(l: LigneLue): { libelle: string; couleur: string } {
  if (l.appariement)
    return l.appariement.mode === "AUTOMATIQUE"
      ? { libelle: "Rapprochée (auto)", couleur: "var(--success)" }
      : { libelle: "Rapprochée", couleur: "var(--success)" };
  if (l.justification) return { libelle: "Justifiée", couleur: "var(--brand-indigo-700)" };
  if (l.propositions.some((p) => p.force !== "A_ECARTER")) return { libelle: "À rapprocher", couleur: "var(--warning)" };
  return { libelle: "Sans écriture", couleur: "var(--danger)" };
}

export default async function Rapprochement({
  params,
  searchParams,
}: {
  params: Promise<{ identifiant: string }>;
  searchParams: Promise<{ dossier?: string; ligne?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Rapprochement bancaire" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const { identifiant } = await params;
  const { dossier = "", ligne } = await searchParams;

  let vue: VueRapprochement;
  try {
    vue = await lireRapprochement(dossier, identifiant);
  } catch (cause) {
    // Inconnu ou hors périmètre : la même réponse, comme partout ailleurs.
    if (cause instanceof ErreurApi && (cause.statut === 404 || cause.statut === 403)) notFound();
    throw cause;
  }
  const r = vue.rapprochement;
  const enCours = r.statut === "EN_COURS";
  const peutPreparer = enCours && detient(acces, "SAISIR_ECRITURE");
  const choisie = vue.lignes.find((l) => String(l.ligne.rang) === ligne) ?? vue.lignes[0];
  const adresse = (rang: number) => `/comptabilite/rapprochement/${r.identifiant}?dossier=${r.dossier}&ligne=${rang}`;

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Comptabilité", href: "/comptabilite" },
          { libelle: "Rapprochement bancaire", href: `/comptabilite/rapprochement?dossier=${r.dossier}` },
          { libelle: `${r.journal} · ${dateCourte(r.au)}` },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Rapprochement bancaire</h1>
          <p>
            Compte {r.compte} (journal {r.journal}) · relevé du {dateCourte(r.du)} au {dateCourte(r.au)} · {r.lignes.length}{" "}
            ligne{r.lignes.length > 1 ? "s" : ""} · {r.source === "saisie" ? "saisi à la main" : `format ${r.source}`}
          </p>
        </div>

        {r.statut === "VALIDE" && (
          <div className="avertissement-ecran" role="status" style={{ borderColor: "var(--success)", background: "var(--success-100)", color: "var(--ink-900)" }}>
            Rapprochement arrêté le {r.valide_le ? dateCourte(r.valide_le) : "?"} par {r.valide_par} : l&rsquo;état ci-dessous ne
            bougera plus, même si des écritures sont passées ensuite.
          </div>
        )}
        {r.statut === "ABANDONNE" && (
          <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
            Relevé abandonné : {r.motif_abandon}. La période est libre pour un nouvel import.
          </div>
        )}

        <Compteurs vue={vue} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, alignItems: "start" }}>
          <Panneau titre="Lignes du relevé" aide="Non rapprochées d'abord">
            {/* ⚠️ Une liste et non un tableau à colonnes fixes (pas 101) : sur téléphone, les
                colonnes date, montant et état ne laissaient aucune largeur au libellé, qui
                disparaissait. Chaque ligne passe à la ligne à la place. */}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {vue.lignes.map((l) => {
                const e = etatDe(l);
                const selection = l.ligne.rang === choisie?.ligne.rang;
                return (
                  <li
                    key={l.ligne.rang}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      gap: "2px 12px",
                      padding: "9px 16px",
                      borderBottom: "1px solid var(--line-100)",
                      background: selection ? "var(--brand-magenta-100)" : undefined,
                      font: "400 13px/1.4 var(--police-texte)",
                    }}
                  >
                    <Link
                      href={adresse(l.ligne.rang)}
                      aria-current={selection ? "true" : undefined}
                      style={{ flex: "1 1 220px", minWidth: 0, fontWeight: selection ? 600 : 500, overflowWrap: "anywhere" }}
                    >
                      {l.ligne.libelle}
                    </Link>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      <Montant valeur={signe(l.ligne.montant, l.ligne.sens)} />
                    </span>
                    <span style={{ flexBasis: "100%", display: "flex", gap: 12, font: "400 12px/1.4 var(--police-texte)" }}>
                      <span style={{ color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}>{dateCourte(l.ligne.date)}</span>
                      <span style={{ color: e.couleur, fontWeight: 600 }}>{e.libelle}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panneau>

          {choisie && <LigneChoisie l={choisie} vue={vue} peutPreparer={peutPreparer} />}
        </div>

        <Panneau
          titre="Écritures absentes du relevé"
          aide="Mouvements du compte sur la période que la banque n'a pas encore passés (chèque émis non encaissé…)"
        >
          {vue.mouvements_non_rapproches.length === 0 ? (
            <EtatVide titre="Aucune" detail="Toutes les écritures de la période figurent au relevé." />
          ) : (
            vue.mouvements_non_rapproches.map((m) => (
              <div key={`${m.ecriture}-${m.ligne}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "8px 16px", borderBottom: "1px solid var(--line-100)", font: "400 12.5px/1.4 var(--police-texte)" }}>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-500)" }}>{dateCourte(m.date)}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.ecriture}</span>
                <span style={{ flex: "1 1 160px", minWidth: 0 }}>{m.libelle}</span>
                <Montant valeur={signe(m.montant, m.sens)} />
              </div>
            ))
          )}
        </Panneau>

        <EtatDeRapprochement vue={vue} />

        {peutPreparer && (
          <Panneau titre="Arrêter" aide="Chaque ligne expliquée, aucun écart, et des écritures validées">
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", padding: "12px 16px" }}>
              {detient(acces, "VALIDER_ECRITURE") ? (
                <ArreterLeRapprochement dossier={r.dossier} identifiant={r.identifiant} pret={vue.etat.a_traiter === 0 && Number(vue.etat.ecart_inexplique) === 0} />
              ) : (
                <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                  Arrêter le rapprochement demande la permission VALIDER_ECRITURE.
                </p>
              )}
              <span style={{ marginLeft: "auto" }}>
                <AbandonnerLeReleve dossier={r.dossier} identifiant={r.identifiant} />
              </span>
            </div>
          </Panneau>
        )}
      </div>
    </>
  );
}

function Compteurs({ vue }: { vue: VueRapprochement }) {
  const e = vue.etat;
  const ecart = Number(e.ecart_inexplique);
  const cases = [
    { libelle: `Solde du relevé au ${dateCourte(e.au)}`, valeur: <Montant valeur={e.solde_releve} avecDevise />, detail: null },
    { libelle: "Solde comptable", valeur: <Montant valeur={e.solde_comptable} avecDevise />, detail: null },
    {
      libelle: "Écart inexpliqué",
      valeur: <span style={{ color: ecart === 0 ? "var(--success)" : "var(--danger)" }}><Montant valeur={e.ecart_inexplique} avecDevise /></span>,
      detail: ecart === 0 ? "tout ce qui diffère est expliqué" : "à trouver avant d'arrêter",
    },
    {
      libelle: "Lignes à traiter",
      valeur: <span style={{ color: e.a_traiter ? "var(--warning)" : "var(--success)" }}>{e.a_traiter}</span>,
      detail: `${e.automatiques} rapprochée${e.automatiques > 1 ? "s" : ""} automatiquement, ${e.rapprochees - e.automatiques} à la main, ${e.justifiees} justifiée${e.justifiees > 1 ? "s" : ""}`,
    },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 1, background: "var(--line-200)", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", overflow: "hidden" }}>
      {cases.map((c) => (
        <div key={c.libelle} style={{ background: "var(--surface)", padding: "12px 16px" }}>
          <span style={{ display: "block", font: "400 12px/1.3 var(--police-texte)", color: "var(--ink-500)" }}>{c.libelle}</span>
          <strong style={{ display: "block", marginTop: 4, font: "700 20px/1.2 var(--police-texte)", fontVariantNumeric: "tabular-nums" }}>{c.valeur}</strong>
          {c.detail && <span style={{ display: "block", marginTop: 2, font: "400 11.5px/1.35 var(--police-texte)", color: "var(--ink-500)" }}>{c.detail}</span>}
        </div>
      ))}
    </div>
  );
}

function LigneChoisie({ l, vue, peutPreparer }: { l: LigneLue; vue: VueRapprochement; peutPreparer: boolean }) {
  const r = vue.rapprochement;
  const d = { dossier: r.dossier, identifiant: r.identifiant, rang: l.ligne.rang };
  const utiles = l.propositions.filter((p) => p.force !== "A_ECARTER");
  const texte: React.CSSProperties = { margin: 0, font: "400 12.5px/1.5 var(--police-texte)" };
  return (
    <Panneau titre="Ligne sélectionnée" aide={`Ligne ${l.ligne.rang} du relevé`}>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", margin: "12px 16px", font: "400 13px/1.45 var(--police-texte)" }}>
        <dt style={{ color: "var(--ink-500)" }}>Date</dt>
        <dd style={{ margin: 0 }}>{dateCourte(l.ligne.date)}</dd>
        <dt style={{ color: "var(--ink-500)" }}>Libellé bancaire</dt>
        <dd style={{ margin: 0, fontWeight: 600 }}>{l.ligne.libelle}</dd>
        <dt style={{ color: "var(--ink-500)" }}>Montant</dt>
        <dd style={{ margin: 0 }}>
          <Montant valeur={signe(l.ligne.montant, l.ligne.sens)} avecDevise /> ({l.ligne.sens === "DEBIT" ? "entrée" : "sortie"})
        </dd>
      </dl>

      {l.appariement ? (
        <div style={{ padding: "0 16px 14px", display: "grid", gap: 6 }}>
          <p style={texte}>
            Rapprochée de <strong>{l.appariement.ecriture}</strong>
            {l.mouvement && ` (${l.mouvement.libelle}, ${dateCourte(l.mouvement.date)})`}
            {l.appariement.mode === "AUTOMATIQUE" ? ", automatiquement" : `, par ${l.appariement.par}`}.
          </p>
          {l.appariement.motifs.length > 0 && <p style={{ ...texte, color: "var(--ink-500)" }}>{l.appariement.motifs.join(" · ")}</p>}
          {peutPreparer && (
            <div>
              <DissocierLaLigne d={d} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, padding: "0 16px 14px" }}>
          {l.justification && (
            <p style={{ ...texte, color: "var(--brand-indigo-700)" }}>
              Justifiée : {NATURES_DE_JUSTIFICATION.find((n) => n.valeur === l.justification!.nature)?.libelle} ({l.justification.motif}),
              par {l.justification.par}.
            </p>
          )}
          <strong style={{ font: "600 12.5px/1.4 var(--police-texte)" }}>Écritures proposées</strong>
          {l.propositions.length === 0 ? (
            <p style={{ ...texte, color: "var(--ink-500)" }}>
              Aucune écriture du compte ne porte ce montant dans les {vue.reglages.fenetre_jours} jours. Si aucune pièce ne
              justifie ce mouvement, demandez-la à l&rsquo;adhérent avant de comptabiliser une charge sans justificatif.
            </p>
          ) : (
            l.propositions.map((p) => {
              const force = LIBELLES_FORCE[p.force];
              return (
                <div
                  key={`${p.mouvement.ecriture}-${p.mouvement.ligne}`}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap", border: `1px solid ${p.force === "FORTE" ? "var(--success)" : "var(--line-200)"}`, borderRadius: "var(--rayon-petit)", padding: "8px 10px" }}
                >
                  <div style={{ flex: 1, minWidth: 180, display: "grid", gap: 2 }}>
                    <span style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <strong style={{ font: "600 12.5px/1.4 var(--police-texte)", fontVariantNumeric: "tabular-nums" }}>{p.mouvement.ecriture}</strong>
                      <span style={{ background: force.fond, color: force.couleur, borderRadius: 4, padding: "1px 6px", font: "600 11px/1.5 var(--police-texte)" }}>{force.libelle}</span>
                    </span>
                    <span style={{ font: "400 12px/1.45 var(--police-texte)" }}>
                      {p.mouvement.libelle} · {dateCourte(p.mouvement.date)}
                      {p.mouvement.reference && ` · ${p.mouvement.reference}`}
                    </span>
                    <span style={{ font: "400 11.5px/1.45 var(--police-texte)", color: "var(--ink-500)" }}>{p.motifs.join(" · ")}</span>
                  </div>
                  {peutPreparer && p.force !== "A_ECARTER" && <RapprocherCetteEcriture d={d} ecriture={p.mouvement.ecriture} ligne={p.mouvement.ligne} />}
                </div>
              );
            })
          )}
          {peutPreparer && (
            <>
              <p style={{ ...texte, color: "var(--ink-500)" }}>
                L&rsquo;écriture manque ?{" "}
                <Link href={`/comptabilite/saisie?dossier=${r.dossier}&exercice=${r.exercice}&journal=${r.journal}`}>Créer l&rsquo;écriture</Link>{" "}
                dans le journal {r.journal}, puis revenir ici : elle sera proposée.
              </p>
              <JustifierLaLigne d={d} sansProposition={utiles.length === 0} />
            </>
          )}
        </div>
      )}
    </Panneau>
  );
}

/**
 * La formule, écrite : un comptable junior doit pouvoir refaire le calcul à la main.
 *
 * ⚠️ Chaque ligne affiche le montant **qui s'ajoute**, jamais un montant précédé d'un
 * signe dans son libellé. « − opérations sans écriture : 18 500 » se lisait comme une
 * soustraction alors que le calcul ajoutait 18 500 (des frais de −18 500 à neutraliser).
 * Défaut trouvé au parcours réel du pas 101.
 */
function EtatDeRapprochement({ vue }: { vue: VueRapprochement }) {
  const e = vue.etat;
  const rectifie = Number(e.solde_releve) - Number(e.releve_non_rapproche) + Number(e.comptable_non_rapproche);
  const lignes: [string, string | number, boolean?][] = [
    ["Solde du relevé", e.solde_releve, true],
    ["Neutraliser les opérations du relevé sans écriture", -Number(e.releve_non_rapproche)],
    ["Ajouter les écritures absentes du relevé", e.comptable_non_rapproche],
    ["Solde bancaire rectifié", rectifie, true],
    ["Solde comptable", e.solde_comptable, true],
    ["Écart inexpliqué (rectifié moins comptable)", e.ecart_inexplique, true],
  ];
  return (
    <Panneau titre="État de rapprochement" aide={vue.rapprochement.statut === "VALIDE" ? "Arrêté" : "Recalculé à chaque geste"}>
      <div style={{ padding: "8px 16px 12px", maxWidth: 520 }}>
        {lignes.map(([libelle, montant, gras]) => (
          <div key={libelle} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--line-100)", font: `${gras ? 600 : 400} 13px/1.4 var(--police-texte)` }}>
            <span>{libelle}</span>
            <Montant valeur={montant} avecDevise />
          </div>
        ))}
      </div>
    </Panneau>
  );
}
