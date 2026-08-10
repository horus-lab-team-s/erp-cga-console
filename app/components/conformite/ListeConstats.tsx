"use client";

import { useState } from "react";

import type { Constat } from "@/app/lib/api";
import { montantFcfa } from "@/app/lib/formats";
import { APPARENCE, type Severite } from "../Gravite";

/**
 * Liste des constats — § 8.2, point 3.
 *
 * « Chacun comporte le niveau de gravité, le libellé de la règle, son code, **la
 * référence légale**, le message explicatif et la consigne de régularisation. »
 *
 * **Contrainte forte de la fiche** : la référence légale est visible sur chaque
 * constat. C'est ce qui distingue cet outil d'un validateur de formulaire, et ce
 * qui permet au comptable de justifier un rejet auprès d'un adhérent mécontent.
 *
 * Le premier constat est déplié d'office : dans les faits, une facture porte un
 * constat dominant et l'ouvrir manuellement à chaque fois est une friction pure.
 */
export function ListeConstats({ constats }: { constats: Constat[] }) {
  const [ouverts, setOuverts] = useState<Set<number>>(new Set([0]));

  function basculer(index: number) {
    setOuverts((actuels) => {
      const suivants = new Set(actuels);
      if (suivants.has(index)) suivants.delete(index);
      else suivants.add(index);
      return suivants;
    });
  }

  if (constats.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {constats.map((constat, index) => {
        const apparence = APPARENCE[constat.severite as Severite];
        const ouvert = ouverts.has(index);
        const surFondPlein =
          constat.severite === "BLOQUANT" || constat.severite === "MAJEUR";

        return (
          <article
            key={`${constat.code_regle}-${index}`}
            style={{
              border: `1px solid ${apparence.bordure}`,
              borderRadius: "var(--rayon)",
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            <button
              type="button"
              onClick={() => basculer(index)}
              aria-expanded={ouvert}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                background: surFondPlein ? apparence.fond : "var(--surface-alt)",
                color: surFondPlein ? "#fff" : "var(--ink-900)",
              }}
            >
              <span
                style={{
                  flex: "none",
                  whiteSpace: "nowrap",
                  padding: "4px 8px",
                  borderRadius: "var(--rayon-pilule)",
                  font: "600 10px/1 var(--police-texte)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  background: surFondPlein ? "rgb(255 255 255 / 22%)" : apparence.fond,
                  color: surFondPlein ? "#fff" : apparence.texte,
                }}
              >
                <span aria-hidden="true">{apparence.glyphe}</span> {apparence.libelle}
              </span>

              <span
                style={{
                  minWidth: 0,
                  font: "600 14px/1.3 var(--police-texte)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {constat.libelle}
              </span>

              <span
                className="tabulaire"
                style={{
                  flex: "none",
                  font: "400 11.5px/1 var(--police-texte)",
                  opacity: surFondPlein ? 0.85 : 0.7,
                }}
              >
                {constat.code_regle}
              </span>

              <span
                className="tabulaire"
                style={{
                  marginLeft: "auto",
                  flex: "none",
                  whiteSpace: "nowrap",
                  font: "600 13px/1 var(--police-texte)",
                }}
              >
                {constat.enjeu ? montantFcfa(constat.enjeu) : consequenceCourte(constat)}
              </span>

              <span aria-hidden="true" style={{ flex: "none", font: "400 12px/1 sans-serif" }}>
                {ouvert ? "▴" : "▾"}
              </span>
            </button>

            {ouvert && (
              <div
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {/* La référence légale d'abord : c'est elle qui rend le rejet opposable. */}
                <span
                  style={{
                    alignSelf: "flex-start",
                    padding: "4px 9px",
                    borderRadius: "var(--rayon-pilule)",
                    background: "var(--brand-indigo-100)",
                    color: "var(--brand-indigo-700)",
                    font: "600 11px/1.4 var(--police-texte)",
                  }}
                >
                  Référence légale — {constat.fondement.texte}
                </span>

                <p
                  style={{
                    margin: 0,
                    font: "400 13.5px/1.6 var(--police-texte)",
                    color: "var(--ink-900)",
                  }}
                >
                  {constat.message}
                </p>

                <p
                  style={{
                    margin: 0,
                    padding: "10px 12px",
                    borderRadius: "var(--rayon-petit)",
                    background: "var(--surface-alt)",
                    font: "400 13px/1.6 var(--police-texte)",
                    color: "var(--ink-900)",
                  }}
                >
                  <strong>Consigne : </strong>
                  {constat.remediation}
                </p>

                <dl
                  style={{
                    margin: 0,
                    display: "flex",
                    gap: 18,
                    flexWrap: "wrap",
                    font: "400 11.5px/1.5 var(--police-texte)",
                    color: "var(--ink-500)",
                  }}
                >
                  <Detail terme="Conséquence" valeur={consequenceLongue(constat)} />
                  {constat.consequence.poste_reintegration && (
                    <Detail
                      terme="Poste"
                      valeur={constat.consequence.poste_reintegration.replace(/_/g, " ")}
                    />
                  )}
                  <Detail terme="Source" valeur={constat.fondement.source} />
                </dl>

                {constat.regle_a_valider && (
                  <p
                    style={{
                      margin: 0,
                      font: "400 11.5px/1.5 var(--police-texte)",
                      color: "var(--warning)",
                    }}
                  >
                    △ Règle non encore confirmée sur le texte officiel : ce constat n&rsquo;est
                    pas opposable en l&rsquo;état.
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Detail({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <span style={{ display: "flex", gap: 6 }}>
      <dt style={{ fontWeight: 600 }}>{terme}</dt>
      <dd style={{ margin: 0 }}>{valeur}</dd>
    </span>
  );
}

function consequenceCourte(constat: Constat): string {
  if (constat.consequence.rectification_requise) return "Facture rectificative";
  if (constat.consequence.verification_requise) return "À vérifier";
  return "—";
}

function consequenceLongue(constat: Constat): string {
  const effets: string[] = [];
  if (constat.consequence.tva_deductible === false) effets.push("TVA non déductible");
  if (constat.consequence.charge_deductible === false) effets.push("charge non déductible");
  if (constat.consequence.rectification_requise)
    effets.push("facture rectificative à demander");
  if (constat.consequence.verification_requise) effets.push("vérification avant comptabilisation");
  return effets.length ? effets.join(" · ") : "aucune conséquence automatique";
}
