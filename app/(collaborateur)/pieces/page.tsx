import type { Metadata } from "next";

import { EtatErreur } from "../../components/Tableau";
import { BoiteReception } from "../../components/collecte/BoiteReception";
import { EnteteTravail } from "../../components/coquille/EnteteTravail";
import { ErreurApi, controlerToutLeFlux, type ReponseControle } from "../../lib/api";

export const metadata: Metadata = { title: "Pièces justificatives — Plateforme CGA" };

// Le contrôle dépend du référentiel courant : pré-rendre figerait les verdicts.
export const dynamic = "force-dynamic";

/**
 * E03 · Boîte de réception des pièces — fiche au § 8.3.
 *
 * Le contrôle de tout le flux est fait ici, côté serveur, en un seul appel : la
 * pastille de conformité de chaque ligne vient du vrai moteur. Le tri, le filtrage
 * et la navigation clavier sont ensuite purement client — voir `BoiteReception`.
 *
 * ⚠️ Le **canal de réception** et le **statut du cycle de vie** appartiennent au
 * contexte C · Collecte, non implémenté. Ils sont simulés dans
 * `lib/collecte-demo.ts` plutôt qu'ajoutés au backend, ce qui aurait laissé croire
 * ce contexte existant. La conformité, elle, est réelle.
 */
export default async function BoiteReceptionPieces() {
  let rapports: ReponseControle[] = [];
  let erreur: string | null = null;

  try {
    rapports = await controlerToutLeFlux();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Flux entrant" }, { libelle: "Pièces justificatives" }]}
        notifications={4}
      />

      <div className="contenu">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <h1
            style={{
              margin: 0,
              font: "600 var(--taille-titre-page)/1.2 var(--police-titre)",
              color: "var(--ink-900)",
            }}
          >
            Pièces justificatives
          </h1>
          <p
            style={{
              margin: 0,
              font: "400 12.5px/1.4 var(--police-texte)",
              color: "var(--ink-500)",
            }}
          >
            Flux entrant de juillet 2026
          </p>
          <button type="button" className="action-principale" style={{ marginLeft: "auto" }}>
            Importer des pièces
          </button>
        </div>

        {erreur ? (
          <EtatErreur titre="Contrôle de conformité indisponible" detail={erreur} />
        ) : (
          <BoiteReception rapports={rapports} />
        )}
      </div>
    </>
  );
}
