/**
 * Bibliothèque de composants vivante.
 *
 * Rend les jetons du § 10 tels qu'ils sont réellement compilés, plutôt que tels
 * qu'ils sont documentés. Sert de référence de développement front et de support
 * de recette avec le cabinet — c'est le pendant exécutable de
 * `Docs/Bibliotheque de composants CGA.html`.
 */

import { BadgeGravite, BandeauVerdict, type Severite } from "../components/Gravite";
import { Montant, PastilleStatut, type Statut } from "../components/Montant";
import { dateCourte, dateLongue, montantFcfa, periode, taux } from "../lib/formats";

const COULEURS = [
  ["brand-indigo-900", "#2E1B4D", "barre latérale, en-têtes sombres"],
  ["brand-indigo-700", "#492F79", "titres, liens de tableau, actions secondaires"],
  ["brand-indigo-100", "#EDE9F5", "ligne sélectionnée, en-têtes de colonne"],
  ["brand-magenta-600", "#8C2D86", "action principale, onglet actif"],
  ["brand-magenta-100", "#F7E9F6", "survol de ligne, badges d'accent"],
  ["ink-900", "#1A1523", "texte courant, montants"],
  ["ink-500", "#6B6480", "texte secondaire, légendes"],
  ["line-200", "#E5E1EC", "filets, bordures, séparateurs"],
  ["surface", "#FFFFFF", "tableaux, cartes, panneaux"],
  ["surface-alt", "#FAF9FC", "fond d'application, alternance"],
  ["success", "#1E7A4C", "conforme, déclaré, payé"],
  ["warning", "#B4690E", "anomalie majeure, pièce manquante"],
  ["danger", "#B3261E", "anomalie bloquante, échéance dépassée"],
] as const;

const GRAVITES: Severite[] = [
  "BLOQUANT",
  "MAJEUR",
  "AVERTISSEMENT",
  "INFORMATION",
  "CONFORME",
];

const STATUTS: Statut[] = [
  "Reçue",
  "Lue",
  "Rapprochée",
  "Comptabilisée",
  "Rectif. demandée",
  "En retard",
  "En préparation",
  "Prête",
  "Déclarée",
  "Payée",
];

/** Jeu de démonstration du § 13.5. Les mêmes chiffres partout, jamais de faux latin. */
const PIECES = [
  { ent: "SARL BATIMENT PLUS", obl: "TVA juillet", mt: 4820000, sev: "MAJEUR" },
  { ent: "AGRO-NKOLO SA", obl: "TVA juillet", mt: 12340000, sev: "AVERTISSEMENT" },
  { ent: "BOULANGERIE LA COLOMBE", obl: "Acompte IS", mt: 528000, sev: "BLOQUANT" },
  { ent: "CLINIQUE LE BON SAMARITAIN", obl: "Régularisation", mt: -450000, sev: "CONFORME" },
] as const;

const FORMATS: [string, string, string][] = [
  ["Montant", "séparateur espace, aucune décimale, aligné à droite", montantFcfa(2350000)],
  ["Montant négatif", "entre parenthèses, en rouge, jamais de signe moins", montantFcfa(-450000)],
  ["Date", "jour, mois abrégé, année", dateLongue("2026-08-15")],
  ["Date en tableau", "numérique compacte", dateCourte("2026-08-15")],
  ["NIU", "une lettre, douze chiffres, une lettre", "P019876543210K"],
  ["RCCM", "format greffe", "RC/DLA/2019/A/1842"],
  ["Compte comptable", "numérique, chiffres tabulaires", "401100"],
  ["Période comptable", "mois et année en toutes lettres", periode("2026-07-01")],
  ["Taux", "une ou deux décimales, symbole séparé", taux(19.25)],
  ["Téléphone", "groupé par deux ou trois", "699 902 184"],
];

function Section({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, font: "600 20px/1.2 var(--police-titre)", color: "var(--ink-900)" }}>
        {titre}
      </h2>
      {children}
      {aide ? (
        <p style={{ margin: 0, font: "400 12.5px/1.7 var(--police-texte)", color: "var(--ink-500)" }}>
          {aide}
        </p>
      ) : null}
    </section>
  );
}

const CARTE: React.CSSProperties = {
  border: "1px solid var(--line-200)",
  borderRadius: "var(--rayon)",
  background: "var(--surface)",
};

const ENTETE_COLONNE: React.CSSProperties = {
  height: "var(--entete-tableau)",
  padding: "0 14px",
  background: "var(--brand-indigo-100)",
  borderBottom: "1px solid var(--line-200)",
  font: "600 12px/1 var(--police-texte)",
  letterSpacing: "var(--interlettrage-entete)",
  textTransform: "uppercase",
  color: "var(--ink-500)",
  alignItems: "center",
};

export default function BibliothequeDeComposants() {
  return (
    <main
      style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        padding: "32px 40px 64px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <header style={{ borderBottom: "1px solid var(--line-200)", paddingBottom: 20 }}>
        <h1 style={{ margin: 0, font: "600 30px/1.2 var(--police-titre)", color: "var(--ink-900)" }}>
          Bibliothèque de composants et jetons
        </h1>
        <p style={{ margin: "6px 0 0", font: "400 13px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
          Plateforme CGA Broad Range Consulting Group · référence de développement front ·
          § 10 du dossier de design. Ces composants rendent les jetons réellement compilés,
          pas ceux de la documentation.
        </p>
      </header>

      <Section
        titre="1 · Jetons de couleur"
        aide="Deux teintes de marque seulement : l'indigo porte l'institution, le magenta l'action. Aucune troisième couleur, aucun dégradé, pas de mode sombre."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {COULEURS.map(([nom, valeur, usage]) => (
            <div key={nom} style={{ ...CARTE, overflow: "hidden" }}>
              <div
                style={{
                  height: 56,
                  background: `var(--${nom})`,
                  borderBottom: "1px solid var(--line-200)",
                }}
              />
              <div style={{ padding: "9px 12px" }}>
                <div style={{ font: "600 12.5px/1.4 var(--police-texte)", color: "var(--ink-900)" }}>
                  {nom}
                </div>
                <div
                  className="tabulaire"
                  style={{ font: "400 11.5px/1.5 var(--police-texte)", color: "var(--ink-500)" }}
                >
                  {valeur} · {usage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        titre="2 · Système de gravité"
        aide="Règle absolue : la couleur ne porte jamais seule l'information. Glyphe et libellé sont toujours présents, y compris dans les tableaux les plus denses."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {GRAVITES.map((s) => (
            <BadgeGravite key={s} severite={s} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BandeauVerdict
            severite="BLOQUANT"
            titre="Anomalie bloquante — comptabilisation interdite"
            detail={`TVA et charge non déductibles : ${montantFcfa(536625)}`}
          />
          <BandeauVerdict
            severite="MAJEUR"
            titre={`Anomalie majeure — TVA non déductible : ${montantFcfa(379350)}`}
            detail="2 constats sur 14 règles · comptabilisation possible avec conséquence fiscale"
          />
          <BandeauVerdict
            severite="CONFORME"
            titre="Conforme — aucun constat"
            detail="TVA déductible en totalité · charge intégralement déductible · 14 règles appliquées"
          />
        </div>
      </Section>

      <Section
        titre="3 · Actions"
        aide="Une seule action principale par vue. Interdit : le magenta comme couleur de lien dans un tableau — trop bruyant à cette densité."
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ ...CARTE, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                font: "600 13px/1 var(--police-texte)",
                letterSpacing: "var(--interlettrage-entete)",
                textTransform: "uppercase",
                color: "var(--ink-500)",
              }}
            >
              Espace collaborateur — hauteur 32 px
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "9px 16px",
                  border: "none",
                  background: "var(--brand-magenta-600)",
                  color: "#fff",
                  borderRadius: "var(--rayon)",
                  font: "600 12.5px/1.2 var(--police-texte)",
                  cursor: "pointer",
                }}
              >
                Principale
              </button>
              <button
                style={{
                  padding: "8px 14px",
                  border: "1px solid var(--brand-indigo-700)",
                  background: "var(--surface)",
                  color: "var(--brand-indigo-700)",
                  borderRadius: "var(--rayon)",
                  font: "600 12.5px/1.2 var(--police-texte)",
                  cursor: "pointer",
                }}
              >
                Secondaire
              </button>
              <button
                style={{
                  padding: "8px 14px",
                  border: "1px solid var(--danger)",
                  background: "var(--surface)",
                  color: "var(--danger)",
                  borderRadius: "var(--rayon)",
                  font: "600 12.5px/1.2 var(--police-texte)",
                  cursor: "pointer",
                }}
              >
                Destructive
              </button>
              <button
                disabled
                style={{
                  padding: "8px 14px",
                  border: "none",
                  background: "var(--line-100)",
                  color: "var(--ink-300)",
                  borderRadius: "var(--rayon)",
                  font: "600 12.5px/1.2 var(--police-texte)",
                }}
              >
                Désactivée
              </button>
            </div>
            <p style={{ margin: 0, font: "400 12px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
              Focus clavier : anneau de 2 px <code>brand-magenta-600</code>, décalage 2 px, sur
              tout élément interactif. Tabulez pour le voir.
            </p>
          </div>

          <div
            data-espace="adherent"
            style={{ ...CARTE, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div
              style={{
                font: "600 13px/1 var(--police-texte)",
                letterSpacing: "var(--interlettrage-entete)",
                textTransform: "uppercase",
                color: "var(--ink-500)",
              }}
            >
              Espace adhérent — 44 px minimum
            </div>
            <button
              style={{
                minHeight: "var(--hauteur-action-principale)",
                border: "none",
                background: "var(--brand-magenta-600)",
                color: "#fff",
                borderRadius: "var(--rayon)",
                font: "600 16px/1.2 var(--police-texte)",
                cursor: "pointer",
              }}
            >
              Envoyer un justificatif
            </button>
            <button
              style={{
                minHeight: "var(--hauteur-action-secondaire)",
                border: "1px solid var(--brand-indigo-700)",
                background: "var(--surface)",
                color: "var(--brand-indigo-700)",
                borderRadius: "var(--rayon)",
                font: "600 14px/1.2 var(--police-texte)",
                cursor: "pointer",
              }}
            >
              Revenir à l&rsquo;accueil
            </button>
            <p style={{ margin: 0, font: "400 12px/1.6 var(--police-texte)", color: "var(--ink-500)" }}>
              La hauteur de frappe de 44 px est impérative sur tout écran tactile. Ce bloc porte
              <code>data-espace=&quot;adherent&quot;</code>, qui bascule les jetons de densité.
            </p>
          </div>
        </div>
      </Section>

      <Section
        titre="4 · Densité et tableau"
        aide="Ligne 36 px · en-tête 30 px sur brand-indigo-100 · ligne sélectionnée magenta-100 · séparation par filet, jamais par ombre · montant négatif entre parenthèses, en rouge."
      >
        <div style={{ ...CARTE, overflow: "hidden" }} data-tableau>
          <div style={{ ...ENTETE_COLONNE, display: "grid", gridTemplateColumns: "1.5fr 1fr 140px 130px" }}>
            <span>Entreprise</span>
            <span>Obligation</span>
            <span style={{ textAlign: "right", paddingRight: 10 }}>Montant</span>
            <span>Conformité</span>
          </div>
          {PIECES.map((p, i) => (
            <div
              key={p.ent}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 140px 130px",
                alignItems: "center",
                height: "var(--ligne-tableau)",
                padding: "0 14px",
                borderBottom: "1px solid var(--line-100)",
                font: "400 13px/1 var(--police-texte)",
                background: i === 1 ? "var(--brand-magenta-100)" : "var(--surface)",
              }}
            >
              <span style={{ color: "var(--brand-indigo-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.ent}
              </span>
              <span style={{ color: "var(--ink-500)" }}>{p.obl}</span>
              <span style={{ textAlign: "right", paddingRight: 10 }}>
                <Montant valeur={p.mt} />
              </span>
              <span>
                <BadgeGravite severite={p.sev} court />
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        titre="5 · Pastilles de statut"
        aide="Cycle de vie d'une pièce et d'une obligation. Le vert n'est employé que pour un état achevé : déclarée, payée, conforme."
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUTS.map((s) => (
            <PastilleStatut key={s} statut={s} />
          ))}
        </div>
      </Section>

      <Section titre="6 · Formats de données">
        <div style={{ ...CARTE, overflow: "hidden" }}>
          <div style={{ ...ENTETE_COLONNE, display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr" }}>
            <span>Élément</span>
            <span>Règle</span>
            <span>Exemple</span>
          </div>
          {FORMATS.map(([element, regle, exemple]) => (
            <div
              key={element}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.6fr 1fr",
                alignItems: "center",
                height: 34,
                padding: "0 14px",
                borderBottom: "1px solid var(--line-100)",
                font: "400 12.5px/1 var(--police-texte)",
              }}
            >
              <span>{element}</span>
              <span style={{ color: "var(--ink-500)" }}>{regle}</span>
              <span
                className="tabulaire"
                style={{ color: exemple.startsWith("(") ? "var(--danger)" : "var(--ink-900)" }}
              >
                {exemple}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <aside
        style={{
          ...CARTE,
          background: "var(--brand-indigo-100)",
          padding: "16px 18px",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          font: "400 12.5px/1.8 var(--police-texte)",
          color: "var(--ink-900)",
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <b>Interdits</b>
          <br />
          Pas de mode sombre · pas de dégradé · pas d&rsquo;animation spectaculaire · pas de photo
          de banque d&rsquo;images · pas de troisième couleur de marque · icônes linéaires à trait
          fin, jeu unique.
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <b>À fournir par le cabinet</b>
          <br />
          Logo monochrome blanc au format SVG · jeu d&rsquo;icônes retenu · gabarits de messages de
          relance, portail et WhatsApp · liste officielle des seuils et taux du référentiel.
        </div>
      </aside>
    </main>
  );
}
