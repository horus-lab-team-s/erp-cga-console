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
import { lireParametre } from "@/app/lib/referentiel";
import { lireLaLecturePreparee } from "@/app/lib/lecture-au-depot";
import { dateCourte } from "@/app/lib/formats";
import { jourDuFait } from "@/app/lib/heure-douala";
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
  // 18 octobre 2026 : le taux du calcul HT/TVA depuis le TTC, lu à la date de la facture
  // quand elle est connue (une facture de 2024 se lit au taux de 2024). Illisible, le
  // bouton se retire.
  const tauxTva = await lireParametre("TVA_TAUX_GENERAL", piece.facture?.date_emission || undefined)
    .then((p) => (typeof p.valeur === "number" ? p.valeur : Number(p.valeur)))
    .then((v) => (Number.isFinite(v) ? v : null))
    .catch(() => null);
  const f = piece.facture;
  // 18 octobre 2026 (point 13) : sans facture enregistrée, ce que l'agent a lu au dépôt.
  const lue = f ? null : await lireLaLecturePreparee(piece.identifiant).catch(() => null);
  const prepareeUtilisable = lue && !lue.incident ? lue : null;
  const v = Object.fromEntries((prepareeUtilisable?.valeurs ?? []).map((x) => [x.champ, x.valeur]));
  const texte = (c: string) => (v[c] == null ? "" : String(v[c]));
  const montant = (c: string) => (v[c] == null ? "" : String(Math.round(Number(v[c]) || 0)));
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
    : prepareeUtilisable
      ? {
          emetteur: texte("emetteur"),
          niu_emetteur: texte("niu_emetteur"),
          niu_actif: null,
          reference: texte("reference_document"),
          date_emission: texte("date_emission"),
          lignes: Array.isArray(v.lignes)
            ? (v.lignes as { designation: string; montant_ht: string | null }[]).map((l) => ({
                designation: l.designation,
                montant_ht: l.montant_ht == null ? "" : String(Math.round(Number(l.montant_ht) || 0)),
              }))
            : [{ designation: "", montant_ht: "" }],
          montant_ht: montant("montant_ht"),
          montant_tva: montant("montant_tva"),
          montant_ttc: montant("montant_ttc"),
          source: "LECTURE_AUTOMATIQUE",
        }
      : null;
  const preparee = prepareeUtilisable
    ? {
        aVerifier: Object.fromEntries(
          prepareeUtilisable.valeurs
            .filter((x) => x.a_relire)
            .map((x) => [x.champ === "reference_document" ? "reference" : x.champ, Math.round(Number(x.confiance) * 100)]),
        ),
        points: prepareeUtilisable.points_a_verifier,
        lueLe: dateCourte(jourDuFait(prepareeUtilisable.lue_le)),
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
              tauxTva={tauxTva}
              preparee={preparee}
            />
          </section>
        </div>
      </div>
    </>
  );
}
