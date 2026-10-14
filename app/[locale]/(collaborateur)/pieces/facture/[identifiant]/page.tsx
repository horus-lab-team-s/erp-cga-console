import type { Metadata } from "next";

import { LectureDeFacture } from "@/app/components/collecte/LectureDeFacture";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { DocumentDeLaPiece } from "@/app/components/creation/DocumentDeLaPiece";
import { EtatErreur } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { lireLeDocumentDUnePiece } from "@/app/lib/actions-collecte";
import { appeler, ErreurApi } from "@/app/lib/api";
import type { FactureSaisie } from "@/app/lib/facture-etats";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Lire une facture" };
export const dynamic = "force-dynamic";

type PieceLue = {
  identifiant: string;
  entreprise: string;
  etat: string;
  nom_fichier: string | null;
  empreinte: string | null;
  facture: {
    emetteur: string;
    niu_emetteur: string | null;
    niu_actif: boolean | null;
    reference: string;
    date_emission: string;
    lignes: { designation: string; montant_ht: string }[];
    montant_ht: string;
    montant_tva: string;
    montant_ttc: string;
    source: "SAISIE" | "LECTURE_AUTOMATIQUE";
  } | null;
};

const entier = (t: string) => String(Math.round(Number(t)));

/**
 * Lire une facture, le document sous les yeux, et en tirer l'écriture (14 octobre 2026).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ : « une facture chargée transformée rapidement en
 * écriture ». À gauche le document, à droite la facture : lue automatiquement si la
 * lecture est configurée, sinon saisie ; confirmée ; puis l'écriture proposée par le
 * même moteur que partout (contrôle de conformité, 6xx, 4451, 401), et le brouillon.
 *
 * ⚠️ `IDENTIFIER_PIECE` pour lire, `SAISIR_ECRITURE` pour proposer : chacun les gestes
 * de son rôle, et le serveur vérifie de toute façon les deux.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PageLectureDeFacture({ params }: { params: Promise<{ identifiant: string }> }) {
  const acces = await exigerAcces();
  if (!detient(acces, "IDENTIFIER_PIECE")) {
    return <EcranReserve titre="Lire une facture" permission="IDENTIFIER_PIECE" acces={acces} />;
  }
  const { identifiant } = await params;
  let piece: PieceLue;
  let disponible = false;
  try {
    piece = (await appeler<{ piece: PieceLue }>(`/collecte/pieces/${encodeURIComponent(identifiant)}`, { authentifie: true })).piece;
    disponible = (await appeler<{ disponible: boolean }>("/collecte/lecture-automatique", { authentifie: true })).disponible;
  } catch (erreur) {
    if (erreur instanceof ErreurApi) {
      return (
        <>
          <EnteteTravail miettes={[{ libelle: "Pièces justificatives", href: "/pieces" }, { libelle: identifiant }]} />
          <div className="page-travail">
            <EtatErreur titre="La pièce ne se lit pas" detail={erreur.message} />
          </div>
        </>
      );
    }
    throw erreur;
  }
  const f = piece.facture;
  const initiale: FactureSaisie | null = f
    ? {
        emetteur: f.emetteur,
        niu_emetteur: f.niu_emetteur,
        niu_actif: f.niu_actif,
        reference: f.reference,
        date_emission: f.date_emission,
        lignes: f.lignes.map((l) => ({ designation: l.designation, montant_ht: entier(l.montant_ht) })),
        montant_ht: entier(f.montant_ht),
        montant_tva: entier(f.montant_tva),
        montant_ttc: entier(f.montant_ttc),
        source: f.source,
      }
    : null;

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Pièces justificatives", href: "/pieces" }, { libelle: `Facture ${piece.identifiant}` }]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Lire la facture</h1>
          <p>
            {piece.identifiant} · dossier {piece.entreprise} · {piece.etat.toLowerCase()}
          </p>
        </div>
        <div className="lecture-page">
          <section className="lecture-page__document" aria-label="Le document">
            {piece.empreinte ? (
              <DocumentDeLaPiece
                champs={{ identifiant: piece.identifiant }}
                libelle={piece.nom_fichier ?? "le document"}
                lire={lireLeDocumentDUnePiece}
                ouvrirDesLeDebut
              />
            ) : (
              <p className="lecture__note">Cette pièce n&rsquo;a pas de document : elle a été saisie au guichet.</p>
            )}
          </section>
          <section className="lecture-page__facture" aria-label="La facture">
            <LectureDeFacture
              identifiant={piece.identifiant}
              dossier={piece.entreprise}
              lectureDisponible={disponible && Boolean(piece.empreinte)}
              initiale={initiale}
              dejaLue={Boolean(f)}
            />
          </section>
        </div>
      </div>
    </>
  );
}
