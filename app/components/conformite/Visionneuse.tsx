import type { FactureAControler } from "../../lib/api";
import { dateCourte, montantFcfa } from "../../lib/formats";

/**
 * Visionneuse de document — § 8.2, colonne gauche, environ 45 %.
 *
 * La fiche demande zoom, rotation, ajustement à la fenêtre, et le surlignage de la
 * zone du document correspondant au constat sélectionné.
 *
 * ⚠️ Aucun document réel n'existe encore : le fichier scanné appartient au contexte
 * **C · Collecte**, et la GED au contexte **K**. Ce composant rend donc une
 * reconstitution de la facture à partir des données extraites — assez fidèle pour
 * recetter la mise en page à deux colonnes, et honnête sur ce qu'elle est.
 *
 * Les commandes de zoom et de rotation sont volontairement absentes plutôt que
 * présentes et inertes : un bouton qui ne fait rien coûte plus cher en confiance
 * qu'un bouton manquant.
 */
export function Visionneuse({ facture }: { facture: FactureAControler }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        background: "#F3F1F7",
        borderRight: "1px solid var(--line-200)",
      }}
    >
      <div
        style={{
          flex: "none",
          height: 40,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line-200)",
          font: "400 12px/1 var(--police-texte)",
          color: "var(--ink-500)",
        }}
      >
        <span className="tabulaire">{facture.document.reference} · page 1 / 1</span>
        <span
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
            borderRadius: "var(--rayon-pilule)",
            background: "var(--surface-alt)",
            border: "1px solid var(--line-200)",
            font: "600 10.5px/1.4 var(--police-texte)",
          }}
          title="Le document scanné viendra du contexte C · Collecte, non implémenté"
        >
          Reconstitution
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <article
          style={{
            width: "100%",
            maxWidth: 440,
            alignSelf: "flex-start",
            background: "var(--surface)",
            border: "1px solid var(--line-200)",
            borderRadius: "var(--rayon)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid var(--line-200)",
              background: "var(--surface-alt)",
            }}
          >
            <div style={{ font: "600 13px/1.3 var(--police-texte)", color: "var(--ink-900)" }}>
              {facture.emetteur.denomination ?? "Fournisseur non identifié"}
            </div>
            <div
              className="tabulaire"
              style={{ font: "400 10.5px/1.6 var(--police-texte)", color: "var(--ink-500)" }}
            >
              NIU {facture.emetteur.niu ?? "absent"}
              {facture.emetteur.rccm ? ` · RCCM ${facture.emetteur.rccm}` : ""}
            </div>
          </header>

          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                font: "600 11px/1 var(--police-texte)",
                letterSpacing: "var(--interlettrage-entete)",
                textTransform: "uppercase",
                color: "var(--ink-500)",
              }}
            >
              Facture {facture.document.reference} ·{" "}
              {dateCourte(facture.document.date_emission)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {facture.lignes.map((ligne, index) => (
                <div
                  key={`${ligne.designation}-${index}`}
                  style={{
                    display: "flex",
                    gap: 12,
                    font: "400 12px/1.5 var(--police-texte)",
                    color: "var(--ink-900)",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>{ligne.designation}</span>
                  <span className="tabulaire" style={{ flex: "none" }}>
                    {montantFcfa(ligne.montant_ht)}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: "var(--rayon-petit)",
                background: "var(--surface-alt)",
                border: "1px solid var(--line-200)",
              }}
            >
              <Total libelle="Total HT" valeur={facture.montants.total_ht} />
              <Total libelle="TVA" valeur={facture.montants.total_tva} />
              <Total libelle="Total TTC" valeur={facture.montants.total_ttc} gras />
            </div>

            <div style={{ font: "400 12px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
              Réglée par {facture.reglement.mode.toLocaleLowerCase("fr").replace(/_/g, " ")}
              {facture.reglement.date_reglement
                ? ` le ${dateCourte(facture.reglement.date_reglement)}`
                : ""}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function Total({
  libelle,
  valeur,
  gras = false,
}: {
  libelle: string;
  valeur: string;
  gras?: boolean;
}) {
  return (
    <div
      className="tabulaire"
      style={{
        display: "flex",
        justifyContent: "space-between",
        font: `${gras ? 600 : 400} 12px/1.7 var(--police-texte)`,
        color: "var(--ink-900)",
      }}
    >
      <span>{libelle}</span>
      <span>{montantFcfa(valeur)}</span>
    </div>
  );
}
