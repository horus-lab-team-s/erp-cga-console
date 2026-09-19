import type { Metadata } from "next";

import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import {
  compteDuStatut,
  deMois,
  LIBELLES_STATUT_ADHERENT,
  lireMesJustificatifs,
  nomDuMois,
  type LigneDeJustificatif,
  type StatutPourLAdherent,
} from "@/app/lib/espace-adherent";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Mes justificatifs — CGA Broad Range Consulting Group",
};

const STATUTS: StatutPourLAdherent[] = ["A_CORRIGER", "RECU", "ENREGISTRE", "CLASSE"];

/**
 * Mes justificatifs (pas 112, maquette « Espace adhérent CGA », vue C, et vue F pour l'état vide).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN MOIS À LA FOIS, ET CE QUI DEMANDE UN GESTE D'ABORD
 *
 * Le mois, le statut et la recherche sont des paramètres d'adresse (formulaire GET, sans
 * JavaScript) : un téléphone d'entrée de gamme filtre aussi bien qu'un ordinateur, et le lien se
 * partage. Le backend rend la liste triée (à corriger d'abord) et les comptes du mois **avant
 * filtre** : « 7 justificatifs envoyés · 2 à corriger » ne change pas quand on filtre.
 *
 * ⚠️ L'état vide est prescriptif (vue F, note 2) : il dit quoi faire et pourquoi maintenant, et
 * propose le mois précédent qui porte des pièces.
 *
 * ⚠️ Une pièce classée reste dans la liste (« Gardé au dossier ») : l'adhérent n'a pas de
 * corbeille où perdre une facture (vue C, note 4).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MesJustificatifs({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; statut?: string; recherche?: string }>;
}) {
  const acces = await exigerAcces();
  const brut = await searchParams;
  // Pas 116 : l'entreprise choisie, et non la première (voir `entreprise-choisie.ts`).
  const { principal } = await monEntrepriseChoisie(acces);
  if (!principal) {
    return (
      <main className="adherent">
        <p className="adherent__vide">
          Aucun dossier ne vous est rattaché : vos justificatifs apparaîtront ici dès son ouverture.{" "}
          <Link href="/mon-espace">Retour à l&rsquo;accueil</Link>
        </p>
      </main>
    );
  }
  const mois = brut.mois && /^\d{4}-(0[1-9]|1[0-2])$/.test(brut.mois) ? brut.mois : undefined;
  const statut = STATUTS.includes(brut.statut as StatutPourLAdherent) ? (brut.statut as StatutPourLAdherent) : undefined;
  const recherche = brut.recherche?.trim().slice(0, 80) || undefined;
  const vue = await lireMesJustificatifs(principal, { mois, statut, recherche }).catch(() => null);

  return (
    <main className="adherent">
      <header className="adherent__entete">
        <h1 className="adherent__nom">Mes justificatifs</h1>
        <Link href="/mon-espace" className="adherent__quitter">
          Accueil
        </Link>
      </header>

      {vue === null ? (
        <section className="adherent__section">
          <h2 className="adherent__titre">Impossible d&rsquo;afficher vos justificatifs</h2>
          <p className="adherent__vide">
            La lecture n&rsquo;a pas abouti. Vos envois ne sont pas perdus : le cabinet les a reçus.
          </p>
          <p className="adherent__suite">
            <Link href="/mon-espace/justificatifs">Réessayer</Link>
          </p>
        </section>
      ) : (
        <>
          <form className="adherent__filtres" method="get" role="search">
            <label>
              <span>Rechercher un fournisseur</span>
              <input type="search" name="recherche" defaultValue={recherche ?? ""} placeholder="Fournisseur, n° de facture" />
            </label>
            <label>
              <span>Mois</span>
              <select name="mois" defaultValue={vue.mois}>
                {[vue.mois, ...vue.mois_disponibles.filter((m) => m !== vue.mois)]
                  .sort()
                  .reverse()
                  .map((m) => (
                    <option key={m} value={m}>
                      {nomDuMois(m)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Statut</span>
              <select name="statut" defaultValue={statut ?? ""}>
                <option value="">Tous les statuts</option>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {LIBELLES_STATUT_ADHERENT[s]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="adherent__quitter">
              Afficher
            </button>
          </form>

          <section className="adherent__section" aria-labelledby="titre-du-mois">
            <h2 className="adherent__titre" id="titre-du-mois">
              {nomDuMois(vue.mois)}
            </h2>
            {vue.total_du_mois > 0 && (
              <p className="adherent__note" style={{ marginTop: 0 }}>
                {vue.total_du_mois} justificatif{vue.total_du_mois > 1 ? "s" : ""} envoyé{vue.total_du_mois > 1 ? "s" : ""}
                {STATUTS.filter((s) => vue.par_statut[s] > 0).map((s) => ` · ${compteDuStatut(s, vue.par_statut[s])}`)}
              </p>
            )}
            {vue.total_du_mois === 0 ? (
              <div className="adherent__vide-prescriptif">
                <strong>Aucun justificatif pour {nomDuMois(vue.mois)}</strong>
                <p className="adherent__vide">
                  Dès que vous recevez une facture, prenez-la en photo : c&rsquo;est le meilleur moment, et cela
                  évite de la chercher plus tard.
                </p>
                <p className="adherent__suite">
                  <Link href="/mon-espace#envoyer">Envoyer le premier</Link>
                  {vue.mois_precedent_avec_pieces && (
                    <>
                      {" · "}
                      <Link href={`/mon-espace/justificatifs?mois=${vue.mois_precedent_avec_pieces}`}>
                        Voir le mois {deMois(nomDuMois(vue.mois_precedent_avec_pieces))}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ) : vue.lignes.length === 0 ? (
              <p className="adherent__vide">
                Aucun justificatif de ce mois ne correspond à votre recherche.{" "}
                <Link href={`/mon-espace/justificatifs?mois=${vue.mois}`}>Tout afficher</Link>
              </p>
            ) : (
              <ul className="adherent__pieces">
                {vue.lignes.map((l) => (
                  <Justificatif key={l.identifiant} ligne={l} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <OngletsAdherent actif="justificatifs" />
    </main>
  );
}

function Justificatif({ ligne }: { ligne: LigneDeJustificatif }) {
  return (
    <li className="adherent__piece" data-statut={ligne.statut}>
      <span className="adherent__piece-tete">
        <strong>{ligne.fournisseur ?? ligne.nom_fichier ?? "Document envoyé"}</strong>
        <span className="adherent__piece-etat" data-statut={ligne.statut}>
          {LIBELLES_STATUT_ADHERENT[ligne.statut]}
        </span>
      </span>
      <span className="adherent__piece-detail">
        {ligne.reference ? `Facture ${ligne.reference}` : "Pas encore lu par le cabinet"}
        {ligne.date_document ? ` · ${dateCourte(ligne.date_document)}` : ""}
        {` · envoyé le ${dateCourte(ligne.envoye_le)}`}
      </span>
      {ligne.montant_ttc && (
        <span className="adherent__piece-montant tabulaire">{montantFcfa(Number(ligne.montant_ttc))}</span>
      )}
      {ligne.statut === "A_CORRIGER" && (
        <span className="adherent__consigne">
          {ligne.a_corriger}
          <br />
          Ce que vous devez faire : demandez à votre fournisseur une nouvelle facture corrigée, puis{" "}
          <Link href="/mon-espace#envoyer">envoyez-la ici</Link>.
        </span>
      )}
    </li>
  );
}
