import type { FactureAControler } from "@/app/lib/api";
import { dateCourte, montantFcfa } from "@/app/lib/formats";

/**
 * Données extraites automatiquement — § 8.2, point 2.
 *
 * « Chaque champ porte un **indice de confiance** de l'extraction, les champs peu
 * fiables étant signalés pour vérification manuelle. Les champs sont modifiables. »
 *
 * ⚠️ L'indice de confiance appartient au contexte **C · Collecte**, qui n'existe pas
 * encore : c'est l'OCR qui le produit à la lecture du document. Il est simulé ici,
 * par référence de facture, et disparaîtra dès que C sera implémenté.
 *
 * La modification des champs n'est pas branchée non plus : elle écrit dans C.
 * L'affordance est présente et signalée, plutôt que promise et absente.
 */

/** Seuil sous lequel un champ est signalé pour vérification humaine. */
const SEUIL_CONFIANCE = 0.9;

const CONFIANCE_SIMULEE: Record<string, Record<string, number>> = {
  "F-2026-0412": { reglement: 0.71, niu: 0.98, date: 0.99 },
  "F-2026-0414": { niu: 0.0, reglement: 0.94 },
  "F-2026-0415": { designation: 0.82 },
};

type Champ = {
  cle: string;
  libelle: string;
  valeur: string;
  /** Champ vide ou invalide : traité en erreur, pas en simple avertissement. */
  enErreur?: boolean;
  tabulaire?: boolean;
};

export function DonneesExtraites({ facture }: { facture: FactureAControler }) {
  const confiances = CONFIANCE_SIMULEE[facture.document.reference] ?? {};

  const champs: Champ[] = [
    {
      cle: "fournisseur",
      libelle: "Fournisseur",
      valeur: facture.emetteur.denomination ?? "Non renseigné",
      enErreur: !facture.emetteur.denomination,
    },
    {
      cle: "niu",
      libelle: "NIU fournisseur",
      valeur: facture.emetteur.niu ?? "Non renseigné",
      enErreur: !facture.emetteur.niu || facture.emetteur.niu_actif === false,
      tabulaire: true,
    },
    {
      cle: "rccm",
      libelle: "RCCM",
      valeur: facture.emetteur.rccm ?? "Non renseigné",
      enErreur: !facture.emetteur.rccm,
      tabulaire: true,
    },
    {
      cle: "reference",
      libelle: "Numéro de facture",
      valeur: facture.document.reference,
      tabulaire: true,
    },
    {
      cle: "date",
      libelle: "Date d'émission",
      valeur: dateCourte(facture.document.date_emission),
      tabulaire: true,
    },
    {
      cle: "reglement",
      libelle: "Mode de règlement",
      valeur: libelleReglement(facture.reglement.mode),
    },
    {
      cle: "ht",
      libelle: "Montant HT",
      valeur: montantFcfa(facture.montants.total_ht),
      tabulaire: true,
    },
    {
      cle: "tva",
      libelle: "TVA",
      valeur: montantFcfa(facture.montants.total_tva),
      tabulaire: true,
    },
    {
      cle: "ttc",
      libelle: "Montant TTC",
      valeur: montantFcfa(facture.montants.total_ttc),
      tabulaire: true,
    },
  ];

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <h2 style={{ margin: 0, font: "600 16px/1 var(--police-texte)", color: "var(--ink-900)" }}>
          Données extraites
        </h2>
        <p style={{ margin: 0, font: "400 12px/1 var(--police-texte)", color: "var(--ink-500)" }}>
          lues automatiquement sur le document · modifiables
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--line-200)",
          borderRadius: "var(--rayon)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          overflow: "hidden",
        }}
      >
        {champs.map((champ, index) => {
          const confiance = confiances[champ.cle];
          const douteux = confiance !== undefined && confiance < SEUIL_CONFIANCE;
          const ton = champ.enErreur ? "erreur" : douteux ? "doute" : "normal";
          const fonds = {
            normal: "var(--surface)",
            doute: "var(--warning-100)",
            erreur: "var(--danger-100)",
          };
          const libelles = {
            normal: "var(--ink-500)",
            doute: "var(--warning)",
            erreur: "var(--danger)",
          };
          return (
            <div
              key={champ.cle}
              style={{
                padding: "8px 14px",
                background: fonds[ton],
                borderRight: (index + 1) % 3 === 0 ? "none" : "1px solid var(--line-200)",
                borderBottom: index < champs.length - 3 ? "1px solid var(--line-200)" : "none",
              }}
            >
              <div
                style={{
                  font: "600 11px/1.5 var(--police-texte)",
                  letterSpacing: "var(--interlettrage-entete)",
                  textTransform: "uppercase",
                  color: libelles[ton],
                  display: "flex",
                  gap: 6,
                  alignItems: "baseline",
                }}
              >
                {champ.libelle}
                {douteux && !champ.enErreur && (
                  <span
                    className="tabulaire"
                    style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
                    title="Extraction peu fiable — à vérifier sur le document"
                  >
                    △ {Math.round(confiance * 100)} %
                  </span>
                )}
              </div>
              <div
                className={champ.tabulaire ? "tabulaire" : undefined}
                style={{
                  font: `${champ.enErreur ? 600 : 400} 14px/1.4 var(--police-texte)`,
                  color: champ.enErreur ? "var(--danger)" : "var(--ink-900)",
                }}
              >
                {champ.valeur}
              </div>
            </div>
          );
        })}
      </div>

      {facture.lignes.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary
            style={{
              cursor: "pointer",
              font: "500 12.5px/1.6 var(--police-texte)",
              color: "var(--brand-indigo-700)",
            }}
          >
            Détail des lignes ({facture.lignes.length})
          </summary>
          <div
            style={{
              marginTop: 6,
              border: "1px solid var(--line-200)",
              borderRadius: "var(--rayon)",
              overflow: "hidden",
            }}
          >
            {facture.lignes.map((ligne, index) => (
              <div
                key={`${ligne.designation}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 14px",
                  borderBottom:
                    index < facture.lignes.length - 1 ? "1px solid var(--line-100)" : "none",
                  font: "400 13px/1.4 var(--police-texte)",
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{ligne.designation}</span>
                <span className="tabulaire" style={{ flex: "none", fontWeight: 500 }}>
                  {montantFcfa(ligne.montant_ht)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function libelleReglement(mode: string): string {
  const libelles: Record<string, string> = {
    ESPECES: "Espèces",
    VIREMENT: "Virement",
    CHEQUE: "Chèque",
    ORANGE_MONEY: "Orange Money",
    MTN_MOMO: "MTN Mobile Money",
    COMPENSATION: "Compensation",
    INCONNU: "Non renseigné",
  };
  return libelles[mode] ?? mode;
}
