import type { Metadata } from "next";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { lireLePlanDeTravail, type LigneDeDossier, type PlanDeTravail, type Tache } from "@/app/lib/plan-de-travail";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Mon plan de travail — Plateforme CGA" };
// Tout dépend du jour : un rendu figé serait faux dès le lendemain.
export const dynamic = "force-dynamic";

/**
 * Mon plan de travail (pas 104). Maquette « Parcours comptable », vue A.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CET ÉCRAN REMPLACE LA QUESTION « PAR QUOI JE COMMENCE ? »
 *
 * * **À traiter** : une file ordonnée par échéance puis par gravité, sur mes seuls dossiers,
 *   chaque ligne menant à l'écran qui fait la tâche.
 * * **Passages de relais** : ce qui attend le réviseur, ce qui me revient avec des remarques.
 * * **Mes dossiers** : où en est chacun, et l'état de la revue du mois précédent.
 *
 * ⚠️ Rien ne se coche ici. Une tâche disparaît quand l'état du dossier change (la pièce est
 * traitée, le mois transmis), pas parce qu'on l'a déclarée faite.
 *
 * Hors du pas : « Tout ouvrir en file », qui enchaînerait les pièces sans repasser par la
 * liste, n'est pas construit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PRIORITES: Record<Tache["priorite"], { libelle: string; couleur: string; fond: string }> = {
  URGENTE: { libelle: "Urgente", couleur: "var(--danger)", fond: "var(--danger-100)" },
  ELEVEE: { libelle: "Élevée", couleur: "var(--warning)", fond: "var(--warning-100)" },
  NORMALE: { libelle: "Normale", couleur: "var(--brand-indigo-700)", fond: "var(--brand-indigo-100)" },
};

const REVUES: Record<LigneDeDossier["revue_du_mois_precedent"], { libelle: string; couleur: string }> = {
  NON_TRANSMIS: { libelle: "Non transmis", couleur: "var(--warning)" },
  TRANSMISE: { libelle: "Chez le réviseur", couleur: "var(--brand-indigo-700)" },
  RENVOYEE: { libelle: "Revenu avec remarques", couleur: "var(--danger)" },
  VALIDEE: { libelle: "Révisé", couleur: "var(--success)" },
  SANS_ECRITURE: { libelle: "Aucune écriture", couleur: "var(--ink-500)" },
};

function jourLong(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default async function MonPlanDeTravail() {
  const acces = await exigerAcces();
  if (!detient(acces, "SAISIR_ECRITURE")) {
    return <EcranReserve titre="Mon plan de travail" permission="SAISIR_ECRITURE" acces={acces} />;
  }
  let plan: PlanDeTravail | null = null;
  let erreur: string | null = null;
  try {
    plan = await lireLePlanDeTravail();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Mon plan de travail" }]} />
      <div className="page-travail">
        {erreur || !plan ? (
          <EtatErreur titre="Le plan de travail ne se lit pas" detail={erreur ?? ""} />
        ) : (
          <>
            <div className="page-travail__titre">
              <h1>Votre journée</h1>
              <p>
                {jourLong(plan.a_la_date)} · {plan.mes_dossiers.length} dossier{plan.mes_dossiers.length > 1 ? "s" : ""} ·{" "}
                {plan.taches.length} tâche{plan.taches.length > 1 ? "s" : ""}
                {plan.taches.filter((t) => t.priorite === "URGENTE").length > 0 &&
                  `, dont ${plan.taches.filter((t) => t.priorite === "URGENTE").length} urgente${plan.taches.filter((t) => t.priorite === "URGENTE").length > 1 ? "s" : ""}`}
              </p>
            </div>

            <Panneau titre="À traiter" aide="Par échéance, puis par gravité ; chaque ligne mène à l'écran qui fait la tâche">
              {plan.taches.length === 0 ? (
                <EtatVide titre="Rien à traiter" detail="Aucune pièce en attente, aucune déclaration proche, aucun mois à reprendre." />
              ) : (
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {plan.taches.map((t, rang) => (
                    <LaTache key={`${t.nature}-${t.dossier}-${t.libelle}-${rang}`} t={t} rang={rang + 1} />
                  ))}
                </ol>
              )}
            </Panneau>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
              <Panneau titre="Passages de relais" aide="Entre vous et le réviseur">
                <div style={{ display: "grid", gap: 6, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)" }}>
                  <span>
                    <strong>{plan.chez_le_reviseur}</strong> dossier{plan.chez_le_reviseur > 1 ? "s" : ""} attend
                    {plan.chez_le_reviseur > 1 ? "ent" : ""} le réviseur
                  </span>
                  <span style={{ color: plan.renvoyes ? "var(--danger)" : undefined }}>
                    <strong>{plan.renvoyes}</strong> dossier{plan.renvoyes > 1 ? "s" : ""} vous revien{plan.renvoyes > 1 ? "nent" : "t"} avec
                    des remarques
                  </span>
                  <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href="/comptabilite/revues">Voir les revues</Link>
                    <Link href="/comptabilite/revues">Transmettre un dossier</Link>
                  </span>
                </div>
              </Panneau>

              <Panneau titre="Mes dossiers" aide="Les plus chargés d'abord">
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {plan.mes_dossiers.map((d) => {
                    const revue = REVUES[d.revue_du_mois_precedent];
                    return (
                      <li key={d.niu} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "9px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
                        <Link href={`/portefeuille/${d.niu}`} style={{ flex: "1 1 180px", fontWeight: 600 }}>
                          {d.denomination}
                        </Link>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {d.taches} tâche{d.taches > 1 ? "s" : ""}
                        </span>
                        <span style={{ flexBasis: "100%", fontSize: 12, color: "var(--ink-500)" }}>
                          {d.prochaine_echeance ? `prochaine échéance ${dateCourte(d.prochaine_echeance)}` : "aucune échéance"} · mois
                          précédent : <span style={{ color: revue.couleur, fontWeight: 600 }}>{revue.libelle}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Panneau>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function LaTache({ t, rang }: { t: Tache; rang: number }) {
  const p = PRIORITES[t.priorite];
  return (
    <li style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "10px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
      <span style={{ width: 22, color: "var(--ink-400)", fontVariantNumeric: "tabular-nums" }}>{rang}</span>
      <span style={{ flex: "1 1 260px", minWidth: 0 }}>
        <Link href={t.lien} style={{ fontWeight: 600 }}>
          {t.libelle}
        </Link>
        <span style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>
          {t.denomination} · {t.volume}
        </span>
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: t.en_retard ? "var(--danger)" : "var(--ink-900)", fontSize: 12.5 }}>
        {t.echeance ? `${t.en_retard ? "échue le" : "avant le"} ${dateCourte(t.echeance)}` : "sans échéance"}
      </span>
      <span style={{ background: p.fond, color: p.couleur, borderRadius: 4, padding: "1px 7px", font: "600 11.5px/1.6 var(--police-texte)" }}>{p.libelle}</span>
    </li>
  );
}
