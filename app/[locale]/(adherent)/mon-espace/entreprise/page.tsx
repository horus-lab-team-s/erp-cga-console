import type { Metadata } from "next";

import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import { SignalerUnChangement } from "@/app/components/adherent/SignalerUnChangement";
import { detient } from "@/app/lib/acces";
import { lireMonEntreprise, type MonEntreprise } from "@/app/lib/espace-adherent";
import { dateCourte } from "@/app/lib/formats";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Mon entreprise — CGA Broad Range Consulting Group",
};

const ROLES: Record<string, string> = {
  CHARGE_CLIENTELE: "Votre chargé(e) de clientèle",
  COMPTABLE: "Votre comptable",
};

/**
 * Mon entreprise (pas 114, maquette « Espace adhérent CGA », vue E).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LIRE, APPELER, SIGNALER ; JAMAIS MODIFIER
 *
 * La fiche vient rédigée par le backend (forme en toutes lettres, centre, régime expliqué et depuis
 * quand). L'interlocuteur est celui du dossier : « Appeler » n'apparaît que s'il a un numéro, et
 * « le cabinet » remplace un nom quand personne n'est désigné. « Signaler un changement » n'écrit
 * rien au dossier : le cabinet instruit (note 2 de la vue E), et les signalements récents restent
 * visibles pour que l'adhérent sache qu'ils sont arrivés.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PageMonEntreprise() {
  const acces = await exigerAcces();
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
  const fiche = await lireMonEntreprise(principal).catch(() => null);
  return (
    <main className="adherent">
      <header className="adherent__entete">
        <h1 className="adherent__nom">Mon entreprise</h1>
        <Link href="/mon-espace" className="adherent__quitter">
          Accueil
        </Link>
      </header>
      {fiche === null ? (
        <section className="adherent__section">
          <h2 className="adherent__titre">Impossible d&rsquo;afficher la fiche de votre entreprise</h2>
          <p className="adherent__suite">
            <Link href="/mon-espace/entreprise">Réessayer</Link>
          </p>
        </section>
      ) : (
        <Fiche fiche={fiche} peutSignaler={detient(acces, "SIGNALER_UN_CHANGEMENT")} />
      )}
      <OngletsAdherent actif="entreprise" />
    </main>
  );
}

function Fiche({ fiche, peutSignaler }: { fiche: MonEntreprise; peutSignaler: boolean }) {
  const i = fiche.interlocuteur;
  return (
    <>
      <section className="adherent__section">
        <h2 className="adherent__titre">{fiche.denomination}</h2>
        <dl className="adherent__faits">
          <dt className="adherent__fait-libelle">Forme</dt>
          <dd className="adherent__fait-valeur">{fiche.forme}</dd>
          {fiche.activite && (
            <>
              <dt className="adherent__fait-libelle">Activité</dt>
              <dd className="adherent__fait-valeur">{fiche.activite}</dd>
            </>
          )}
          <dt className="adherent__fait-libelle">NIU</dt>
          <dd className="adherent__fait-valeur">{fiche.niu}</dd>
          <dt className="adherent__fait-libelle">RCCM</dt>
          <dd className="adherent__fait-valeur">{fiche.rccm ?? "non renseigné"}</dd>
          <dt className="adherent__fait-libelle">Adresse</dt>
          <dd className="adherent__fait-valeur">{fiche.siege ?? "non renseignée"}</dd>
          <dt className="adherent__fait-libelle">Impôts</dt>
          <dd className="adherent__fait-valeur">{fiche.centre}</dd>
          {fiche.dirigeants.map((d) => (
            <FaitDirigeant key={d.nom} nom={d.nom} qualite={d.qualite} />
          ))}
          {fiche.adhesion_numero && fiche.adherente_depuis && (
            <>
              <dt className="adherent__fait-libelle">Adhésion au CGA</dt>
              <dd className="adherent__fait-valeur">
                n° {fiche.adhesion_numero}, depuis le {dateCourte(fiche.adherente_depuis)}
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="adherent__section">
        <h2 className="adherent__titre">Votre régime fiscal</h2>
        <p className="adherent__texte">
          <strong>{fiche.regime.titre}</strong>, depuis le {dateCourte(fiche.regime.depuis)}
        </p>
        {fiche.regime.explication && <p className="adherent__texte">{fiche.regime.explication}</p>}
        {!fiche.explications_validees && fiche.regime.explication && (
          <p className="adherent__mention">Explication en cours de validation par le cabinet.</p>
        )}
      </section>

      <section className="adherent__section">
        <h2 className="adherent__titre">{i ? (ROLES[i.role] ?? "Votre interlocuteur") : "Votre interlocuteur"}</h2>
        {i ? (
          <>
            <p className="adherent__texte">
              <strong>{i.nom}</strong>
              {i.telephone ? ` · ${i.telephone}` : ""}
            </p>
            <p className="adherent__actions">
              {i.telephone && (
                <a className="adherent__bandeau-action" href={`tel:${i.telephone.replace(/\s/g, "")}`}>
                  Appeler
                </a>
              )}
              <a className="adherent__quitter" href={`mailto:${i.courriel}`}>
                Écrire
              </a>
            </p>
          </>
        ) : (
          <p className="adherent__vide">Le cabinet n&rsquo;a pas encore désigné votre interlocuteur : écrivez au cabinet.</p>
        )}
      </section>

      {peutSignaler && (
        <section className="adherent__section">
          <h2 className="adherent__titre">Signaler un changement</h2>
          <p className="adherent__texte">
            Adresse, gérant, activité, numéro de téléphone : le cabinet fait les démarches. Vous ne modifiez rien
            vous-même.
          </p>
          <SignalerUnChangement dossier={fiche.niu} natures={fiche.natures} />
          {fiche.signalements.length > 0 && (
            <ul className="adherent__liste" aria-label="Vos derniers signalements">
              {fiche.signalements.map((s) => (
                <li key={s.le}>
                  <strong>
                    {s.libelle} · reçu par le cabinet le {dateCourte(s.le)}
                  </strong>
                  <span>« {s.message} »</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function FaitDirigeant({ nom, qualite }: { nom: string; qualite: string }) {
  return (
    <>
      <dt className="adherent__fait-libelle">{qualite}</dt>
      <dd className="adherent__fait-valeur">{nom}</dd>
    </>
  );
}
