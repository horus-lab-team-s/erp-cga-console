import type { Metadata } from "next";

import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import {
  LIBELLES_ETAT_ECHEANCE,
  LIBELLES_ETAT_SOUSCRIPTION,
  lireEcheancier,
  lireSouscription,
  type Souscription,
} from "@/app/lib/souscription";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Suivi de votre souscription — CGA Broad Range",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Le suivi d'une souscription, sans compte (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * C'EST LA PAGE OÙ LE VISITEUR REVIENT APRÈS LE PAIEMENT
 *
 * Il n'a pas encore de compte : son compte n'existe qu'une fois l'accès ouvert. La
 * référence, longue et non devinable, protège la page.
 *
 * ⚠️ « PAYÉE » N'EST PAS « ACTIVE », ET L'ÉCRAN DIT POURQUOI
 *
 * Depuis le pas 83, une adhésion payée attend la vérification d'identité du cabinet. Sans
 * explication, un client qui a payé et ne reçoit rien croirait son argent perdu.
 *
 * ⚠️ PAS D'ÉCHÉANCIER AVANT LA DATE D'EFFET
 *
 * Il se calcule depuis la date d'effet, fixée à l'ouverture de l'accès : avant, il
 * n'existe pas, et l'écran ne l'appelle pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PageSuivi({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const lecture = await lireSouscription(reference);

  return (
    <main className="conteneur" style={{ paddingBlock: 48, maxWidth: 760, marginInline: "auto", paddingInline: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Votre souscription</h1>
      {"echec" in lecture ? (
        <p role="alert">
          {lecture.statut === 404
            ? "Cette souscription est introuvable. Vérifiez le lien reçu."
            : `La souscription ne peut pas être lue pour le moment (${lecture.echec}).`}
        </p>
      ) : (
        <Suivi souscription={lecture.valeur} />
      )}
    </main>
  );
}

function ceQuiSePasse(s: Souscription): string {
  switch (s.etat) {
    case "EN_ATTENTE_PAIEMENT":
      return "Le paiement n'est pas encore confirmé. Validez le message reçu sur votre téléphone ; cette page se met à jour dès la confirmation.";
    case "PAYEE":
      return s.ouvre_un_acces
        ? "Votre paiement est encaissé. Le cabinet vérifie votre identité avant d'ouvrir l'accès au dossier de l'entreprise, et vous contactera. Votre argent n'est ni rendu ni perdu."
        : "Votre paiement est encaissé. Le cabinet vous contactera pour la suite de la prestation.";
    case "ACTIVEE":
      return s.compte
        ? "Votre accès est ouvert : le lien pour définir votre mot de passe vous a été envoyé par courriel."
        : "Votre souscription est active.";
    case "ABANDONNEE":
      return `La souscription a été abandonnée${s.motif ? ` : ${s.motif}` : ""}.`;
    case "RESILIEE":
      return `La souscription a été résiliée${s.close_le ? ` le ${dateCourte(s.close_le.slice(0, 10))}` : ""}.`;
  }
}

async function Suivi({ souscription: s }: { souscription: Souscription }) {
  const echeancier =
    s.nature === "ABONNEMENT" && s.prend_effet_le ? await lireEcheancier(s.reference, aujourdhui()) : null;
  return (
    <>
      <p style={{ color: "#4f5b60", marginTop: 0 }}>
        {s.libelle}
        {s.formule ? ` (${s.formule.replaceAll("_", " ").toLowerCase()})` : ""} · engagée le {dateCourte(s.engagee_le.slice(0, 10))} ·{" "}
        {montantFcfa(s.montant)}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{LIBELLES_ETAT_SOUSCRIPTION[s.etat]}</p>
      <p role="status" style={{ marginTop: 0 }}>{ceQuiSePasse(s)}</p>
      {s.prend_effet_le && <p>Prend effet le {dateCourte(s.prend_effet_le)}.</p>}
      {s.etat === "ACTIVEE" && s.compte && (
        <p>
          <Link href="/connexion">Se connecter à mon espace</Link>
        </p>
      )}
      {echeancier && (
        <>
          <h2 style={{ fontSize: 16, marginTop: 28 }}>Vos mensualités</h2>
          {"echec" in echeancier ? (
            <p role="alert">L&rsquo;échéancier ne peut pas être lu pour le moment ({echeancier.echec}).</p>
          ) : echeancier.valeur.length === 0 ? (
            <p>Aucune mensualité n&rsquo;est encore due.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 6 }}>Période</th>
                    <th style={{ textAlign: "right", padding: 6 }}>Montant</th>
                    <th style={{ textAlign: "left", padding: 6 }}>Exigible le</th>
                    <th style={{ textAlign: "left", padding: 6 }}>État</th>
                  </tr>
                </thead>
                <tbody>
                  {echeancier.valeur.map((e) => (
                    <tr key={e.cle} style={{ borderTop: "1px solid #e3e7e8" }}>
                      <td style={{ padding: 6 }}>
                        {dateCourte(e.periode_debut)} au {dateCourte(e.periode_fin)}
                      </td>
                      <td style={{ padding: 6, textAlign: "right" }}>{montantFcfa(e.montant)}</td>
                      <td style={{ padding: 6 }}>{dateCourte(e.exigible_le)}</td>
                      <td style={{ padding: 6 }}>{LIBELLES_ETAT_ECHEANCE[e.etat]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
