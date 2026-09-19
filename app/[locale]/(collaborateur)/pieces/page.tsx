import type { Metadata } from "next";

import { EtatErreur } from "@/app/components/Tableau";
import { BoiteReception, type LignePiece } from "@/app/components/collecte/BoiteReception";
import type { Severite } from "@/app/components/Gravite";
import type { Statut } from "@/app/components/Montant";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ErreurApi, controlerToutLeFlux, type ReponseControle } from "@/app/lib/api";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { LIBELLES_CANAL, LIBELLES_ETAT, lireDemandes, lirePieces } from "@/app/lib/collecte";
import { lireDossiers } from "@/app/lib/portefeuille";
import { lireEcartsEnAttente, lirePolitiqueDEcart, peutDonnerLeSecondRegard } from "@/app/lib/ecarts";
import { exigerAcces } from "@/app/lib/session";
import { ClasserLaPiece, ImportAuCabinet, LectureDePiece } from "@/app/components/collecte/GestesDuCabinet";
import { aujourdhui } from "@/app/lib/portefeuille";
import { Link } from "@/i18n/navigation";

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
 * ⚠️ PAS 75 : LE CANAL ET LE STATUT NE SONT PLUS SIMULÉS
 *
 * Ce commentaire disait : « le canal de réception et le statut du cycle de vie
 * appartiennent au contexte C · Collecte, non implémenté. Ils sont simulés dans
 * `lib/collecte-demo.ts` ». La collecte existait depuis longtemps au backend, et la
 * simulation était restée : sur 29 factures affichées, 17 canaux et 16 statuts
 * étaient faux, une facture comptabilisée s'affichait « Reçue », et quatre pièces
 * reçues n'apparaissaient pas. La table simulée est supprimée.
 *
 * Les lignes sont désormais les **pièces de la collecte**, jointes ici :
 *
 *   la pièce                  GET /collecte/pieces       canal, état, montant, dates
 *   la rectificative ouverte  GET /collecte/demandes     « Rectif. demandée »
 *   la conformité             contrôle du flux           verdict, par référence de facture
 *   le nom de l'entreprise    GET /portefeuille/entreprises, faute de quoi le NIU
 *
 * La jointure se fait sur le serveur : le navigateur reçoit des lignes résolues, et
 * ne recalcule aucun état.
 */
export default async function BoiteReceptionPieces() {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel. Sans elle, cet écran s'ouvrait à quiconque tenait
  // une session — administrateur compris, alors que c'est le seul rôle
  // explicitement privé de tout droit sur les dossiers. Le périmètre, lui, est
  // appliqué côté API : le front ne filtre pas ce que le backend a déjà trié.
  if (!detient(acces, "LIRE_PIECE")) {
    return <EcranReserve titre="Pièces justificatives" permission="LIRE_PIECE" acces={acces} />;
  }

  let lignes: LignePiece[] = [];
  let erreur: string | null = null;
  let dossiersDuPortefeuille: { niu: string; denomination: string }[] = [];
  // ⚠️ Pas 88 : le geste est proposé à qui peut déposer, et le dossier se choisit dans le
  // portefeuille lu ; un rôle qui ne le lit pas ne voit pas le bouton plutôt qu'une liste vide.
  const peutDeposer = detient(acces, "DEPOSER_PIECE");
  // Pas 91 : les pièces reçues, à identifier et marquer lues, pour qui identifie.
  const peutIdentifier = detient(acces, "IDENTIFIER_PIECE");
  let aIdentifier: Awaited<ReturnType<typeof lirePieces>> = [];
  // Pas 107 : les pièces lues qui attendent encore la fin de leur traitement. La validation de
  // leur écriture les comptabilise ; celles qui ne produiront pas d'écriture se classent.
  let aTerminer: Awaited<ReturnType<typeof lirePieces>> = [];
  // Pas 92 : les écarts qui attendent un second regard, pour qui la politique désigne.
  // Sans cette file, un écart proposé attendrait qu'on tombe dessus en ouvrant la pièce.
  let enAttente: Awaited<ReturnType<typeof lireEcartsEnAttente>> = [];
  if (acces.interne) {
    try {
      const politique = await lirePolitiqueDEcart();
      if (peutDonnerLeSecondRegard(acces, politique)) enAttente = await lireEcartsEnAttente();
    } catch {
      // Lecture de commodité : la boîte de réception reste entière sans elle.
    }
  }

  try {
    const [pieces, rapports, demandes, noms] = await Promise.all([
      lirePieces({}),
      controlerToutLeFlux(),
      lireDemandes(),
      // Le nom est une commodité : un rôle qui lit les pièces sans lire le portefeuille
      // voit le NIU, et l'écran reste juste.
      lireDossiers()
        .then((d) => {
          dossiersDuPortefeuille = d.map((x) => ({ niu: x.niu, denomination: x.denomination }));
          return new Map(d.map((x) => [x.niu, x.denomination]));
        })
        .catch(() => new Map<string, string>()),
    ]);
    lignes = construireLignes(pieces, rapports, demandes, noms);
    aIdentifier = pieces.filter((p) => p.etat === "RECUE");
    aTerminer = pieces.filter((p) => p.etat === "LUE" || p.etat === "RAPPROCHEE");
  } catch (cause) {
    erreur = cause instanceof ErreurApi ? cause.message : `Appel impossible : ${String(cause)}`;
  }

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Flux entrant" }, { libelle: "Pièces justificatives" }]}
        // Pas 76 : le compteur de notifications « 4 » était écrit en dur ; aucune notification n'existe.
      />

      <div className="contenu">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none", flexWrap: "wrap" }}>
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
            {lignes.length} pièce{lignes.length > 1 ? "s" : ""} reçue{lignes.length > 1 ? "s" : ""}
          </p>
          {/* Pas 74 : les pièces que le cabinet attend ont leur écran. */}
          <Link href="/pieces/attendues" style={{ marginLeft: "auto", font: "500 12.5px/1 var(--police-texte)" }}>
            Pièces attendues
          </Link>
          {/* ⚠️ Pas 88 : ce bouton était décoratif, sans action. */}
          {peutDeposer && dossiersDuPortefeuille.length > 0 && (
            <ImportAuCabinet dossiers={dossiersDuPortefeuille} aujourdhui={aujourdhui()} />
          )}
        </div>

        {enAttente.length > 0 && (
          <details style={{ flex: "none", border: "1px solid var(--warning)", borderRadius: "var(--rayon)", background: "var(--surface)", padding: "8px 12px" }}>
            <summary style={{ cursor: "pointer", font: "600 13px/1.5 var(--police-texte)" }}>
              {enAttente.length} écart{enAttente.length > 1 ? "s" : ""} de constat en attente d&rsquo;un second regard
            </summary>
            <p style={{ margin: "4px 0 8px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              Tant qu&rsquo;il n&rsquo;est pas confirmé, le constat compte : la TVA reste rejetée à la proposition d&rsquo;écriture.
              Le second regard se donne sur la pièce, jamais par l&rsquo;auteur de l&rsquo;écart.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, font: "400 12.5px/1.7 var(--police-texte)" }}>
              {enAttente.map((e) => (
                <li key={e.identifiant}>
                  <Link href={`/pieces/${e.reference_document}`}>{e.reference_document}</Link> · {e.code_regle} ({e.severite}) · proposé par{" "}
                  {e.propose_par} le {e.propose_le.slice(0, 10).split("-").reverse().join("/")}
                </li>
              ))}
            </ul>
          </details>
        )}

        {peutIdentifier && aIdentifier.length > 0 && (
          <details style={{ flex: "none", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", background: "var(--surface)", padding: "8px 12px" }}>
            <summary style={{ cursor: "pointer", font: "600 13px/1.5 var(--police-texte)" }}>
              {aIdentifier.length} pièce{aIdentifier.length > 1 ? "s" : ""} reçue{aIdentifier.length > 1 ? "s" : ""} à identifier
            </summary>
            <p style={{ margin: "4px 0 8px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              Une pièce ne se lit qu&rsquo;identifiée : nature, numéro, date et montant. Tant qu&rsquo;elle ne l&rsquo;est pas, elle
              reste dans le travail à faire.
            </p>
            {aIdentifier.map((p) => (
              <div key={p.identifiant} style={{ borderTop: "1px solid var(--line-100)", padding: "8px 0" }}>
                <p style={{ margin: "0 0 4px", font: "400 12.5px/1.5 var(--police-texte)" }}>
                  <strong>{p.identifiant}</strong> · {p.entreprise} · reçue par {LIBELLES_CANAL[p.canal]} le{" "}
                  {p.recue_le.slice(0, 10).split("-").reverse().join("/")}
                  {p.commentaire && <span style={{ color: "var(--ink-500)" }}> · « {p.commentaire} »</span>}
                </p>
                <LectureDePiece
                  identifiant={p.identifiant}
                  nomFichier={p.nom_fichier}
                  connu={{
                    type: p.type,
                    reference_document: p.reference_document,
                    date_document: p.date_document,
                    montant_ttc: p.montant_ttc,
                    emetteur: p.emetteur,
                  }}
                />
              </div>
            ))}
          </details>
        )}

        {peutIdentifier && aTerminer.length > 0 && (
          <details style={{ flex: "none", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)", background: "var(--surface)", padding: "8px 12px" }}>
            <summary style={{ cursor: "pointer", font: "600 13px/1.5 var(--police-texte)" }}>
              {aTerminer.length} pièce{aTerminer.length > 1 ? "s" : ""} lue{aTerminer.length > 1 ? "s" : ""} à comptabiliser ou classer
            </summary>
            <p style={{ margin: "4px 0 8px", font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" }}>
              Une pièce se comptabilise quand l&rsquo;écriture qui la cite est validée. Celle qui ne produira pas d&rsquo;écriture
              (un doublon, un relevé déjà rapproché) se classe, avec son motif. Tant que ni l&rsquo;un ni l&rsquo;autre n&rsquo;est
              fait, elle bloque la clôture de son mois.
            </p>
            {aTerminer.map((p) => (
              <div key={p.identifiant} style={{ borderTop: "1px solid var(--line-100)", padding: "8px 0" }}>
                <p style={{ margin: "0 0 4px", font: "400 12.5px/1.5 var(--police-texte)" }}>
                  <strong>{p.identifiant}</strong> · {p.entreprise}
                  {p.reference_document && (
                    <>
                      {" "}· <Link href={`/pieces/${p.reference_document}`}>{p.reference_document}</Link>
                    </>
                  )}{" "}
                  · {LIBELLES_ETAT[p.etat]}
                </p>
                <ClasserLaPiece identifiant={p.identifiant} />
              </div>
            ))}
          </details>
        )}

        {erreur ? (
          <EtatErreur titre="Contrôle de conformité indisponible" detail={erreur} />
        ) : (
          <BoiteReception lignes={lignes} />
        )}
      </div>
    </>
  );
}

const ORDRE_SEVERITE: Record<string, number> = {
  BLOQUANT: 4,
  MAJEUR: 3,
  AVERTISSEMENT: 2,
  INFORMATION: 1,
  CONFORME: 0,
};

/**
 * Une ligne par pièce reçue, avec ce que la collecte, les demandes et la conformité en
 * savent (pas 75).
 *
 * ⚠️ Trois règles, chacune pour une erreur déjà commise :
 *
 * - **La pièce est la ligne**, pas la facture : deux pièces peuvent porter la même
 *   facture (un doublon à arbitrer), et une pièce peut n'en porter aucune encore.
 * - **Le statut vient de la collecte.** « Rectif. demandée » ne se déduit pas d'un
 *   verdict bloquant : il faut qu'une demande soit réellement ouverte sur la pièce.
 * - **Sans facture extraite, pas de verdict** : `severite` reste `null`, et l'écran
 *   écrit « à identifier » plutôt qu'un « conforme » que personne n'a contrôlé.
 */
function construireLignes(
  pieces: Awaited<ReturnType<typeof lirePieces>>,
  rapports: ReponseControle[],
  demandes: Awaited<ReturnType<typeof lireDemandes>>,
  noms: Map<string, string>,
): LignePiece[] {
  const rapportPar = new Map(rapports.map((r) => [r.facture.document.reference, r]));
  const aRectifier = new Set(demandes.map((d) => d.piece_a_rectifier).filter((x): x is string => Boolean(x)));
  return pieces.map((piece) => {
    const reponse = piece.reference_document ? (rapportPar.get(piece.reference_document) ?? null) : null;
    const severite = reponse
      ? ((reponse.rapport.constats.length
          ? reponse.rapport.constats.reduce((pire, c) =>
              ORDRE_SEVERITE[c.severite] > ORDRE_SEVERITE[pire.severite] ? c : pire,
            ).severite
          : "CONFORME") as Severite)
      : null;
    return {
      identifiant: piece.identifiant,
      reference: piece.reference_document,
      adherent: noms.get(piece.entreprise) ?? reponse?.facture.destinataire.denomination ?? piece.entreprise,
      fournisseur: piece.emetteur ?? "—",
      date: piece.date_document ?? piece.recue_le.slice(0, 10),
      // Le backend rend un nombre ; la ligne garde la chaîne que `montantFcfa` formate.
      ttc: piece.montant_ttc === null ? null : String(piece.montant_ttc),
      canal: LIBELLES_CANAL[piece.canal],
      // Les libellés d'état de la collecte sont exactement des statuts de pastille.
      statut: (aRectifier.has(piece.identifiant) ? "Rectif. demandée" : LIBELLES_ETAT[piece.etat]) as Statut,
      severite,
      reponse,
    };
  });
}
