import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  LigneTableau,
  EtatVide,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { aujourdhui } from "@/app/lib/portefeuille";
import {
  lireCodes,
  lireParametre,
  lireDecisions,
  lireMonCircuit,
  lireValidation,
  type EtatDUneDecision,
  type MonCircuit,
  type ParametreResolu,
} from "@/app/lib/referentiel";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";
import { EssaiDesRegles } from "@/app/components/referentiel/EssaiDesRegles";
import { ConstructeurDeRegle, TrancherLaRegle } from "@/app/components/referentiel/ConstructeurDeRegle";
import {
  lireCatalogueDuConstructeur,
  lirePropositionsDeRegles,
  type CatalogueDuConstructeur,
  type PropositionDeRegle,
} from "@/app/lib/regles-du-cabinet";
import {
  ProposerUneVersion,
  RetirerLaDecision,
  TrancherLaProposition,
  ValiderLaVersion,
} from "@/app/components/referentiel/GestesReferentiel";
import { ErreurApi, controlerPieceDemonstration, listerPiecesDemonstration } from "@/app/lib/api";
import { lireCatalogueDesRegles } from "@/app/lib/regles";

export const metadata: Metadata = { title: "Référentiel — Plateforme CGA" };

/**
 * E-A01 · Le référentiel normatif et son état de validation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ÉCRAN LE MOINS SPECTACULAIRE, ET LE PLUS IMPORTANT
 *
 * Tant qu'aucun paramètre n'est confirmé sur le Code général des impôts, **aucun
 * chiffre produit par la plateforme n'est opposable**. C'est le seul endroit où
 * cela se voit d'un coup d'œil, paramètre par paramètre, avec son fondement et
 * sa source.
 *
 * IL RÉPOND À UNE QUESTION, ET UNE SEULE
 *
 * « Sur quoi repose ce chiffre ? » Un adhérent redressé la posera, un
 * vérificateur aussi, et il faut pouvoir répondre autrement que par « le
 * logiciel l'a calculé ». Chaque ligne porte son fondement en clair et sa
 * source.
 *
 * ⚠️ PAS 95 : IL DÉCIDE, POUR LE CABINET SEUL
 *
 * Il ne modifiait rien. Depuis le pas 95, le cabinet y valide les versions livrées
 * « à valider », propose de nouvelles versions datées et les fait valider, selon le
 * circuit lu au référentiel. Les décisions sont journalisées avec leur motif, et
 * forment la surcouche du cabinet : le fichier commun n'est jamais réécrit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "code", libelle: "Paramètre", largeur: "minmax(0, 1.3fr)" },
  { cle: "libelle", libelle: "Intitulé", largeur: "minmax(0, 2fr)" },
  { cle: "valeur", libelle: "Valeur", largeur: "120px", aDroite: true },
  { cle: "du", libelle: "Applicable du", largeur: "110px" },
  { cle: "statut", libelle: "Statut", largeur: "104px" },
];

export default async function Referentiel() {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403 et le visiteur voit un 500.
  if (!detient(acces, "LIRE_DOSSIER")) {
    return <EcranReserve titre="Référentiel et règles" permission="LIRE_DOSSIER" acces={acces} />;
  }
  const jour = aujourdhui();
  const [validation, codes] = await Promise.all([lireValidation(jour), lireCodes()]);

  // Les paramètres sont résolus un par un : la route ne rend pas la liste
  // complète, et fabriquer un point d'entrée qui la rendrait ferait entrer une
  // commodité d'écran dans un contexte dont la discipline est la lecture datée.
  const parametres = await Promise.all(
    codes.map((code) => lireParametre(code, jour).catch(() => null)),
  );
  const resolus = parametres.filter((p): p is ParametreResolu => p !== null);

  // Pas 95 : ce que la session peut décider, et les décisions du cabinet. Réservées au
  // cabinet côté backend ; sans elles, l'écran reste celui de la lecture.
  let circuit: MonCircuit | null = null;
  let decisions: EtatDUneDecision[] = [];
  if (acces.interne) {
    [circuit, decisions] = await Promise.all([
      lireMonCircuit().catch(() => null),
      lireDecisions().catch(() => [] as EtatDUneDecision[]),
    ]);
  }
  const droits = (p: ParametreResolu) => circuit?.par_nature[p.nature];
  const aValider = resolus.filter((p) => p.statut === "A_VALIDER" && droits(p)?.peut_valider);
  const proposables = resolus.filter((p) => droits(p)?.peut_proposer);
  const enAttente = decisions.filter((d) => d.decision.statut === "PROPOSEE");

  // Pas 97 : le constructeur de règles et les règles construites par le cabinet.
  let catalogue: CatalogueDuConstructeur | null = null;
  let reglesConstruites: PropositionDeRegle[] = [];
  if (acces.interne) {
    [catalogue, reglesConstruites] = await Promise.all([
      lireCatalogueDuConstructeur().catch(() => null),
      lirePropositionsDeRegles().catch(() => [] as PropositionDeRegle[]),
    ]);
  }

  // Pas 90 : le catalogue des règles et l'essai sur une facture. Deux lectures facultatives,
  // qui disent leur refus sans faire tomber les paramètres.
  const regles = await lireCatalogueDesRegles(jour).catch((e: unknown) => (e instanceof ErreurApi ? e.message : Promise.reject(e)));
  const peutEprouver = detient(acces, "CONTROLER_CONFORMITE");
  let factureDeDepart: string | null = null;
  if (peutEprouver) {
    try {
      const [premiere] = await listerPiecesDemonstration();
      if (premiere) factureDeDepart = JSON.stringify((await controlerPieceDemonstration(premiere)).facture, null, 2);
    } catch {
      factureDeDepart = null;
    }
  }

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Référentiel et règles" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Référentiel normatif</h1>
          <p>
            {validation.total} paramètres, résolus au{" "}
            {new Date(jour).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {!validation.opposable && (
          <div className="avertissement-ecran" role="alert">
            <strong>
              Aucun chiffre produit par cette plateforme n&rsquo;est opposable.
            </strong>
            {validation.non_valides.length} des {validation.total} paramètres portent le
            statut <code>A_VALIDER</code> : ils proviennent de sources secondaires et
            n&rsquo;ont pas été confrontés au texte. Un fiscaliste nommé doit confirmer
            chaque valeur sur le Code général des impôts en vigueur, la loi de finances de
            l&rsquo;année et la circulaire d&rsquo;application, avant toute mise en
            production.
          </div>
        )}

        {circuit && (aValider.length > 0 || proposables.length > 0 || decisions.length > 0) && (
          <Panneau
            titre="Décisions du cabinet"
            aide="Ce que le cabinet valide ici s'applique à ses calculs dès le suivant, et à lui seul : le référentiel commun n'est pas réécrit. Chaque décision est journalisée avec son motif."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 14px" }}>
              {enAttente.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ margin: 0, font: "600 13px/1.4 var(--police-texte)" }}>Propositions à trancher</h3>
                  {enAttente.map(({ decision: d, nature }) => {
                    const regle = nature ? circuit!.par_nature[nature] : undefined;
                    const auteur = d.propose_par === acces.compte;
                    return (
                      <div key={d.identifiant} style={{ border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", padding: "8px 12px" }}>
                        <p style={{ margin: 0, font: "500 13px/1.5 var(--police-texte)" }}>
                          {d.code} : {String(d.valeur)} à compter du {d.applicable_du.split("-").reverse().join("/")}
                        </p>
                        <p style={{ margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                          Proposé par {d.propose_par_nom} : « {d.motif} » · {d.fondement?.texte} ({d.fondement?.source})
                        </p>
                        {regle?.peut_valider && !(regle.quatre_yeux && auteur) ? (
                          <TrancherLaProposition identifiant={d.identifiant} motifMinimum={circuit!.motif_minimum} />
                        ) : (
                          <p style={{ margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                            {auteur && regle?.quatre_yeux
                              ? "Une autre personne désignée par le circuit la validera."
                              : "Le circuit ne vous désigne pas pour la trancher."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}

              {aValider.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ margin: 0, font: "600 13px/1.4 var(--police-texte)" }}>Versions livrées à valider</h3>
                  {aValider.map((p) => (
                    <div key={p.code} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <p style={{ margin: 0, font: "400 13px/1.5 var(--police-texte)" }}>
                        <strong>{p.code}</strong> · {formater(p)} depuis le {p.applicable_du.split("-").reverse().join("/")} · {p.fondement.texte}
                      </p>
                      <ValiderLaVersion code={p.code} applicableDu={p.applicable_du} motifMinimum={circuit!.motif_minimum} />
                    </div>
                  ))}
                </section>
              )}

              {proposables.length > 0 && (
                <details>
                  <summary style={{ cursor: "pointer", font: "600 13px/1.5 var(--police-texte)" }}>Proposer une nouvelle version</summary>
                  <div style={{ paddingTop: 8 }}>
                    <ProposerUneVersion
                      motifMinimum={circuit.motif_minimum}
                      premierJour={jour}
                      parametres={proposables.map((p) => ({ code: p.code, libelle: p.libelle, unite: p.unite, valeur: p.valeur, depuis: p.applicable_du }))}
                    />
                  </div>
                </details>
              )}

              {decisions.some((d) => d.decision.statut !== "PROPOSEE") && (
                <details>
                  <summary style={{ cursor: "pointer", font: "600 13px/1.5 var(--police-texte)" }}>Historique des décisions du cabinet</summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, font: "400 12.5px/1.7 var(--police-texte)" }}>
                    {decisions
                      .filter((d) => d.decision.statut !== "PROPOSEE")
                      .map(({ decision: d, sans_objet, nature }) => (
                        <li key={d.identifiant}>
                          {d.code} · {d.sorte === "VALIDATION" ? "validation" : `nouvelle valeur ${String(d.valeur)}`} du{" "}
                          {d.applicable_du.split("-").reverse().join("/")} · {d.statut === "APPLIQUEE" ? "appliquée" : "refusée"} par{" "}
                          {d.tranche_par_nom}
                          {sans_objet && <span style={{ color: "var(--ink-500)" }}> · sans objet : {sans_objet}</span>}
                          {d.fin_d_effet && (
                            <span style={{ color: "var(--ink-500)" }}>
                              {" "}· retirée à compter du {d.fin_d_effet.split("-").reverse().join("/")} par {d.retire_par_nom} : « {d.motif_du_retrait} »
                            </span>
                          )}
                          {/* Pas 98 : une décision validée se retire, vers l'avant, par qui peut valider. */}
                          {d.statut === "APPLIQUEE" && !d.fin_d_effet && nature && circuit!.par_nature[nature]?.peut_valider && (
                            <RetirerLaDecision sorte="parametre" identifiant={d.identifiant} premierJour={jour} motifMinimum={circuit!.motif_minimum} />
                          )}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </div>
          </Panneau>
        )}

        <Panneau
          titre="Paramètres en vigueur"
          aide="Chaque valeur porte son fondement et sa source. C'est ce qui permet de répondre à « sur quoi repose ce chiffre ? » autrement que par « le logiciel l'a calculé »."
        >
          <EnteteTableau colonnes={COLONNES} />
          {resolus.map((parametre, rang) => (
            <Ligne key={parametre.code} parametre={parametre} rang={rang} />
          ))}
        </Panneau>

        <Panneau
          titre="Fondements"
          aide="La source de chaque valeur, telle qu'elle est consignée au référentiel."
        >
          <dl className="faits">
            {resolus.map((parametre) => (
              <Fondement key={parametre.code} parametre={parametre} />
            ))}
          </dl>
        </Panneau>

        <Panneau
          titre="Catalogue des règles de conformité"
          aide="Réservé au cabinet : chaque règle porte son fondement, son statut de validation, et le prédicat que le moteur exécute."
        >
          {typeof regles === "string" ? (
            <EtatVide titre="Le catalogue ne se lit pas" detail={regles} />
          ) : regles.length === 0 ? (
            <EtatVide titre="Aucune règle en vigueur" />
          ) : (
            regles.map((r) => (
              <details key={r.code} style={{ borderBottom: "1px solid var(--line-100)", padding: "8px 14px" }}>
                <summary style={{ cursor: "pointer", font: "400 13px/1.5 var(--police-texte)" }}>
                  <strong>{r.code}</strong> · {r.libelle} · {r.severite.toLowerCase()} · {r.statut === "VALIDE" ? "validée" : "à valider"} ·
                  version {r.version}
                </summary>
                <div style={{ font: "400 12.5px/1.6 var(--police-texte)", padding: "6px 0 4px" }}>
                  <p style={{ margin: 0 }}><strong>Fondement :</strong> {r.fondement.texte}</p>
                  <p style={{ margin: 0, color: "var(--ink-500)" }}>{r.fondement.source}</p>
                  <p style={{ margin: "4px 0 0" }}><strong>Message :</strong> {r.message}</p>
                  <p style={{ margin: 0 }}><strong>Remédiation :</strong> {r.remediation}</p>
                  <pre style={{ margin: "6px 0 0", padding: 8, overflowX: "auto", background: "var(--surface-alt)", font: "400 11.5px/1.45 var(--police-mono, monospace)" }}>
                    {JSON.stringify(r.predicat, null, 2)}
                  </pre>
                </div>
              </details>
            ))
          )}
        </Panneau>

        {catalogue && (catalogue.peut_proposer || reglesConstruites.length > 0) && (
          <Panneau
            titre="Règles construites par le cabinet"
            aide="Une règle se construit en conditions, s'éprouve sur les factures, puis une autre personne la valide. Validée, elle contrôle les factures du cabinet dès le contrôle suivant, et de lui seul."
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 14px" }}>
              {reglesConstruites.map((p) => {
                const auteur = p.propose_par === acces.compte;
                return (
                  <div key={p.identifiant} style={{ border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", padding: "8px 12px" }}>
                    <p style={{ margin: 0, font: "500 13px/1.5 var(--police-texte)" }}>
                      {p.regle.code} · {p.regle.libelle} · {p.regle.severite.toLowerCase()} ·{" "}
                      {p.statut === "PROPOSEE"
                        ? "à valider"
                        : p.statut === "REFUSEE"
                          ? `refusée par ${p.tranche_par_nom}`
                          : p.fin_d_effet
                            ? `retirée à compter du ${p.fin_d_effet.split("-").reverse().join("/")} par ${p.retire_par_nom}`
                            : `en vigueur, validée par ${p.tranche_par_nom}`}
                    </p>
                    <p style={{ margin: 0, font: "400 12.5px/1.5 var(--police-texte)" }}>{p.phrase}</p>
                    <p style={{ margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                      Essai : réagit sur {p.essai.reagit_sur.length} des {p.essai.eprouvees} factures
                      {p.essai.reagit_sur.length > 0 ? ` (${p.essai.reagit_sur.join(", ")})` : ""} · proposée par {p.propose_par_nom} : « {p.motif} »
                    </p>
                    {p.statut === "APPLIQUEE" && !p.fin_d_effet && catalogue!.peut_valider && (
                      <RetirerLaDecision sorte="regle" identifiant={p.identifiant} premierJour={jour} motifMinimum={catalogue!.motif_minimum} />
                    )}
                    {p.statut === "PROPOSEE" &&
                      (catalogue!.peut_valider && !(catalogue!.quatre_yeux && auteur) ? (
                        <TrancherLaRegle identifiant={p.identifiant} motifMinimum={catalogue!.motif_minimum} />
                      ) : (
                        <p style={{ margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
                          {auteur ? "Une autre personne désignée par le circuit la validera." : "Le circuit ne vous désigne pas pour la trancher."}
                        </p>
                      ))}
                  </div>
                );
              })}
              {catalogue.peut_proposer && (
                <details>
                  <summary style={{ cursor: "pointer", font: "600 13px/1.5 var(--police-texte)" }}>Construire une règle</summary>
                  <div style={{ paddingTop: 8 }}>
                    <ConstructeurDeRegle catalogue={catalogue} premierJour={jour} />
                  </div>
                </details>
              )}
            </div>
          </Panneau>
        )}

        {peutEprouver && factureDeDepart && (
          <Panneau titre="Éprouver les règles sur une facture" aide="Sur une facture de démonstration modifiée à la main. Rien n'est enregistré.">
            <EssaiDesRegles factureDeDepart={factureDeDepart} aujourdhui={jour} />
          </Panneau>
        )}
      </div>
    </>
  );
}

function Ligne({ parametre, rang }: { parametre: ParametreResolu; rang: number }) {
  const aValider = parametre.statut === "A_VALIDER";
  return (
    <LigneTableau colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"}>
      <Cellule tabulaire gras titre={parametre.code}>
        {parametre.code}
      </Cellule>
      <Cellule couleur="var(--ink-500)" titre={parametre.libelle}>
        {parametre.libelle}
      </Cellule>
      <Cellule aDroite tabulaire gras>
        {formater(parametre)}
      </Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">
        {parametre.applicable_du}
      </Cellule>
      <Cellule>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "var(--rayon-pilule)",
            background: aValider ? "var(--danger-100)" : "var(--success-100)",
            color: aValider ? "var(--danger)" : "var(--success-700, #1a7f4b)",
            font: "600 10.5px/1.5 var(--police-texte)",
          }}
        >
          {aValider ? "À valider" : "Validé"}
        </span>
      </Cellule>
    </LigneTableau>
  );
}

function Fondement({ parametre }: { parametre: ParametreResolu }) {
  return (
    <>
      <dt>{parametre.code}</dt>
      <dd>
        {parametre.fondement.texte}
        <span style={{ display: "block", color: "var(--ink-500)" }}>
          Source : {parametre.fondement.source}
        </span>
        {/* La note porte les divergences de sources. C'est là que se lit, par
            exemple, que deux documents donnent au seuil espèces des valeurs qui
            varient d'un facteur cinq. */}
        {parametre.note && (
          <span
            style={{
              display: "block",
              marginTop: 4,
              paddingLeft: 8,
              borderLeft: "2px solid var(--danger)",
              color: "var(--ink-700)",
            }}
          >
            {parametre.note}
          </span>
        )}
      </dd>
    </>
  );
}

/**
 * Une valeur légale s'affiche avec son unité, jamais nue.
 *
 * « 19,25 » ne dit pas s'il s'agit d'un pourcentage, de jours ou de francs — et
 * les trois existent dans ce référentiel.
 */
function formater(parametre: ParametreResolu): string {
  const valeur = String(parametre.valeur);
  switch (parametre.unite) {
    case "POURCENTAGE":
      return `${valeur.replace(".", ",")} %`;
    case "FCFA":
      return `${Number(valeur).toLocaleString("fr-FR")} F`;
    case "JOURS":
      return `${valeur} j`;
    case "EXERCICES":
      return `${valeur} ex.`;
    default:
      return valeur;
  }
}
