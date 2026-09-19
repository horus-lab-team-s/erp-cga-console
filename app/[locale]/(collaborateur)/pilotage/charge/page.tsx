import type { Metadata } from "next";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ValiderLaReaffectation } from "@/app/components/pilotage/ValiderLaReaffectation";
import { LIBELLES_ROLE, detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { lireLaChargeEtLaProduction, type ChargeEtProduction, type LigneDeCharge } from "@/app/lib/pilotage";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Charge et production — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * Charge et production (pas 105). Maquette « Pilotage direction », vue C.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUI EST SATURÉ, CE QUI AVANCE, CE QU'IL FAUT RÉAFFECTER
 *
 * * **Collaborateurs** : la charge en pour cent de la capacité du rôle, avec ce qui la compose
 *   (dossiers, pièces en attente, échéances du mois, retards) et la production du mois sur
 *   leurs dossiers (pièces reçues et traitées, écritures validées, remarques de revue).
 * * **Réaffectations proposées** : chacune avec sa raison chiffrée. Valider ouvre le motif ;
 *   la réaffectation est un acte des accès, qui prévient les deux collaborateurs et le chargé
 *   de clientèle.
 *
 * ⚠️ Ni classement ni note de personne : l'écran dit comment le travail se répartit. La
 * production est celle **des dossiers portés**, parce que la plateforme ne sait pas qui a
 * traité une pièce. « Production par agence » de la maquette n'est pas construite : le cabinet
 * n'a pas d'agence dans le système.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function ChargeEtProductionPage() {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_PILOTAGE")) {
    return <EcranReserve titre="Charge et production" permission="LIRE_PILOTAGE" acces={acces} />;
  }
  let vue: ChargeEtProduction | null = null;
  let erreur: string | null = null;
  try {
    vue = await lireLaChargeEtLaProduction();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }
  const peutReaffecter = detient(acces, "AFFECTER_DOSSIER");
  const mois = vue ? new Date(`${vue.mois_du}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Pilotage", href: "/pilotage" }, { libelle: "Charge et production" }]} />
      <div className="page-travail">
        {erreur || !vue ? (
          <EtatErreur titre="La charge ne se lit pas" detail={erreur ?? ""} />
        ) : (
          <>
            <div className="page-travail__titre">
              <h1>Charge et production</h1>
              <p>
                {mois} · {vue.dossiers} dossiers · {vue.echeances_du_mois} échéance{vue.echeances_du_mois > 1 ? "s" : ""} ce mois ·
                saturation au-delà de {vue.reglages.seuil_de_saturation} % ({vue.reglages.source})
              </p>
            </div>

            <Panneau titre="Collaborateurs" aide="Charge pondérée et production du mois sur leurs dossiers ; ceci n'évalue personne">
              {vue.collaborateurs.length === 0 ? (
                <EtatVide titre="Aucun collaborateur à portée explicite" />
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {vue.collaborateurs.map((c) => (
                    <Collaborateur key={c.habilitation} c={c} seuil={vue.reglages.seuil_de_saturation} />
                  ))}
                </ul>
              )}
            </Panneau>

            <Panneau titre="Réaffectations proposées" aide={`Vers un collègue du même rôle, sans dépasser ${vue.reglages.seuil_cible} %`}>
              {vue.propositions.length === 0 ? (
                <EtatVide titre="Aucune réaffectation à proposer" detail="Personne n'est saturé, ou aucun collègue du même rôle n'a la marge de reprendre un dossier." />
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {vue.propositions.map((p) => (
                    <li key={`${p.dossier}-${p.vers_habilitation}`} style={{ display: "grid", gap: 6, padding: "12px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.5 var(--police-texte)" }}>
                      <strong>
                        {p.denomination} : {p.de_nom} → {p.vers_nom}
                      </strong>
                      <span style={{ color: "var(--ink-500)", fontSize: 12.5 }}>{p.raison}</span>
                      <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                        {p.de_nom} : {p.charge_de_avant} % → {p.charge_de_apres} % · {p.vers_nom} : {p.charge_vers_avant} % → {p.charge_vers_apres} %
                      </span>
                      {peutReaffecter ? (
                        <ValiderLaReaffectation dossier={p.dossier} de={p.de_habilitation} vers={p.vers_habilitation} libelle={p.denomination} />
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>Réaffecter demande la permission AFFECTER_DOSSIER.</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ margin: 0, padding: "8px 16px 12px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                Une réaffectation prévient les deux collaborateurs et le chargé de clientèle du dossier ; l&rsquo;adhérent n&rsquo;est pas
                notifié. Calculé le {dateCourte(vue.a_la_date)}.
              </p>
            </Panneau>
          </>
        )}
      </div>
    </>
  );
}

function Collaborateur({ c, seuil }: { c: LigneDeCharge; seuil: number }) {
  const couleur = c.sature ? "var(--danger)" : c.charge !== null && c.charge > seuil - 15 ? "var(--warning)" : "var(--success)";
  const largeur = Math.min(c.charge ?? 0, 130);
  return (
    <li style={{ display: "grid", gap: 4, padding: "11px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
      <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px" }}>
        <strong style={{ flex: "1 1 180px" }}>{c.nom}</strong>
        <span style={{ color: "var(--ink-500)", fontSize: 12 }}>{LIBELLES_ROLE[c.role as keyof typeof LIBELLES_ROLE] ?? c.role}</span>
        <strong style={{ color: c.charge === null ? "var(--ink-500)" : couleur, fontVariantNumeric: "tabular-nums" }}>
          {c.charge === null ? `${c.points} points (capacité non réglée)` : `${c.charge} %`}
          {c.sature && " · saturé"}
        </strong>
      </span>
      {c.charge !== null && (
        <span aria-hidden style={{ display: "block", height: 6, background: "var(--line-100)", borderRadius: 3, overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${(largeur / 130) * 100}%`, background: couleur }} />
        </span>
      )}
      <span style={{ fontSize: 12, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}>
        {c.dossiers} dossier{c.dossiers > 1 ? "s" : ""} · {c.pieces_en_attente} pièce{c.pieces_en_attente > 1 ? "s" : ""} en attente ·{" "}
        {c.echeances_du_mois} échéance{c.echeances_du_mois > 1 ? "s" : ""} ce mois · {c.retards} retard{c.retards > 1 ? "s" : ""}
      </span>
      <span style={{ fontSize: 12, color: "var(--ink-500)", fontVariantNumeric: "tabular-nums" }}>
        Ce mois sur ses dossiers : {c.pieces_traitees_du_mois} pièce{c.pieces_traitees_du_mois > 1 ? "s" : ""} reçue
        {c.pieces_traitees_du_mois > 1 ? "s" : ""} et traitée{c.pieces_traitees_du_mois > 1 ? "s" : ""} · {c.ecritures_du_mois} écriture
        {c.ecritures_du_mois > 1 ? "s" : ""} validée{c.ecritures_du_mois > 1 ? "s" : ""} · {c.reprises_du_mois} remarque
        {c.reprises_du_mois > 1 ? "s" : ""} de revue
      </span>
    </li>
  );
}
