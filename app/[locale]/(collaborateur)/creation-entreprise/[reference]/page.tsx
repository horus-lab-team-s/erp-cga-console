import type { Metadata } from "next";

import {
  Abandon,
  Conversion,
  FranchirEtape,
  Identifiants,
  RecevoirPiece,
} from "@/app/components/creations/GestesCreation";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EtatErreur, Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { ErreurApi } from "@/app/lib/api";
import { LIBELLES_ETAPE, lireDossierCreation, type FicheCreation } from "@/app/lib/creations";
import { dateCourte } from "@/app/lib/formats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Création ${reference} — Plateforme CGA` };
}

/**
 * E13 · La fiche d'un dossier de création (pas 82).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AVANT CE PAS, LE PIPELINE SE LISAIT ET NE S'ACTIONNAIT PAS
 *
 * L'écran montrait les dossiers par étape ; aucun ne s'ouvrait, aucun n'avançait.
 * La mesure d'avancement du pas 80 plaçait E13 à 11 % : un geste sur neuf. La fiche
 * porte désormais les sept autres : franchir l'étape ouverte, marquer une pièce
 * reçue, porter les identifiants, abandonner, convertir.
 *
 * ⚠️ L'ORDRE DE LA FICHE SUIT LE TRAVAIL
 *
 * Ce qui bloque d'abord (les constats), puis le geste suivant (l'étape), puis ce qui
 * se complète au fil de l'eau (pièces, identifiants), puis l'histoire (les jalons).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function FicheCreationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const acces = await exigerAcces();
  if (!detient(acces, "SUIVRE_FORMALITE")) {
    return <EcranReserve titre="Création d’entreprise" permission="SUIVRE_FORMALITE" acces={acces} />;
  }
  let fiche: FicheCreation | null = null;
  let erreur: string | null = null;
  try {
    fiche = await lireDossierCreation(reference);
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : String(cause);
  }
  const miettes = [{ libelle: "Création d’entreprise", href: "/creation-entreprise" }, { libelle: reference }];
  if (!fiche) {
    return (
      <>
        <EnteteTravail miettes={miettes} />
        <div className="page-travail">
          <EtatErreur titre="Dossier introuvable" detail={erreur ?? ""} />
        </div>
      </>
    );
  }
  const { dossier } = fiche;
  const clos = dossier.etape === "CONVERTI" || dossier.etape === "ABANDONNE";
  const suivantes = fiche.etapes_ouvertes.filter((e) => e !== "ABANDONNE");
  const texte: React.CSSProperties = { margin: 0, font: "400 13px/1.6 var(--police-texte)" };
  const im = dossier.immatriculation;

  return (
    <>
      <EnteteTravail miettes={miettes} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>{dossier.denomination_souhaitee}</h1>
          <p>
            {dossier.forme_juridique} · {dossier.fondateur.prenom} {dossier.fondateur.nom} · {LIBELLES_ETAPE[dossier.etape]}
            {fiche.en_retard && " · délai du guichet dépassé"}
          </p>
        </div>

        {fiche.constats.length > 0 && (
          <Panneau titre="Ce qui bloque" aide="Diagnostic du jour">
            <ul style={{ margin: 0, padding: "10px 16px 10px 32px" }}>
              {fiche.constats.map((c) => (
                <li key={c.code} style={{ ...texte, color: c.bloquant ? "var(--danger)" : "var(--ink-700)" }}>
                  {c.message}
                </li>
              ))}
            </ul>
          </Panneau>
        )}

        {dossier.etape === "CONVERTI" && dossier.converti_en && (
          <Panneau titre="Converti">
            <p style={{ ...texte, padding: "10px 16px" }}>
              L&rsquo;entreprise est au portefeuille sous le NIU {dossier.converti_en} ·{" "}
              <Link href="/portefeuille">portefeuille</Link>
            </p>
          </Panneau>
        )}
        {dossier.etape === "ABANDONNE" && (
          <Panneau titre="Abandonné">
            <p style={{ ...texte, padding: "10px 16px" }}>{dossier.motif_abandon}</p>
          </Panneau>
        )}

        {!clos && (
          <Panneau titre="Étape suivante" aide="Un cran à la fois ; l'abandon reste toujours ouvert">
            <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {dossier.etape === "LIVRAISON" ? (
                <Conversion reference={dossier.reference} />
              ) : (
                suivantes.map((e) => (
                  <FranchirEtape key={e} reference={dossier.reference} vers={e} libelle={LIBELLES_ETAPE[e]} />
                ))
              )}
              <Abandon reference={dossier.reference} />
            </div>
          </Panneau>
        )}

        <Panneau titre="Pièces de constitution" aide="Une pièce inconnue réclamée par le guichet s'ajoute au dossier">
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {dossier.pieces.map((p) => (
              <li key={p.code} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 16px", borderTop: "1px solid var(--line-100)" }}>
                <span style={{ ...texte, flex: 1, minWidth: 220 }}>
                  {p.libelle}
                  {!p.obligatoire && <span style={{ color: "var(--ink-500)" }}> (d&rsquo;usage)</span>}
                </span>
                {p.fournie_le ? (
                  <span style={{ ...texte, color: "var(--success)" }}>Reçue le {dateCourte(p.fournie_le)}</span>
                ) : clos ? (
                  <span style={{ ...texte, color: "var(--ink-500)" }}>Non reçue</span>
                ) : (
                  <RecevoirPiece reference={dossier.reference} code={p.code} />
                )}
              </li>
            ))}
          </ul>
        </Panneau>

        <Panneau titre="Identifiants délivrés">
          <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={texte}>
              RCCM {im.rccm ?? "—"}{im.rccm_obtenu_le && ` (${dateCourte(im.rccm_obtenu_le)})`} · NIU {im.niu ?? "—"}
              {im.niu_obtenu_le && ` (${dateCourte(im.niu_obtenu_le)})`} · Patente {im.patente ?? "—"} · CNPS {im.cnps ?? "—"}
            </p>
            {!clos && <Identifiants reference={dossier.reference} />}
          </div>
        </Panneau>

        <Panneau titre="Jalons" aide="L'histoire du dossier : qui a franchi quoi, et quand">
          <ul style={{ margin: 0, padding: "10px 16px 10px 32px" }}>
            {dossier.jalons.map((j, rang) => (
              <li key={`${j.etape}-${rang}`} style={texte}>
                {dateCourte(j.survenu_le)} · {LIBELLES_ETAPE[j.etape]}
                {j.par && <span style={{ color: "var(--ink-500)" }}> · {j.par}</span>}
                {j.commentaire && <span style={{ color: "var(--ink-500)" }}> · {j.commentaire}</span>}
              </li>
            ))}
          </ul>
        </Panneau>
      </div>
    </>
  );
}
