import type { Metadata } from "next";

import { MaPieceDsf } from "@/app/components/adherent/MaPieceDsf";
import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import { detient } from "@/app/lib/acces";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { dateCourte } from "@/app/lib/formats";
import { lireMaDsf } from "@/app/lib/ma-dsf";
import { EXPLICATIONS_DE_MA_DSF, LIBELLES_DE_MA_DSF, type MaDsfDeLExercice } from "@/app/lib/ma-dsf-etats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Ma DSF · CGA Broad Range Consulting Group",
};

/**
 * Ma DSF (18 octobre 2026, point 24) : la déclaration annuelle, vue de l'adhérent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE CABINET A DEMANDÉ : « le module DSF en libre-service pour l'utilisateur en ligne,
 * ou à la demande avec un espace de dépôt comme la création ». Les deux se rejoignent ici :
 * l'adhérent renseigne sa fiche (page Entreprise), verse les pièces que le guide de la DGI
 * demande, suit l'état de sa déclaration, et télécharge la copie déposée.
 *
 * ⚠️ PAS DE CHIFFRES AVANT LE DÉPÔT : une liasse en cours de relecture lue comme définitive
 * conduit à des décisions de trésorerie fondées sur un brouillon (voir la matrice des rôles).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function PageMaDsf() {
  const acces = await exigerAcces();
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
  const vue = await lireMaDsf(principal).catch(() => null);
  const peutVerser = detient(acces, "DEPOSER_PIECE");
  return (
    <main className="adherent">
      <header className="adherent__entete">
        <h1 className="adherent__nom">Ma déclaration annuelle (DSF)</h1>
        <Link href="/mon-espace" className="adherent__quitter">
          Accueil
        </Link>
      </header>
      <section className="adherent__section">
        <p className="adherent__texte">
          Chaque année, après la clôture de l&rsquo;exercice, le cabinet établit votre déclaration statistique et fiscale
          et la dépose sur le portail de la DGI. Il lui faut quelques pièces que vous seul détenez ; elles se versent
          ici, et la fiche de votre entreprise se tient à jour depuis{" "}
          <Link href="/mon-espace/entreprise#fiche-dsf">la page Entreprise</Link>.
        </p>
      </section>
      {vue === null ? (
        <section className="adherent__section">
          <h2 className="adherent__titre">Impossible d&rsquo;afficher votre DSF</h2>
          <p className="adherent__suite">
            <Link href="/mon-espace/dsf">Réessayer</Link>
          </p>
        </section>
      ) : vue.exercices.length === 0 ? (
        <p className="adherent__vide">
          Aucun exercice n&rsquo;est encore clos : votre première DSF apparaîtra ici après la clôture.
        </p>
      ) : (
        vue.exercices.map((e, rang) => (
          <Exercice key={e.exercice} dossier={principal} exercice={e} peutVerser={peutVerser} ouvert={rang === 0} />
        ))
      )}
      <OngletsAdherent />
    </main>
  );
}

/**
 * Un exercice. Revue du 18 octobre 2026 : trois exercices de treize pièces, chacune avec son
 * formulaire ouvert, faisaient une page interminable sur téléphone. Le plus récent est déplié ;
 * les autres se déplient au toucher. Les pièces à fournir et reçues sont listées ; celles que le
 * cabinet établit ou a déclarées sans objet tiennent en une ligne.
 */
function Exercice({
  dossier,
  exercice: e,
  peutVerser,
  ouvert,
}: {
  dossier: string;
  exercice: MaDsfDeLExercice;
  peutVerser: boolean;
  ouvert: boolean;
}) {
  const pieces = peutVerser ? e.pieces : e.pieces.map((p) => ({ ...p, versable: false }));
  const attendues = pieces.filter((p) => p.etat === "A_FOURNIR" || p.etat === "JOINTE");
  const parLeCabinet = pieces.filter((p) => p.etat === "PRODUITE" || p.etat === "NEANT");
  return (
    <details className="adherent__section adherent__exercice-dsf" open={ouvert || undefined} aria-label={`DSF ${e.exercice}`}>
      <summary className="adherent__titre">
        Exercice {e.exercice}{" "}
        <small>
          · {LIBELLES_DE_MA_DSF[e.etat].toLowerCase()}
          {e.etat !== "DEPOSEE" && e.a_fournir > 0 ? ` · ${e.a_fournir} à fournir` : ""}
        </small>
      </summary>
      <p className="adherent__texte">
        <small>Exercice clos le {dateCourte(e.cloture)}.</small>
      </p>
      <p className="adherent__texte">
        {EXPLICATIONS_DE_MA_DSF[e.etat]}
      </p>
      {e.etat === "DEPOSEE" && (
        <p className="adherent__texte">
          {e.numero_accuse && <>Accusé de la DGI n° {e.numero_accuse}</>}
          {e.deposee_le && <> · déposée le {dateCourte(e.deposee_le)}</>}
          {e.document && (
            <>
              {" · "}
              <a
                href={`/api/ma-dsf/${encodeURIComponent(dossier)}/${encodeURIComponent(e.exercice)}`}
                target="_blank"
                rel="noopener"
              >
                Télécharger la copie déposée
              </a>
            </>
          )}
        </p>
      )}
      {e.etat !== "DEPOSEE" && (
        <p className="adherent__texte">
          {e.a_fournir === 0
            ? "Le cabinet a toutes les pièces qu'il lui faut."
            : `${e.a_fournir} pièce${e.a_fournir > 1 ? "s" : ""} à fournir. Une pièce ne concerne pas votre entreprise (des prix de transfert, des droits d'accises) ? Ne cherchez pas à la produire : dites-le au cabinet, qui la marque sans objet.`}
        </p>
      )}
      {attendues.length > 0 && (
        <ul className="adherent__pieces">
          {attendues.map((p) => (
            <MaPieceDsf key={p.numero} dossier={dossier} exercice={e.exercice} piece={p} />
          ))}
        </ul>
      )}
      {parLeCabinet.length > 0 && (
        <p className="adherent__mention">
          Établies par le cabinet ou sans objet : {parLeCabinet.map((p) => p.libelle).join(" · ")}.
        </p>
      )}
    </details>
  );
}
