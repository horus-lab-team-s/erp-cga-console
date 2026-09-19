import type { Metadata } from "next";

import { EngagementDevis } from "@/app/components/vitrine/FormulaireSouscription";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { aujourdhui } from "@/app/lib/portefeuille";
import { lireDevis } from "@/app/lib/souscription";
import { Link } from "@/i18n/navigation";

// ⚠️ Jamais indexée : sa référence protège le devis, et elle ne doit pas finir dans un moteur.
export const metadata: Metadata = {
  title: "Votre devis — CGA Broad Range",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Le devis établi en ligne, et l'engagement (pas 83).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LE DEVIS AFFICHE LES MONTANTS FIGÉS
 *
 * Recopiés du barème du jour de l'établissement : un devis ouvert trois semaines plus
 * tard montre le prix promis, pas celui du jour.
 *
 * ⚠️ UN DEVIS ENGAGÉ, CADUC OU INCOMPLET NE PROPOSE PAS DE PAYER
 *
 * Le backend refuserait ; l'écran ne propose pas un geste refusé. Un devis engagé renvoie
 * au suivi de sa souscription. Un devis incomplet (une ligne sur étude) renvoie au cabinet.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PageDevis({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const lecture = await lireDevis(reference);

  return (
    <main className="conteneur" style={{ paddingBlock: 48, maxWidth: 760, marginInline: "auto", paddingInline: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Votre devis</h1>
      {"echec" in lecture ? (
        <p role="alert">
          {lecture.statut === 404
            ? "Ce devis est introuvable. Vérifiez le lien, ou établissez un nouveau devis."
            : `Le devis ne peut pas être lu pour le moment (${lecture.echec}).`}{" "}
          <Link href="/souscrire">Établir un devis</Link>
        </p>
      ) : (
        <Devis devis={lecture.valeur} />
      )}
    </main>
  );
}

function Devis({ devis }: { devis: import("@/app/lib/souscription").Devis }) {
  const caduc = devis.etat === "CADUC" || devis.valide_jusqu_au < aujourdhui();
  return (
    <>
      <p style={{ color: "#4f5b60", marginTop: 0 }}>
        Établi le {dateCourte(devis.etabli_le.slice(0, 10))} pour {devis.prospect.prenom} {devis.prospect.nom}
        {devis.prospect.denomination ? `, ${devis.prospect.denomination}` : ""} · valable jusqu&rsquo;au{" "}
        {dateCourte(devis.valide_jusqu_au)}
      </p>
      <ul style={{ paddingLeft: 18 }}>
        {devis.lignes.map((l) => (
          <li key={`${l.service}-${l.formule ?? ""}`}>
            {l.libelle}
            {l.formule ? ` (${l.formule.replaceAll("_", " ").toLowerCase()})` : ""} :{" "}
            {l.chiffree && l.montant ? montantFcfa(l.montant) : "sur étude"}
            {l.periodicite === "MENSUELLE" ? " par mois" : l.periodicite === "ANNUELLE" ? " par an" : ""}
            {l.precision ? ` · ${l.precision}` : ""}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 24, fontWeight: 700, margin: "16px 0" }}>À régler aujourd&rsquo;hui : {montantFcfa(devis.montant_a_regler)}</p>
      {Number(devis.abonnement_mensuel) > 0 && (
        <p style={{ marginTop: 0 }}>Puis {montantFcfa(devis.abonnement_mensuel)} par mois, prélevés à chaque échéance.</p>
      )}
      <div style={{ marginTop: 24 }}>
        {devis.etat === "ENGAGE" && devis.souscription ? (
          <p role="status">
            Vous vous êtes déjà engagé sur ce devis.{" "}
            <Link href={`/souscrire/suivi/${devis.souscription}`}>Suivre la souscription</Link>
          </p>
        ) : devis.etat === "ABANDONNE" ? (
          <p role="status">Ce devis a été abandonné. <Link href="/souscrire">Établir un nouveau devis</Link></p>
        ) : caduc ? (
          <p role="status">Ce devis n&rsquo;est plus valable. <Link href="/souscrire">Établir un nouveau devis</Link></p>
        ) : !devis.complet ? (
          <p role="status">
            Une partie de ce devis se chiffre sur étude : il ne se règle pas en ligne. Le cabinet vous contactera.
          </p>
        ) : (
          <EngagementDevis reference={devis.reference} montant={montantFcfa(devis.montant_a_regler)} />
        )}
      </div>
    </>
  );
}
