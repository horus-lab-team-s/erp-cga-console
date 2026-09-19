import type { Metadata } from "next";

import { Panneau } from "@/app/components/Tableau";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { ConfirmationEnrolement } from "@/app/components/securite/ConfirmationEnrolement";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Associer une application d’authentification — Plateforme CGA" };

/**
 * Là où mène le lien d'enrôlement reçu par courriel (pas 62).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA PAGE N'UTILISE PAS LE JETON EN S'AFFICHANT
 *
 * Elle le place dans un formulaire, présenté au clic. Une messagerie qui ouvre le
 * lien pour l'analyser ne consomme donc rien.
 *
 * ⚠️ UNE SESSION EST EXIGÉE, ET C'EST LA MÊME QUE CELLE DE LA DEMANDE
 *
 * Le backend refuse le lien présenté par un autre compte. Sans session, la page
 * renvoie à la connexion ; le lien reste valable trente minutes, et le courriel
 * dit de l'ouvrir dans le navigateur où la demande a été faite.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function ConfirmationDuSecondFacteur({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const acces = await exigerAcces();
  const { jeton = "" } = await searchParams;
  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Second facteur" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Associer une application d&rsquo;authentification</h1>
          <p>{acces.nom_complet}</p>
        </div>
        <Panneau
          titre="Votre clé"
          aide="Elle sera demandée pour les actes sensibles, comme le dépôt d'une déclaration."
        >
          <ConfirmationEnrolement jeton={jeton} />
        </Panneau>
      </div>
    </>
  );
}
