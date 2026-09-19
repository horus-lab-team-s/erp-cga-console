import type { Metadata } from "next";

import { Montant } from "@/app/components/Montant";
import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { TransmettreDepuisLaCloture } from "@/app/components/comptabilite/GestesCloture";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { lireLaCloture, type CodePoint, type PointDeCloture, type VueDeCloture } from "@/app/lib/cloture-mensuelle";
import { dateCourte } from "@/app/lib/formats";
import { lireDossiers } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Clôture mensuelle — Plateforme CGA" };
export const dynamic = "force-dynamic";

/**
 * La clôture mensuelle d'un dossier (pas 107). Maquette « Parcours comptable », vue G.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VÉRIFIER, PUIS PASSER LA MAIN EN VERROUILLANT
 *
 * * **Les points de contrôle du mois**, tous calculés sur les faits : aucune case à cocher.
 *   Chacun dit s'il est traité, s'il bloque, et mène à l'écran où il se traite.
 * * **Le mois en chiffres**.
 * * **La transmission** : le bouton porte le compte des points bloquants restants, et reste
 *   désactivé tant qu'il en reste. Transmettre **verrouille le mois** : plus aucune saisie,
 *   correction, validation ni contre-passation datée du mois, jusqu'à un renvoi du réviseur.
 *
 * Ce qui bloque et ce qui informe se règle au référentiel
 * (`cloture_mensuelle/reglages.yaml`) : la page affiche ce que le backend a calculé, sans
 * rien décider elle-même.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function moisPrecedent(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

function nomDuMois(mois: string): string {
  return `${MOIS[Number(mois.slice(5, 7)) - 1]} ${mois.slice(0, 4)}`;
}

/** Où se traite chaque point. Le lien mène à l'écran du geste, jamais à une case à cocher. */
function lienDuPoint(code: CodePoint, vue: VueDeCloture): { libelle: string; href: string } {
  const dossier = encodeURIComponent(vue.dossier);
  const comptabilite = `/comptabilite?dossier=${dossier}&exercice=${vue.exercice}`;
  const liens: Record<CodePoint, { libelle: string; href: string }> = {
    PIECES_A_COMPTABILISER: { libelle: "Boîte de réception", href: "/pieces" },
    BROUILLONS: { libelle: "Écritures", href: comptabilite },
    RAPPROCHEMENT: { libelle: "Rapprochement", href: `/comptabilite/rapprochement?dossier=${dossier}` },
    TRESORERIE: { libelle: "Grand livre", href: `/comptabilite/grand-livre?dossier=${dossier}&exercice=${vue.exercice}` },
    EQUILIBRE: { libelle: "Balance", href: comptabilite },
    NUMEROTATION: { libelle: "Journaux", href: comptabilite },
    // Pas 111 : la relance composée du mois, et non plus la liste des demandes.
    PIECES_ATTENDUES: { libelle: "Relancer", href: `/pieces/relancer?dossier=${dossier}&mois=${vue.mois}` },
    ECARTS_EN_SUSPENS: { libelle: "Traiter", href: "/pieces" },
  };
  return liens[code];
}

function Glyphe({ point }: { point: PointDeCloture }) {
  // La couleur ne porte jamais seule l'information : glyphe et libellé l'accompagnent.
  const [glyphe, fond, couleur, libelle] = point.traite
    ? ["✓", "var(--success-100)", "var(--success)", "traité"]
    : point.bloquant
      ? ["⬣", "var(--danger-100)", "var(--danger)", "bloquant"]
      : ["▲", "var(--warning-100)", "var(--warning)", "à savoir"];
  return (
    <span
      aria-label={libelle}
      title={libelle}
      style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: fond, color: couleur, display: "flex", alignItems: "center", justifyContent: "center", font: "600 12px/1 var(--police-texte)" }}
    >
      {glyphe}
    </span>
  );
}

export default async function ClotureMensuelle({ searchParams }: { searchParams: Promise<{ dossier?: string; mois?: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Clôture mensuelle" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const brut = await searchParams;
  const dossiers = await lireDossiers();
  const miettes = [{ libelle: "Comptabilité", href: "/comptabilite" }, { libelle: "Clôture mensuelle" }];
  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier dans votre périmètre" />
        </div>
      </>
    );
  }
  const dossier = dossiers.some((d) => d.niu === brut.dossier) ? (brut.dossier as string) : dossiers[0].niu;
  const mois = /^\d{4}-(0[1-9]|1[0-2])$/.test(brut.mois ?? "") ? (brut.mois as string) : moisPrecedent();

  let vue: VueDeCloture | null = null;
  let erreur: string | null = null;
  try {
    vue = await lireLaCloture(dossier, mois);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  const choix = (
    <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", padding: "12px 16px" }}>
      <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)", flex: "1 1 220px" }}>
        Dossier
        <select name="dossier" defaultValue={dossier} style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }}>
          {dossiers.map((d) => (
            <option key={d.niu} value={d.niu}>
              {d.denomination}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
        Mois
        <input type="month" name="mois" defaultValue={mois} style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }} />
      </label>
      <button type="submit" className="action-secondaire">
        Afficher
      </button>
    </form>
  );

  if (!vue) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <div className="page-travail__titre">
            <h1>Clôture mensuelle</h1>
          </div>
          <Panneau titre="Dossier et mois">{choix}</Panneau>
          <EtatErreur titre="La clôture ne se lit pas" detail={erreur ?? ""} />
        </div>
      </>
    );
  }

  const peutTransmettre = detient(acces, "SAISIR_ECRITURE");
  const informatifsOuverts = vue.points.filter((p) => !p.traite && !p.bloquant);
  const statutDuVerrou = vue.verrou?.statut === "VALIDEE" ? "validé par le réviseur" : "transmis au réviseur";

  return (
    <>
      <EnteteTravail miettes={miettes} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Clôture de {nomDuMois(vue.mois)}</h1>
          <p>
            {vue.denomination} · {vue.traites} point{vue.traites > 1 ? "s" : ""} sur {vue.points.length} traité{vue.traites > 1 ? "s" : ""} ·
            {vue.verrou ? " période verrouillée" : " verrouillage de la période à la transmission"}
          </p>
        </div>

        <Panneau titre="Dossier et mois">{choix}</Panneau>

        {vue.verrou && (
          <div role="status" style={{ padding: "12px 16px", border: "1px solid var(--line-200)", borderLeft: "4px solid var(--brand-indigo-700)", borderRadius: "var(--rayon-petit)", background: "var(--surface-2)", font: "400 13px/1.5 var(--police-texte)" }}>
            <strong>Période du {dateCourte(vue.verrou.du)} au {dateCourte(vue.verrou.au)} verrouillée</strong> : {statutDuVerrou} ({vue.verrou.par}, le{" "}
            {dateCourte(vue.verrou.depuis)}). Aucune écriture datée de cette période ne s&apos;ajoute, ne se corrige ni ne se valide ; une erreur se corrige par une
            contre-passation datée d&apos;un mois ouvert.
            {vue.revue && (
              <>
                {" "}
                <Link href={`/comptabilite/revues/${vue.revue.identifiant}?dossier=${encodeURIComponent(vue.dossier)}`}>Voir la revue</Link>
              </>
            )}
          </div>
        )}

        <Panneau titre="Points de contrôle du mois" aide={`Réglés au référentiel : ${vue.source_des_reglages}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {vue.points.map((point) => {
              const lien = lienDuPoint(point.code, vue);
              return (
                <li key={point.code} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderBottom: "1px solid var(--line-100)" }}>
                  <Glyphe point={point} />
                  <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <div style={{ font: "600 13px/1.4 var(--police-texte)", color: "var(--ink-900)" }}>
                      {point.titre}
                      {!point.traite && !point.bloquant && <span style={{ fontWeight: 400, color: "var(--ink-500)" }}> · n&apos;empêche pas la transmission</span>}
                    </div>
                    <div style={{ font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)", overflowWrap: "anywhere" }}>{point.detail}</div>
                  </div>
                  <Link href={lien.href} className="action-secondaire" style={{ flex: "none", fontSize: 12, padding: "4px 10px", minHeight: 0 }}>
                    {point.traite ? "Voir" : lien.libelle}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p style={{ margin: 0, padding: "10px 16px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
            Le verrouillage empêche toute écriture sur {nomDuMois(vue.mois)}. Une correction ultérieure passera par une contre-passation datée d&apos;un mois ouvert,
            visible au grand livre.
          </p>
        </Panneau>

        <Panneau titre="Le mois en chiffres">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "var(--line-100)" }}>
            {[
              { libelle: "Pièces reçues", valeur: <>{vue.chiffres.pieces_recues}</> },
              { libelle: "Écritures validées", valeur: <>{vue.chiffres.ecritures_validees}</> },
              { libelle: "Achats du mois (FCFA)", valeur: <Montant valeur={vue.chiffres.achats_du_mois} /> },
              { libelle: "TVA rejetée (FCFA)", valeur: <Montant valeur={vue.chiffres.tva_rejetee} /> },
            ].map((k) => (
              <div key={k.libelle} style={{ background: "var(--surface)", padding: "12px 16px" }}>
                <div style={{ font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-500)" }}>{k.libelle}</div>
                <div style={{ font: "600 20px/1.3 var(--police-texte)", color: "var(--ink-900)" }}>{k.valeur}</div>
              </div>
            ))}
          </div>
        </Panneau>

        <Panneau titre="Transmission au réviseur">
          <p style={{ margin: 0, padding: "12px 16px 0", font: "400 13px/1.5 var(--police-texte)" }}>
            {vue.reviseurs.length > 0 ? vue.reviseurs.join(", ") : "Le réviseur du cabinet"} recevra le dossier avec la balance, l&apos;échantillon des écritures
            atypiques et votre commentaire, et peut vous le renvoyer avec des remarques.
          </p>
          {informatifsOuverts.length > 0 && (
            <p style={{ margin: 0, padding: "8px 16px 0", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              Restent ouverts : {informatifsOuverts.map((p) => p.titre.toLowerCase()).join(" ; ")}.
            </p>
          )}
          {vue.revue ? (
            <p style={{ margin: 0, padding: "12px 16px", font: "400 13px/1.5 var(--police-texte)" }}>
              <Link href={`/comptabilite/revues/${vue.revue.identifiant}?dossier=${encodeURIComponent(vue.dossier)}`}>
                Voir le dossier tel que le voit le réviseur
              </Link>
            </p>
          ) : peutTransmettre ? (
            <TransmettreDepuisLaCloture
              dossier={vue.dossier}
              mois={vue.mois}
              bloquants={vue.bloquants_restants}
              moisTermine={vue.mois_termine}
              dejaTransmis={vue.revue !== null}
            />
          ) : (
            <p style={{ margin: 0, padding: "12px 16px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              Transmettre demande la permission SAISIR_ECRITURE.
            </p>
          )}
        </Panneau>
      </div>
    </>
  );
}
