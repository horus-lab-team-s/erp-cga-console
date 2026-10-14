import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { DepotSurMaCreation } from "@/app/components/creation/DepotSurMaCreation";
import { DocumentDeLaPiece } from "@/app/components/creation/DocumentDeLaPiece";
import { FriseDeCreation } from "@/app/components/creation/FriseDeCreation";
import { detient, initiales } from "@/app/lib/acces";
import { lireMonDocument } from "@/app/lib/actions-ma-creation";
import { deconnexion } from "@/app/lib/actions-session";
import { ETAPES_DE_CREATION, positionDansLaCreation } from "@/app/lib/etapes-de-creation";
import { dateCourte } from "@/app/lib/formats";
import { lireMesCreations, type SuiviDeMaCreation } from "@/app/lib/ma-creation";
import { exigerAcces } from "@/app/lib/session";
import { Link, redirect } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Ma création · CGA Broad Range Consulting Group",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * L'espace de la cliente qui a payé la création de sa société.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ, LE 14 OCTOBRE 2026
 *
 * Un compte client ouvert au paiement, et une page de suivi « plus soft et plus
 * indicative ». Elle arrive ici après avoir choisi son mot de passe, et chaque
 * fois qu'elle se connecte tant que sa société n'existe pas.
 *
 * ⚠️ CE QU'ELLE LIT ICI EST CE QU'ELLE LIT PAR SON LIEN : la même réponse du
 * serveur, les mêmes étapes (`etapes-de-creation.ts`, en double dans la
 * vitrine). Le compte ne lui donne pas plus, il lui évite de chercher un
 * courriel.
 *
 * ⚠️ TROIS QUESTIONS, DANS CET ORDRE : où en est mon dossier, qu'attend-on de
 * moi, qu'ai-je déjà envoyé. La frise répond à la première sans un mot ; le
 * reste de la page ne parle que de ce qu'elle peut faire.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MaCreation() {
  const acces = await exigerAcces();
  if (!detient(acces, "SUIVRE_MA_CREATION")) {
    // Une adhérente sans création, ou un collaborateur égaré : chacun chez soi.
    redirect({ href: acces.interne ? "/tableau-de-bord" : "/mon-espace", locale: await getLocale() });
  }
  const creations = await lireMesCreations();

  return (
    <main className="adherent">
      <header className="adherent__entete">
        <div className="adherent__identite">
          <span className="adherent__jeton" aria-hidden="true">
            {initiales(acces.nom_complet)}
          </span>
          <span>
            <strong className="adherent__nom">{acces.nom_complet}</strong>
            <span className="adherent__role">Ma création</span>
          </span>
        </div>
        <span className="adherent__actions">
          {/* Devenue adhérente, elle garde sa création et gagne son espace : les deux se rejoignent. */}
          {detient(acces, "LIRE_DOSSIER") && (
            <Link href="/mon-espace" className="adherent__quitter">
              Mon espace adhérent
            </Link>
          )}
          <form action={deconnexion}>
            <button type="submit" className="adherent__quitter">
              Se déconnecter
            </button>
          </form>
        </span>
      </header>

      {creations.length === 0 ? (
        <p className="adherent__vide">
          Votre dossier de création n&rsquo;est pas encore ouvert. Il s&rsquo;ouvre dès que votre règlement
          est constaté ; le cabinet vous écrit à ce moment-là.
        </p>
      ) : (
        creations.map((creation) => <UneCreation key={creation.reference} creation={creation} />)
      )}
    </main>
  );
}

function UneCreation({ creation }: { creation: SuiviDeMaCreation }) {
  const position = positionDansLaCreation(creation.etape, creation.identifiants.immatriculee);
  const etape = ETAPES_DE_CREATION[position.courante];
  const attendues = creation.pieces.filter((p) => p.obligatoire);
  const recues = attendues.filter((p) => p.fournie).length;
  const manquantes = creation.pieces.filter((p) => !p.fournie);
  const fournies = creation.pieces.filter((p) => p.fournie);

  return (
    <section className="creation" aria-labelledby={`creation-${creation.reference}`}>
      <p className="creation__surtitre">Votre société en création · {creation.forme_juridique}</p>
      <h1 id={`creation-${creation.reference}`} className="creation__titre">
        {creation.denomination_souhaitee}
      </h1>

      {position.abandonnee ? (
        <p className="creation__encart">
          <strong>Ce dossier est clos.</strong> Contactez le cabinet si vous pensez qu&rsquo;il s&rsquo;agit
          d&rsquo;une erreur.
        </p>
      ) : (
        <>
          <FriseDeCreation position={position} />

          <div className="creation__encart">
            {position.terminee ? (
              <p>
                <strong>Votre société est créée.</strong> Toutes les étapes sont franchies.
              </p>
            ) : (
              <>
                <p className="creation__maintenant">
                  <span className="creation__etiquette">En ce moment</span>
                  {etape.cabinet}
                </p>
                <p className="creation__vous">
                  <span className="creation__etiquette">De votre côté</span>
                  {etape.vous ?? "Rien à faire pour l’instant. Le cabinet vous écrit à chaque étape franchie."}
                </p>
              </>
            )}
          </div>
        </>
      )}

      {creation.identifiants.immatriculee && (
        <div className="creation__bloc">
          <h2 className="creation__intertitre">Vos numéros</h2>
          <dl className="creation__numeros">
            {(
              [
                ["RCCM", creation.identifiants.rccm, creation.identifiants.rccm_obtenu_le],
                ["Numéro de contribuable", creation.identifiants.niu, creation.identifiants.niu_obtenu_le],
                ["Patente", creation.identifiants.patente, creation.identifiants.patente_obtenue_le],
                ["Numéro CNPS", creation.identifiants.cnps, creation.identifiants.cnps_obtenu_le],
              ] as const
            )
              .filter(([, numero]) => numero)
              .map(([libelle, numero, obtenu]) => (
                <div key={libelle}>
                  <dt>{libelle}</dt>
                  <dd className="tabulaire">
                    {numero}
                    {obtenu ? ` · obtenu le ${dateCourte(obtenu)}` : ""}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      {attendues.length > 0 && (
        <div className="creation__bloc">
          <h2 className="creation__intertitre">Vos documents</h2>
          {/* ⚠️ Le compte ne retient que les pièces obligatoires : une pièce d'usage
              absente n'empêche pas le dépôt, et la compter ferait courir après un
              document dont personne n'a besoin. */}
          <p className="creation__progression">
            <strong>
              {recues} sur {attendues.length}
            </strong>{" "}
            documents nécessaires reçus
          </p>
          <progress className="creation__jauge" max={attendues.length} value={recues}>
            {recues} sur {attendues.length}
          </progress>

          {!creation.clos && manquantes.length > 0 && (
            <ul className="creation__pieces">
              {manquantes.map((piece) => (
                <li key={piece.code} className="creation__piece">
                  <span>
                    {piece.libelle}
                    {!piece.obligatoire && <span className="creation__facultatif"> · facultatif</span>}
                  </span>
                  <DepotSurMaCreation reference={creation.reference} code={piece.code} libelle={piece.libelle} />
                </li>
              ))}
            </ul>
          )}

          {fournies.length > 0 && (
            <details className="creation__recus">
              <summary>Déjà reçus ({fournies.length})</summary>
              <ul className="creation__pieces">
                {fournies.map((piece) => (
                  <li key={piece.code} className="creation__piece" data-recue="oui">
                    <span>{piece.libelle}</span>
                    <span className="creation__recu">
                      reçu{piece.fournie_le ? ` le ${dateCourte(piece.fournie_le)}` : ""}
                    </span>
                    {/* Ce qu'elle a envoyé, ou ce que le cabinet a versé pour elle : c'est son dossier. */}
                    {piece.document && (
                      <DocumentDeLaPiece champs={{ reference: creation.reference, code: piece.code }}
                        libelle={piece.libelle}
                        lire={lireMonDocument}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="creation__note">
        Dossier ouvert le {dateCourte(creation.ouvert_le)}. Le cabinet vous écrit à chaque étape franchie ; vous
        n&rsquo;avez pas besoin de revenir vérifier.
      </p>
    </section>
  );
}
