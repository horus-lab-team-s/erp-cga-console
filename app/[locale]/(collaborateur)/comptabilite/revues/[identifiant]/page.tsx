import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Montant } from "@/app/components/Montant";
import { EtatVide, Panneau } from "@/app/components/Tableau";
import {
  CloreLaRemarque,
  PoserUneRemarque,
  RenvoyerLeMois,
  RepondreALaRemarque,
  RetransmettreLeMois,
  ValiderLeMois,
} from "@/app/components/comptabilite/GestesRevue";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { dateCourte } from "@/app/lib/formats";
import { LIBELLES_NATURE_OBJET, LIBELLES_STATUT_REMARQUE, LIBELLES_STATUT_REVUE } from "@/app/lib/libelles-revue";
import { lireLaRevue, type Remarque, type VueRevue } from "@/app/lib/revue";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Revue d'un mois — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * La revue d'un mois transmis (pas 102). Maquette « Parcours réviseur », vue D.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DANS L'ORDRE DU TRAVAIL DU RÉVISEUR
 *
 * 1. **Les points de contrôle** automatiques (brouillons, numérotation, équilibre,
 *    rapprochement bancaire arrêté) : ils informent, le réviseur juge.
 * 2. **L'échantillon** : les écritures atypiques, chacune avec ses raisons, et
 *    « Remarquer » à côté de chacune.
 * 3. **Les remarques**, toujours rattachées à une écriture, une pièce ou un compte.
 * 4. **Renvoyer** ou **valider**.
 *
 * Le comptable voit le même écran : il répond sous chaque remarque ouverte, puis
 * retransmet. Les gestes ne s'affichent que pour qui peut les faire, à l'état où ils sont
 * permis ; le backend refuse de toute façon les autres.
 *
 * ⚠️ « Corriger moi-même », dans la maquette, est la contre-passation existante (sur
 * l'écriture) : elle porte le nom du réviseur. L'écran ne la duplique pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ACTES: Record<string, string> = {
  TRANSMISE: "Transmis",
  RENVOYEE: "Renvoyé au comptable",
  VALIDEE: "Validé",
};

export default async function Revue({
  params,
  searchParams,
}: {
  params: Promise<{ identifiant: string }>;
  searchParams: Promise<{ dossier?: string }>;
}) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Revue d'un mois" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const { identifiant } = await params;
  const { dossier = "" } = await searchParams;
  let vue: VueRevue;
  try {
    vue = await lireLaRevue(dossier, identifiant);
  } catch (cause) {
    if (cause instanceof ErreurApi && (cause.statut === 404 || cause.statut === 403)) notFound();
    throw cause;
  }
  const r = vue.revue;
  const ids = { dossier: r.dossier, identifiant: r.identifiant };
  const reviseur = detient(acces, "REVISER_DOSSIER");
  const comptable = detient(acces, "SAISIR_ECRITURE");
  const transmise = r.statut === "TRANSMISE";
  const renvoyee = r.statut === "RENVOYEE";
  const statut = LIBELLES_STATUT_REVUE[r.statut];
  const ouvertes = r.remarques.filter((m) => m.statut === "OUVERTE").length;
  const nonCloses = r.remarques.filter((m) => m.statut !== "CLOSE").length;
  const objets = {
    ECRITURE: vue.ecritures.map((e) => e.cle),
    PIECE: [...new Set(vue.ecritures.flatMap((e) => (e.piece ? [e.piece] : [])))].sort(),
    COMPTE: [...new Set(vue.ecritures.flatMap((e) => e.comptes))].sort(),
  };
  const dernier = r.historique[r.historique.length - 1];
  // Le nom du dossier plutôt que son NIU : c'est ce que le réviseur reconnaît.
  const denomination = (await lireDossiers()).find((d) => d.niu === r.dossier)?.denomination ?? `Dossier ${r.dossier}`;

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Comptabilité", href: "/comptabilite" },
          { libelle: "Revue des dossiers", href: "/comptabilite/revues" },
          { libelle: `${dateCourte(r.du)} au ${dateCourte(r.au)}` },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Revue du {dateCourte(r.du)} au {dateCourte(r.au)}</h1>
          <p>
            {denomination} · transmis par {r.transmise_par} ·{" "}
            <span style={{ color: statut.couleur, fontWeight: 600 }}>{statut.libelle}</span> · {r.remarques.length} remarque
            {r.remarques.length > 1 ? "s" : ""}, dont {nonCloses} non close{nonCloses > 1 ? "s" : ""}
          </p>
        </div>

        {dernier.message && (
          <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
            {/* `display: inline` : le style du bandeau met le gras en bloc, et le nom se retrouvait
                seul sur sa ligne, la phrase commençant par une virgule (pas 102). */}
            <strong style={{ display: "inline", fontWeight: 600 }}>{dernier.par}</strong>, le {dateCourte(dernier.le)} : « {dernier.message} »
          </div>
        )}

        <Panneau titre="Points de contrôle" aide="Automatiques : ils informent, le réviseur juge">
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {vue.points.map((p) => (
              <li key={p.code} style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", padding: "8px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
                <span aria-hidden style={{ color: p.conforme ? "var(--success)" : "var(--warning)", fontWeight: 700 }}>
                  {p.conforme ? "✓" : "!"}
                </span>
                <span style={{ fontWeight: 600, flex: "1 1 220px" }}>{p.libelle}</span>
                <span style={{ color: p.conforme ? "var(--ink-500)" : "var(--warning)", fontSize: 12.5 }}>{p.detail}</span>
              </li>
            ))}
          </ul>
        </Panneau>

        <Panneau
          titre="Échantillon"
          aide={`${r.echantillon.length} écriture${r.echantillon.length > 1 ? "s" : ""} atypique${r.echantillon.length > 1 ? "s" : ""} sur ${r.ecritures_du_mois}, figé à la transmission`}
        >
          {r.echantillon.length === 0 ? (
            <EtatVide titre="Aucune écriture atypique" detail="Le réviseur peut remarquer toute écriture du mois avec « Nouvelle remarque »." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {r.echantillon.map((e) => (
                <li key={e.ecriture} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 12px", padding: "9px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.45 var(--police-texte)" }}>
                  <strong style={{ fontVariantNumeric: "tabular-nums" }}>{e.ecriture}</strong>
                  <span style={{ flex: "1 1 200px", minWidth: 0 }}>{e.libelle}</span>
                  <Montant valeur={e.montant} />
                  <span style={{ flexBasis: "100%", fontSize: 12, color: "var(--ink-500)" }}>
                    {dateCourte(e.date)} · {e.raisons.join(" · ")}
                  </span>
                  {reviseur && transmise && (
                    <span style={{ flexBasis: "100%" }}>
                      <PoserUneRemarque ids={ids} objets={objets} initial={{ nature: "ECRITURE", reference: e.ecriture }} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        <Panneau titre="Remarques" aide="Chacune rattachée à une écriture, une pièce ou un compte">
          {r.remarques.length === 0 ? (
            <EtatVide titre="Aucune remarque" />
          ) : (
            r.remarques.map((m) => (
              <LaRemarque key={m.rang} m={m} ids={ids} peutRepondre={comptable && renvoyee && m.statut !== "CLOSE"} peutClore={reviseur && transmise && m.statut !== "CLOSE"} />
            ))
          )}
          {reviseur && transmise && (
            <div style={{ padding: "10px 16px" }}>
              <PoserUneRemarque ids={ids} objets={objets} />
            </div>
          )}
        </Panneau>

        <Panneau titre="Suite" aide="Qui a fait passer ce mois, et à quel état">
          <ol style={{ margin: 0, padding: "8px 16px 8px 36px", font: "400 12.5px/1.6 var(--police-texte)" }}>
            {r.historique.map((p, i) => (
              <li key={i}>
                {/* L'acte, et non l'état qui en résulte : « Chez le réviseur : Léonard FOTSO »
                    laissait croire que le comptable était le réviseur (pas 102). */}
                {ACTES[p.statut]} par {p.par}, le {dateCourte(p.le)}
                {p.message && ` (« ${p.message} »)`}
              </li>
            ))}
          </ol>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start", padding: "10px 16px 14px" }}>
            {reviseur && transmise && ouvertes > 0 && <RenvoyerLeMois ids={ids} ouvertes={ouvertes} />}
            {reviseur && transmise && nonCloses === 0 &&
              (vue.auteur_de_la_transmission ? (
                <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                  Vous avez transmis ce mois : un autre réviseur doit le valider.
                </p>
              ) : (
                <ValiderLeMois ids={ids} />
              ))}
            {reviseur && transmise && ouvertes === 0 && nonCloses > 0 && (
              <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                Clore les remarques répondues, ou en poser une nouvelle et renvoyer.
              </p>
            )}
            {comptable && renvoyee && (ouvertes === 0 ? <RetransmettreLeMois ids={ids} /> : (
              <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                Répondre aux {ouvertes} remarque{ouvertes > 1 ? "s" : ""} ouverte{ouvertes > 1 ? "s" : ""} avant de retransmettre.
              </p>
            ))}
            {r.statut === "VALIDEE" && (
              <p style={{ margin: 0, font: "600 13px/1.5 var(--police-texte)", color: "var(--success)" }}>
                Validé le {r.validee_le ? dateCourte(r.validee_le) : "?"} par {r.validee_par}.
              </p>
            )}
          </div>
        </Panneau>
      </div>
    </>
  );
}

function LaRemarque({ m, ids, peutRepondre, peutClore }: { m: Remarque; ids: { dossier: string; identifiant: string }; peutRepondre: boolean; peutClore: boolean }) {
  const s = LIBELLES_STATUT_REMARQUE[m.statut];
  return (
    <article style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-100)", font: "400 13px/1.5 var(--police-texte)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", alignItems: "baseline" }}>
        <strong>
          {m.rang}. {LIBELLES_NATURE_OBJET[m.objet.nature]} {m.objet.reference}
        </strong>
        <span style={{ color: s.couleur, fontWeight: 600, fontSize: 12 }}>{s.libelle}</span>
        {peutClore && m.statut === "TRAITEE" && (
          <span style={{ marginLeft: "auto" }}>
            <CloreLaRemarque ids={ids} rang={m.rang} />
          </span>
        )}
      </div>
      <p style={{ margin: "2px 0 0" }}>{m.texte}</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-500)" }}>
        {m.par}, le {dateCourte(m.le)}
      </p>
      {m.reponse && (
        <p style={{ margin: "6px 0 0", paddingLeft: 10, borderLeft: "2px solid var(--line-200)" }}>
          {m.reponse}
          <span style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>
            {m.repondue_par}, le {m.repondue_le ? dateCourte(m.repondue_le) : "?"}
          </span>
        </p>
      )}
      {m.statut === "CLOSE" && m.close_par && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--success)" }}>
          Close par {m.close_par}, le {m.close_le ? dateCourte(m.close_le) : "?"}
        </p>
      )}
      {peutClore && m.statut === "OUVERTE" && (
        <div style={{ marginTop: 4 }}>
          <CloreLaRemarque ids={ids} rang={m.rang} />
        </div>
      )}
      {peutRepondre && <RepondreALaRemarque ids={ids} rang={m.rang} />}
    </article>
  );
}
