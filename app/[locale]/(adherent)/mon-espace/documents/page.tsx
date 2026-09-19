import type { Metadata } from "next";

import { ImprimerLeRecu } from "@/app/components/adherent/ImprimerLeRecu";
import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import { lireMesDocuments, type DocumentDeDepot } from "@/app/lib/espace-adherent";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Mes documents — CGA Broad Range Consulting Group",
};

/**
 * Mes documents (pas 114, maquette « Espace adhérent CGA », vue E).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ DES REÇUS DE DÉPÔT, PAS DES ATTESTATIONS
 *
 * La maquette montre des attestations « dont une banque peut vérifier l'authenticité ». La
 * plateforme n'en émet aucune : il faudrait un modèle, une signature et un moyen de vérification
 * arrêtés par le cabinet (question Q29). La page montre ce qui existe et qui est vrai, les accusés
 * de dépôt consignés au dossier, et chaque reçu dit ce qu'il est : le relevé d'un accusé, pas
 * l'accusé délivré par l'administration. Aucun document n'est présenté sans sa date (note 4).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MesDocuments({ searchParams }: { searchParams: Promise<{ document?: string }> }) {
  const acces = await exigerAcces();
  const { document } = await searchParams;
  // Pas 116 : l'entreprise choisie, et non la première (voir `entreprise-choisie.ts`).
  const { principal } = await monEntrepriseChoisie(acces);
  if (!principal) {
    return (
      <main className="adherent">
        <p className="adherent__vide">
          Aucun dossier ne vous est rattaché. <Link href="/mon-espace">Retour à l&rsquo;accueil</Link>
        </p>
      </main>
    );
  }
  const vue = await lireMesDocuments(principal).catch(() => null);
  const choisi = vue?.documents.find((d) => d.numero === document);
  return (
    <main className="adherent">
      <header className="adherent__entete sans-impression">
        <h1 className="adherent__nom">{choisi ? "Reçu de dépôt" : "Mes documents"}</h1>
        <Link href={choisi ? "/mon-espace/documents" : "/mon-espace"} className="adherent__quitter">
          {choisi ? "Tous mes documents" : "Accueil"}
        </Link>
      </header>
      {vue === null ? (
        <section className="adherent__section">
          <h2 className="adherent__titre">Impossible d&rsquo;afficher vos documents</h2>
          <p className="adherent__suite">
            <Link href="/mon-espace/documents">Réessayer</Link>
          </p>
        </section>
      ) : choisi ? (
        <Recu denomination={vue.denomination} niu={vue.dossier} document={choisi} />
      ) : (
        <section className="adherent__section">
          {vue.documents.length === 0 ? (
            <p className="adherent__vide">
              Aucun dépôt n&rsquo;est encore consigné à votre dossier. Chaque déclaration déposée par le cabinet
              apparaîtra ici, avec son numéro d&rsquo;accusé.
            </p>
          ) : (
            <ul className="adherent__echeances">
              {vue.documents.map((d) => (
                <li key={d.numero}>
                  <Link href={`/mon-espace/documents?document=${encodeURIComponent(d.numero)}`}>
                    <strong>Reçu de dépôt · {d.titre}</strong>
                    <span>{d.periode}</span>
                    <span>
                      déposé le {dateCourte(d.depose_le)}
                      {d.montant_constate ? ` · ${montantFcfa(Number(d.montant_constate))}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="adherent__mention">
            Les attestations (adhésion, non-redevance) ne sont pas encore délivrées par l&rsquo;application :
            demandez-les à votre interlocuteur.
          </p>
        </section>
      )}
      <OngletsAdherent actif="documents" />
    </main>
  );
}

function Recu({ denomination, niu, document: d }: { denomination: string; niu: string; document: DocumentDeDepot }) {
  return (
    <section className="adherent__section adherent__recu">
      <h2 className="adherent__titre">Reçu de dépôt · {d.titre}</h2>
      <dl className="adherent__faits">
        <dt className="adherent__fait-libelle">Entreprise</dt>
        <dd className="adherent__fait-valeur">
          {denomination} · NIU {niu}
        </dd>
        <dt className="adherent__fait-libelle">Déclaration</dt>
        <dd className="adherent__fait-valeur">
          {d.titre}, {d.periode}
        </dd>
        <dt className="adherent__fait-libelle">Guichet</dt>
        <dd className="adherent__fait-valeur">{d.guichet}</dd>
        <dt className="adherent__fait-libelle">N° d&rsquo;accusé</dt>
        <dd className="adherent__fait-valeur">{d.numero}</dd>
        <dt className="adherent__fait-libelle">Déposée le</dt>
        <dd className="adherent__fait-valeur">{dateCourte(d.depose_le)}</dd>
        {d.montant_constate && (
          <>
            <dt className="adherent__fait-libelle">Montant</dt>
            <dd className="adherent__fait-valeur">{montantFcfa(Number(d.montant_constate))}</dd>
          </>
        )}
      </dl>
      <p className="adherent__mention">
        Relevé de l&rsquo;accusé consigné par le cabinet à votre dossier. Il ne remplace pas l&rsquo;accusé délivré
        par l&rsquo;administration
        {d.verifiable ? ", dont le justificatif est archivé au dossier." : " ; aucun justificatif n'est encore archivé avec cet accusé."}
      </p>
      <p className="adherent__actions">
        <ImprimerLeRecu />
      </p>
    </section>
  );
}
