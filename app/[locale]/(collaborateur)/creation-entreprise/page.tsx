import type { Metadata } from "next";

import { OuvertureDossier } from "@/app/components/creations/GestesCreation";
import { Link } from "@/i18n/navigation";

import { EtatErreur, EtatVide, Panneau } from "@/app/components/Tableau";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ErreurApi } from "@/app/lib/api";
import { detient } from "@/app/lib/acces";
import { dateCourte } from "@/app/lib/formats";
import {
  ETAPES,
  LIBELLES_ETAPE,
  FORMES_JURIDIQUES,
  lireChecklist,
  lirePipeline,
  type Etape,
  type LigneCreation,
} from "@/app/lib/creations";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Création d'entreprise — Plateforme CGA" };

// Le pipeline se lit à la date du jour — l'immobilité d'un dossier se compte
// depuis aujourd'hui, et un rendu figé au build afficherait des retards périmés.
export const dynamic = "force-dynamic";

/**
 * E13 · Pipeline de création d'entreprise.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN TABLEAU DE COLONNES, PAS UNE LISTE
 *
 * Le dossier de design décrit ce contexte comme « un vrai tunnel ». L'écran le
 * montre comme tel : une colonne par étape, les dossiers dedans. C'est la seule
 * forme qui répond d'un coup d'œil à la question du chargé de formalités —
 * « où sont mes dossiers ? » — là où une liste triée oblige à lire une colonne
 * « étape » ligne par ligne pour reconstituer mentalement le même tableau.
 *
 * L'ORDRE À L'INTÉRIEUR D'UNE COLONNE VIENT DU BACKEND
 *
 * Du plus ancien mouvement au plus récent. Un dossier qui dort depuis trois
 * semaines se présente avant celui d'hier. Le retrier par nom en ferait une
 * liste alphabétique — jolie, et inutile pour relancer.
 *
 * DEUX SIGNAUX SEULEMENT, ET CHACUN DIT QUOI FAIRE
 *
 * Les pièces manquantes disent « rappeler le fondateur ». Le dépassement du
 * délai du guichet dit « rappeler le CFCE ». Tout le reste est du contexte : ni
 * couleur, ni pastille, pour que ces deux-là se voient.
 *
 * CE QUE CET ÉCRAN NE FAIT PAS ENCORE
 *
 * Il ne pose aucun geste : ouvrir, faire avancer, convertir se font par l'API.
 * C'est assumé pour une première version — ces gestes se posent au téléphone,
 * devant le fondateur, et un formulaire mal conçu coûterait plus qu'il ne
 * servirait. Les routes existent et sont éprouvées ; l'écran de saisie viendra
 * quand le cabinet aura dit dans quel ordre il les enchaîne réellement.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PipelineCreation() {
  const acces = await exigerAcces();
  if (!detient(acces, "SUIVRE_FORMALITE")) {
    return (
      <EcranReserve
        titre="Création d&rsquo;entreprise"
        permission="SUIVRE_FORMALITE"
        acces={acces}
      />
    );
  }

  let dossiers: LigneCreation[] = [];
  let erreur: string | null = null;
  // Les checklists par forme, pour le formulaire d'ouverture (pas 82). Une forme dont la
  // checklist ne se lit pas s'ouvre quand même, sans la liste.
  const checklists = Object.fromEntries(
    await Promise.all(
      FORMES_JURIDIQUES.map(async (f) => [f, await lireChecklist(f).catch(() => [])] as const),
    ),
  );
  try {
    dossiers = await lirePipeline();
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  // Les deux états terminaux ne sont pas des colonnes du tunnel : ils le
  // ferment. Les mêler aux étapes actives allongerait le tableau de deux
  // colonnes que personne ne relance.
  const actives = ETAPES.filter((e) => e !== "CONVERTI" && e !== "ABANDONNE");
  const parEtape = new Map<Etape, LigneCreation[]>();
  for (const etape of ETAPES) parEtape.set(etape, []);
  for (const dossier of dossiers) parEtape.get(dossier.etape)?.push(dossier);

  const convertis = parEtape.get("CONVERTI") ?? [];
  const abandonnes = parEtape.get("ABANDONNE") ?? [];
  const enCours = actives.reduce((n, e) => n + (parEtape.get(e)?.length ?? 0), 0);
  const aRelancer = dossiers.filter((d) => d.en_retard).length;

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Création d’entreprise" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Pipeline de création</h1>
          <p>
            {enCours} dossier{enCours > 1 ? "s" : ""} en cours
            {aRelancer > 0 && ` · ${aRelancer} à relancer au guichet`}
            {convertis.length > 0 && ` · ${convertis.length} converti${convertis.length > 1 ? "s" : ""}`}
            {abandonnes.length > 0 && ` · ${abandonnes.length} abandonné${abandonnes.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <Panneau titre="Nouveau dossier" aide="La date d'ouverture est celle du jour, posée par le serveur">
          <OuvertureDossier formes={FORMES_JURIDIQUES} checklists={checklists} />
        </Panneau>

        {erreur ? (
          <EtatErreur titre="Pipeline indisponible" detail={erreur} />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${actives.length}, minmax(190px, 1fr))`,
                gap: 12,
                overflowX: "auto",
                alignItems: "start",
              }}
            >
              {actives.map((etape) => (
                <ColonneEtape
                  key={etape}
                  etape={etape}
                  dossiers={parEtape.get(etape) ?? []}
                />
              ))}
            </div>

            {(convertis.length > 0 || abandonnes.length > 0) && (
              <div className="page-travail__duo" style={{ marginTop: 16 }}>
                <Panneau
                  titre="Convertis"
                  aide="Entrés au portefeuille, avec leur premier exercice"
                >
                  {convertis.length === 0 ? (
                    <EtatVide titre="Aucune conversion" />
                  ) : (
                    convertis.map((d) => (
                      <LigneClose
                        key={d.reference}
                        dossier={d}
                        precision={d.converti_en ? `NIU ${d.converti_en}` : ""}
                      />
                    ))
                  )}
                </Panneau>
                <Panneau titre="Abandonnés" aide="Le motif est ce qui rend le pipeline analysable">
                  {abandonnes.length === 0 ? (
                    <EtatVide titre="Aucun abandon" />
                  ) : (
                    abandonnes.map((d) => (
                      <LigneClose key={d.reference} dossier={d} precision="" />
                    ))
                  )}
                </Panneau>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ColonneEtape({ etape, dossiers }: { etape: Etape; dossiers: LigneCreation[] }) {
  return (
    <section
      style={{
        border: "1px solid var(--line-200)",
        borderRadius: "var(--rayon)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid var(--line-200)",
        }}
      >
        <h2 style={{ margin: 0, font: "600 13px/1.2 var(--police-texte)", color: "var(--ink-900)" }}>
          {LIBELLES_ETAPE[etape]}
        </h2>
        <span
          style={{
            marginLeft: "auto",
            font: "600 12px/1 var(--police-texte)",
            color: "var(--ink-500)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {dossiers.length}
        </span>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, minHeight: 60 }}>
        {dossiers.length === 0 ? (
          <p style={{ margin: 0, font: "400 12px/1.4 var(--police-texte)", color: "var(--ink-400)" }}>
            Aucun dossier
          </p>
        ) : (
          dossiers.map((dossier) => <CarteDossier key={dossier.reference} dossier={dossier} />)
        )}
      </div>
    </section>
  );
}

function CarteDossier({ dossier }: { dossier: LigneCreation }) {
  return (
    <article
      style={{
        border: "1px solid var(--line-200)",
        borderRadius: 8,
        padding: "9px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        // Le retard du guichet est le seul signal qui colore la carte entière :
        // c'est le seul qui appelle une action hors du cabinet.
        borderLeft: dossier.en_retard ? "3px solid var(--danger)" : undefined,
      }}
    >
      {/* Pas 82 : la carte ouvre la fiche, où le dossier s'actionne. */}
      <Link
        href={`/creation-entreprise/${dossier.reference}`}
        style={{ font: "600 13px/1.3 var(--police-texte)", color: "var(--brand-indigo-700)" }}
      >
        {dossier.denomination_souhaitee}
      </Link>
      <span style={{ font: "400 12px/1.3 var(--police-texte)", color: "var(--ink-500)" }}>
        {dossier.forme_juridique} · {dossier.fondateur}
      </span>
      <span
        style={{
          font: "400 11px/1.3 var(--police-texte)",
          color: "var(--ink-400)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        Sans mouvement depuis {dossier.jours_d_immobilite} j ·{" "}
        {dateCourte(dossier.immobile_depuis)}
      </span>

      {dossier.pieces_manquantes > 0 && (
        <Signal
          ton="attention"
          texte={`${dossier.pieces_manquantes} pièce${dossier.pieces_manquantes > 1 ? "s" : ""} manquante${dossier.pieces_manquantes > 1 ? "s" : ""}`}
        />
      )}
      {dossier.en_retard && <Signal ton="danger" texte="Délai du guichet dépassé" />}
      {dossier.immatriculee && <Signal ton="succes" texte="RCCM et NIU obtenus" />}
    </article>
  );
}

function Signal({ ton, texte }: { ton: "attention" | "danger" | "succes"; texte: string }) {
  // ⚠️ Texte sur fond -100, jamais la couleur pleine en texte : `--warning` ne
  // présente que 4,3:1 sur blanc et le dossier de design l'interdit à 13 px
  // (§ 10.8). Chaque signal porte de toute façon son mot — la couleur ne
  // porte jamais seule l'information.
  const palette = {
    attention: { fond: "var(--warning-100)", texte: "var(--warning)" },
    danger: { fond: "var(--danger-100)", texte: "var(--danger)" },
    succes: { fond: "var(--success-100)", texte: "var(--success)" },
  }[ton];
  return (
    <span
      style={{
        alignSelf: "flex-start",
        background: palette.fond,
        color: palette.texte,
        borderRadius: 5,
        padding: "2px 6px",
        font: "600 11px/1.3 var(--police-texte)",
      }}
    >
      {texte}
    </span>
  );
}

function LigneClose({ dossier, precision }: { dossier: LigneCreation; precision: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "9px 14px",
        borderBottom: "1px solid var(--line-100)",
      }}
    >
      <strong style={{ font: "600 13px/1.3 var(--police-texte)", color: "var(--ink-900)" }}>
        {dossier.denomination_souhaitee}
      </strong>
      <span style={{ font: "400 12px/1.3 var(--police-texte)", color: "var(--ink-500)" }}>
        {precision}
      </span>
      <span
        style={{
          marginLeft: "auto",
          font: "400 12px/1.3 var(--police-texte)",
          color: "var(--ink-400)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {dateCourte(dossier.immobile_depuis)}
      </span>
    </div>
  );
}
