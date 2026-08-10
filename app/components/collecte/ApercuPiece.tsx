"use client";

import Link from "next/link";

import { dateCourte, montantFcfa } from "../../lib/formats";
import { APPARENCE, BadgeGravite } from "../Gravite";
import { PastilleStatut } from "../Montant";
import type { LignePiece } from "./BoiteReception";

/**
 * Panneau latéral d'aperçu — § 8.3 : « s'ouvrant à la sélection, **sans
 * changement de page** ».
 *
 * C'est la contrainte qui justifie ce panneau plutôt qu'une navigation vers E02 :
 * le comptable descend sa file aux flèches, et quitter la page à chaque ligne
 * casserait la file. Il voit ici de quoi trancher — verdict, enjeu, constats — et
 * n'ouvre E02 que lorsqu'il doit agir.
 *
 * Le panneau ne propose donc **aucune action** : décider suppose de lire la
 * facture et la référence légale, ce que seul E02 permet. Un bouton
 * « comptabiliser » ici inviterait à valider sans avoir regardé.
 */
export function ApercuPiece({ ligne }: { ligne: LignePiece | null }) {
  return (
    <aside
      aria-label="Aperçu de la pièce sélectionnée"
      style={{
        width: 340,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {ligne === null ? (
        <p
          style={{
            margin: "auto",
            padding: 24,
            textAlign: "center",
            font: "400 12.5px/1.7 var(--police-texte)",
            color: "var(--ink-500)",
          }}
        >
          Parcourez la file aux flèches du clavier.
          <br />
          L&rsquo;aperçu suit la ligne active.
        </p>
      ) : (
        <Contenu ligne={ligne} />
      )}
    </aside>
  );
}

function Contenu({ ligne }: { ligne: LignePiece }) {
  const { facture, rapport } = ligne.reponse;
  const apparence = APPARENCE[ligne.severite];
  const enjeu = rapport.constats.reduce(
    (max, c) => (c.enjeu && Number(c.enjeu) > max ? Number(c.enjeu) : max),
    0,
  );

  return (
    <>
      <header
        style={{
          flex: "none",
          padding: "12px 14px",
          borderBottom: "1px solid var(--line-200)",
          background: "var(--surface-alt)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="tabulaire"
            style={{ font: "600 13px/1.3 var(--police-texte)", color: "var(--ink-900)" }}
          >
            {ligne.reference}
          </span>
          <span style={{ marginLeft: "auto" }}>
            <PastilleStatut statut={ligne.statut} />
          </span>
        </div>
        <div
          style={{
            marginTop: 2,
            font: "400 11.5px/1.5 var(--police-texte)",
            color: "var(--ink-500)",
          }}
        >
          Déposée par {ligne.canal.toLocaleLowerCase("fr")} ·{" "}
          <span className="tabulaire">{dateCourte(ligne.date)}</span>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: "var(--rayon)",
            border: `1px solid ${apparence.bordure}`,
            background: apparence.fond,
            color:
              ligne.severite === "BLOQUANT" || ligne.severite === "MAJEUR"
                ? "#fff"
                : "var(--ink-900)",
          }}
        >
          <span aria-hidden="true" style={{ font: "600 16px/1 var(--police-texte)" }}>
            {apparence.glyphe}
          </span>
          <span style={{ minWidth: 0 }}>
            <strong style={{ display: "block", font: "600 13px/1.3 var(--police-texte)" }}>
              {apparence.libelle}
            </strong>
            <span className="tabulaire" style={{ font: "400 11.5px/1.4 var(--police-texte)" }}>
              {enjeu > 0 ? `Enjeu : ${montantFcfa(enjeu)}` : "Aucune conséquence chiffrée"}
            </span>
          </span>
        </div>

        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <Champ terme="Entreprise" valeur={ligne.adherent} />
          <Champ terme="Fournisseur" valeur={ligne.fournisseur} />
          <Champ
            terme="NIU fournisseur"
            valeur={facture.emetteur.niu ?? "Non renseigné"}
            alerte={!facture.emetteur.niu}
            tabulaire
          />
          <Champ terme="Montant HT" valeur={montantFcfa(facture.montants.total_ht)} tabulaire />
          <Champ terme="TVA" valeur={montantFcfa(facture.montants.total_tva)} tabulaire />
          <Champ
            terme="Montant TTC"
            valeur={montantFcfa(facture.montants.total_ttc)}
            tabulaire
            gras
          />
          <Champ
            terme="Règlement"
            valeur={facture.reglement.mode.toLocaleLowerCase("fr").replace(/_/g, " ")}
            alerte={facture.reglement.mode === "ESPECES"}
          />
        </dl>

        <section>
          <h3
            style={{
              margin: "0 0 6px",
              font: "600 12.5px/1 var(--police-texte)",
              color: "var(--ink-900)",
            }}
          >
            Constats{" "}
            <span style={{ fontWeight: 400, color: "var(--ink-500)" }}>
              {rapport.constats.length} sur {rapport.regles_appliquees} règles
            </span>
          </h3>

          {rapport.constats.length === 0 ? (
            <p
              style={{
                margin: 0,
                font: "400 12px/1.6 var(--police-texte)",
                color: "var(--ink-500)",
              }}
            >
              Aucune anomalie. TVA et charge intégralement déductibles.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
              {rapport.constats.map((constat) => (
                <li
                  key={constat.code_regle}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--rayon-petit)",
                    background: "var(--surface-alt)",
                    border: "1px solid var(--line-200)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <BadgeGravite severite={constat.severite} court />
                    <span
                      className="tabulaire"
                      style={{
                        marginLeft: "auto",
                        font: "400 10.5px/1 var(--police-texte)",
                        color: "var(--ink-500)",
                      }}
                    >
                      {constat.code_regle}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "5px 0 0",
                      font: "400 12px/1.45 var(--police-texte)",
                      color: "var(--ink-900)",
                    }}
                  >
                    {constat.libelle}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer
        style={{
          flex: "none",
          padding: 12,
          borderTop: "1px solid var(--line-200)",
        }}
      >
        <Link
          href={`/pieces/${ligne.reference}`}
          className="action-principale"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          Ouvrir le rapport complet · Entrée
        </Link>
      </footer>
    </>
  );
}

function Champ({
  terme,
  valeur,
  tabulaire = false,
  gras = false,
  alerte = false,
}: {
  terme: string;
  valeur: string;
  tabulaire?: boolean;
  gras?: boolean;
  alerte?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
      <dt
        style={{
          flex: "none",
          width: 118,
          font: "600 11px/1.4 var(--police-texte)",
          letterSpacing: "var(--interlettrage-entete)",
          textTransform: "uppercase",
          color: alerte ? "var(--danger)" : "var(--ink-500)",
        }}
      >
        {terme}
      </dt>
      <dd
        className={tabulaire ? "tabulaire" : undefined}
        style={{
          margin: 0,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          font: `${gras ? 600 : 400} 12.5px/1.4 var(--police-texte)`,
          color: alerte ? "var(--danger)" : "var(--ink-900)",
        }}
      >
        {valeur}
      </dd>
    </div>
  );
}
