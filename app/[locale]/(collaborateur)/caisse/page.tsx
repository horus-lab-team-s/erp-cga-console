import type { Metadata } from "next";

import { ConstatDeCaisse } from "@/app/components/caisse/ConstatDeCaisse";
import { ConstatDHonoraires } from "@/app/components/caisse/ConstatDHonoraires";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { Panneau } from "@/app/components/Tableau";
import { detient } from "@/app/lib/acces";
import { lireLaCaisse, type ReglementDeCaisse } from "@/app/lib/console-acquisition";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import { lireLaCaisseDesHonoraires } from "@/app/lib/honoraires";
import { LIBELLES_CANAL, LIBELLES_ETAT } from "@/app/lib/honoraires-etats";
import { exigerAcces } from "@/app/lib/session";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Caisse" };

/**
 * La caisse : ce qui est dû, et ce qui est réglé.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ÉCRAN DE CELLE QUI ENCAISSE, ET D'ELLE SEULE
 *
 * Le cabinet l'a décidé le 14 octobre 2026 : c'est la responsable de caisse qui
 * constate les versements. Elle voit ici qui doit combien et pour quelle
 * proposition. Elle ne voit ni la qualification, ni le chiffrage, ni les livres :
 * son rôle ne porte que la permission d'encaisser, et le serveur le tient.
 *
 * ⚠️ UNE LIGNE CHANGE D'ÉTAT SANS ELLE QUAND LE CLIENT PAIE EN LIGNE.
 *
 * Un règlement par mobile money est constaté par la notification de l'opérateur :
 * la ligne quitte « à encaisser » et rejoint « encaissés » toute seule. Elle n'a
 * rien à cocher pour ce client-là, et le voit réglé en rouvrant l'écran. C'est le
 * rapprochement que le cabinet a demandé automatique.
 *
 * ⚠️ D'ABORD LA FILE, ENSUITE LE JOURNAL. Ce qui est dû en haut, du plus ancien au
 * plus récent : c'est ce qu'elle a à faire. Ce qui est réglé en dessous : c'est
 * ce qu'elle a fait, et ce que les autres chemins ont fait pour elle.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function Caisse() {
  const acces = await exigerAcces();
  if (!detient(acces, "ENCAISSER")) {
    return <EcranReserve titre="Caisse" permission="ENCAISSER" acces={acces} />;
  }

  const [lignes, honoraires] = await Promise.all([
    lireLaCaisse(),
    // ⚠️ Une lecture de commodité : sans elle, la caisse des propositions reste entière.
    lireLaCaisseDesHonoraires().catch(() => null),
  ]);
  const honorairesDus = (honoraires ?? []).filter((l) => l.etat !== "REGLEE");
  const honorairesRegles = (honoraires ?? []).filter((l) => l.etat === "REGLEE");
  const dus = lignes.filter((l) => l.etat === "A_ENCAISSER");
  const regles = lignes.filter((l) => l.etat === "ENCAISSE");
  const totalDu = dus.reduce((somme, l) => somme + Number(l.montant), 0);
  const totalRegle = regles.reduce((somme, l) => somme + Number(l.montant), 0);

  return (
    <>
      <EnteteTravail miettes={[{ libelle: "Caisse" }]} />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Caisse</h1>
          <p>
            {dus.length} règlement{dus.length > 1 ? "s" : ""} à constater · {regles.length} encaissé
            {regles.length > 1 ? "s" : ""}
          </p>
        </div>

        <dl className="caisse__chiffres">
          <div>
            <dt>À encaisser</dt>
            <dd>{montantFcfa(String(totalDu))}</dd>
          </div>
          <div>
            <dt>Encaissé</dt>
            <dd>{montantFcfa(String(totalRegle))}</dd>
          </div>
        </dl>

        <Panneau
          titre="À encaisser"
          aide="Le client a accepté sa proposition. Constatez son versement : le dossier s'ouvre aussitôt, sans autre geste."
        >
          {dus.length === 0 ? (
            <p className="caisse__vide">Aucun règlement en attente : tout ce qui a été accepté est encaissé.</p>
          ) : (
            <ul className="caisse__file">
              {dus.map((ligne) => (
                <li key={ligne.proforma} className="caisse__ligne">
                  <Identite ligne={ligne} />
                  {ligne.ouvre_un_espace ? (
                    // ⚠️ Une vente de plateforme ouvre un espace, dont l'adresse se
                    // choisit : ce n'est pas le métier de la caisse. Le dire vaut
                    // mieux qu'un bouton qui échouerait.
                    <p className="caisse__renvoi">
                      Cette vente ouvre un espace, dont l&rsquo;adresse se choisit sur la fiche du dossier :{" "}
                      <Link href={`/acquisition/${ligne.dossier}`}>ouvrir la fiche</Link>.
                    </p>
                  ) : (
                    <ConstatDeCaisse numero={ligne.proforma} montant={montantFcfa(ligne.montant)} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        <Panneau
          titre="Encaissés"
          aide="Du plus récent au plus ancien, quel que soit le chemin : guichet, virement, ou mobile money notifié par l'opérateur."
        >
          {regles.length === 0 ? (
            <p className="caisse__vide">Rien n&rsquo;a encore été encaissé.</p>
          ) : (
            <ul className="caisse__file">
              {regles.map((ligne) => (
                <li key={ligne.proforma} className="caisse__ligne caisse__ligne--reglee">
                  <Identite ligne={ligne} />
                  <p className="caisse__regle">
                    <span className="caisse__pastille">Encaissé</span>
                    {ligne.payee_le ? ` le ${dateCourte(ligne.payee_le.slice(0, 10))}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        {/* ⚠️ 14 octobre 2026 : les honoraires des adhérents. Le retard en tête ; un
            règlement par mobile money arrive ici seul, déjà « Réglé ». */}
        <Panneau
          titre="Honoraires des adhérents"
          aide="Ce qui est exigible, le retard d'abord, puis ce qui a été réglé depuis un mois, au guichet ou par mobile money."
        >
          {honoraires === null ? (
            <p className="caisse__vide">La lecture des honoraires n&rsquo;a pas abouti.</p>
          ) : honorairesDus.length + honorairesRegles.length === 0 ? (
            <p className="caisse__vide">Aucun honoraire exigible.</p>
          ) : (
            <ul className="caisse__file">
              {honorairesDus.map((l) => (
                <li key={`${l.niu}-${l.periode}`} className="caisse__ligne">
                  <div className="caisse__identite">
                    <strong>{l.denomination}</strong>
                    <span>
                      Honoraires du {dateCourte(l.periode)} au {dateCourte(l.fin)} ·{" "}
                      <span className="caisse__etat" data-etat={l.etat}>
                        {LIBELLES_ETAT[l.etat]}
                      </span>
                    </span>
                    <b className="caisse__montant">{montantFcfa(l.montant)}</b>
                  </div>
                  <ConstatDHonoraires niu={l.niu} periode={l.periode} montant={montantFcfa(l.montant)} />
                </li>
              ))}
              {honorairesRegles.map((l) => (
                <li key={`${l.niu}-${l.periode}`} className="caisse__ligne caisse__ligne--reglee">
                  <div className="caisse__identite">
                    <strong>{l.denomination}</strong>
                    <span>
                      Honoraires du {dateCourte(l.periode)} au {dateCourte(l.fin)} · {l.reference_externe}
                    </span>
                    <b className="caisse__montant">{montantFcfa(l.montant)}</b>
                  </div>
                  <p className="caisse__regle">
                    <span className="caisse__pastille">Réglé</span>
                    {l.canal ? ` ${LIBELLES_CANAL[l.canal]}` : ""}
                    {l.constate_le ? ` le ${dateCourte(l.constate_le.slice(0, 10))}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panneau>
      </div>
    </>
  );
}

function Identite({ ligne }: { ligne: ReglementDeCaisse }) {
  return (
    <div className="caisse__identite">
      <strong>{ligne.client}</strong>
      <span>
        {ligne.proforma} · {ligne.telephone}
      </span>
      <b className="caisse__montant">{montantFcfa(ligne.montant)}</b>
    </div>
  );
}
