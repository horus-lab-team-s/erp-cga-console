import type { Metadata } from "next";

import { OngletsAdherent } from "@/app/components/adherent/OngletsAdherent";
import { GroupeDeRisque } from "@/app/components/social/GroupeDeRisque";
import { monEntrepriseChoisie } from "@/app/lib/entreprise-choisie";
import { dateCourte, montantFcfa } from "@/app/lib/formats";
import {
  LIBELLES_MOIS,
  lireDeclaration,
  lireGroupeDeRisque,
  lirePersonnel,
  moisDePaieParDefaut,
  type Bulletin,
  type Declaration,
  type LigneSalarie,
} from "@/app/lib/social";
import { aujourdhui } from "@/app/lib/portefeuille";
import { exigerAcces } from "@/app/lib/session";
import { detient } from "@/app/lib/acces";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Ma paie · CGA Broad Range Consulting Group",
};

/**
 * Ma paie, tenue par l'adhérent lui-même.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE LIBRE SERVICE, ET CE QU'IL N'OUVRE PAS
 *
 * L'entreprise qui tient sa paie elle-même voit ici son personnel, ses bulletins
 * et ce qu'elle doit verser. Elle y accède par la permission `TENIR_SA_PAIE`,
 * qui n'ouvre **que** la paie : ni la balance, ni le grand livre, ni le journal.
 *
 * ⚠️ Et seulement SON dossier. Le serveur cadre chaque lecture sur le périmètre
 * de la session, et une paie demandée sur un autre NIU n'existe pas pour elle.
 * L'écran n'a donc aucun filtre à poser : il ne pourrait pas en poser un plus
 * sûr que celui-là.
 *
 * ⚠️ LE MOIS PAR DÉFAUT EST LE MOIS CLOS, PAS LE MOIS COURANT
 *
 * Une déclaration du mois en cours est incomplète par construction, et l'afficher
 * par défaut ferait croire à un effectif qui a fondu. Voir `moisDePaieParDefaut`.
 *
 * ⚠️ L'ÉCRAN NE CALCULE RIEN
 *
 * Brut taxable, retenues, charges patronales, net à payer et coût employeur
 * arrivent calculés. Une règle recopiée ici paierait un jour deux fois le
 * logement, parce que les avantages en nature sortent du net.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default async function MaPaie({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; annee?: string; salarie?: string }>;
}) {
  const acces = await exigerAcces();

  // ⚠️ Garde avant tout appel : sans elle, l'API rend 403 et le visiteur voit un
  // écran d'erreur au lieu d'une phrase qui lui dit quoi faire.
  if (!detient(acces, "TENIR_SA_PAIE")) {
    return (
      <main className="adherent">
        <OngletsAdherent actif="paie" />
        <p className="adherent__vide">
          La tenue de votre paie n&rsquo;est pas ouverte sur votre espace. Si vous l&rsquo;avez
          souscrite, le cabinet l&rsquo;active depuis l&rsquo;écran des habilitations.{" "}
          <Link href="/mon-espace">Retour à l&rsquo;accueil</Link>
        </p>
      </main>
    );
  }

  const { principal } = await monEntrepriseChoisie(acces);
  if (!principal) {
    return (
      <main className="adherent">
        <OngletsAdherent actif="paie" />
        <p className="adherent__vide">
          Aucun dossier ne vous est rattaché : votre paie apparaîtra ici dès son ouverture.{" "}
          <Link href="/mon-espace">Retour à l&rsquo;accueil</Link>
        </p>
      </main>
    );
  }

  const demande = await searchParams;
  const defaut = moisDePaieParDefaut();
  const annee = Number(demande.annee) || defaut.annee;
  const mois = Number(demande.mois) || defaut.mois;
  const jour = aujourdhui();

  // ⚠️ Les deux lectures sont tolérantes et séparées. Une entreprise qui vient
  // d'ouvrir sa paie a un personnel et aucune déclaration : faire tomber l'écran
  // entier sur ce cas lui dirait que son espace est en panne.
  const [personnel, declaration, groupeDuDossier] = await Promise.all([
    lirePersonnel(principal, jour).catch(() => null),
    lireDeclaration(principal, annee, mois, jour).catch(() => null),
    lireGroupeDeRisque(principal).catch(() => null),
  ]);

  const periode = `${LIBELLES_MOIS[mois - 1]} ${annee}`;
  const bulletin = declaration?.bulletins.find((b) => b.salarie === demande.salarie);

  return (
    <main className="adherent">
      <OngletsAdherent actif="paie" />
      <header className="adherent__entete">
        <h1 className="adherent__nom">{bulletin ? `Bulletin · ${periode}` : `Ma paie · ${periode}`}</h1>
        <Link
          href={bulletin ? "/mon-espace/paie" : "/mon-espace"}
          className="adherent__quitter"
        >
          {bulletin ? "Toute ma paie" : "Accueil"}
        </Link>
      </header>

      {declaration?.repose_sur_des_valeurs_non_validees && (
        <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
          <strong>Les taux employés n&rsquo;ont pas encore été validés sur le texte.</strong> Vos
          bulletins sont calculés avec des valeurs que le cabinet doit confirmer : ils ne sont pas
          opposables en l&rsquo;état.
        </div>
      )}

      {/* 16 octobre 2026 : c'est l'employeur qui reçoit la notification de la CNPS. */}
      {groupeDuDossier && (!bulletin || groupeDuDossier.groupe === null) && (
        <GroupeDeRisque dossier={principal} etat={groupeDuDossier} peutEnregistrer aujourdhui={jour} />
      )}

      {bulletin ? (
        <FicheBulletin bulletin={bulletin} />
      ) : (
        <>
          <RecapitulatifDuMois declaration={declaration} periode={periode} />
          <Personnel
            personnel={personnel}
            bulletins={declaration?.bulletins ?? []}
            annee={annee}
            mois={mois}
          />
        </>
      )}
    </main>
  );
}

function RecapitulatifDuMois({
  declaration,
  periode,
}: {
  declaration: Declaration | null;
  periode: string;
}) {
  if (declaration === null) {
    return (
      <section className="adherent__section">
        <h2 className="adherent__titre">Rien à déclarer pour {periode}</h2>
        <p className="adherent__vide">
          Aucun contrat ne couvre ce mois. Inscrivez vos salariés et ouvrez leur contrat, les
          bulletins se calculeront d&rsquo;eux-mêmes.
        </p>
      </section>
    );
  }

  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">Ce que vous devez verser</h2>
      <div className="paie-resume">
        <p className="paie-resume__total">
          <span className="paie-resume__libelle">Total à verser</span>
          <strong className="paie-resume__chiffre">{montantFcfa(declaration.total_a_verser)}</strong>
          <span className="paie-resume__appoint">
            dont CNPS {montantFcfa(declaration.cotisations_cnps)}
          </span>
        </p>
        {/* ⚠️ L'échéance est rendue par le serveur, et le retard aussi. L'écran
            ne compte aucun jour : un calendrier recopié ici dériverait du vrai le
            jour où une loi de finances déplace une date. */}
        <p className={declaration.en_retard ? "paie-resume__retard" : "paie-resume__echeance"}>
          {declaration.en_retard ? "En retard depuis le " : "À déposer avant le "}
          {dateCourte(declaration.a_deposer_avant)}
        </p>
      </div>
      <dl className="paie-chiffres">
        <Chiffre libelle="Effectif déclaré" valeur={String(declaration.effectif)} />
        <Chiffre libelle="Masse salariale brute" valeur={montantFcfa(declaration.masse_salariale_brute)} />
        <Chiffre libelle="Retenues salariales" valeur={montantFcfa(declaration.retenues_salariales)} />
        <Chiffre libelle="Charges patronales" valeur={montantFcfa(declaration.charges_patronales)} />
      </dl>
    </section>
  );
}

function Chiffre({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="paie-chiffres__case">
      <dt>{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}

function Personnel({
  personnel,
  bulletins,
  annee,
  mois,
}: {
  personnel: LigneSalarie[] | null;
  bulletins: Bulletin[];
  annee: number;
  mois: number;
}) {
  if (personnel === null) {
    return (
      <section className="adherent__section">
        <h2 className="adherent__titre">Votre personnel ne se lit pas</h2>
        <p className="adherent__vide">La lecture n&rsquo;a pas abouti. Réessayez dans un instant.</p>
      </section>
    );
  }

  if (personnel.length === 0) {
    return (
      <section className="adherent__section">
        <h2 className="adherent__titre">Aucun salarié inscrit</h2>
        <p className="adherent__vide">
          Votre fichier du personnel est vide. Le cabinet inscrit vos salariés et ouvre leurs
          contrats ; ils apparaîtront ici avec leurs bulletins.
        </p>
      </section>
    );
  }

  const aUnBulletin = new Set(bulletins.map((b) => b.salarie));

  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">Votre personnel</h2>
      {/* ⚠️ Les sortis RESTENT au fichier, grisés. La CNPS peut réclamer un état
          nominatif des années après un départ, et un fichier purgé ne répond pas. */}
      <ul className="paie-personnel">
        {personnel.map((salarie) => (
          <li
            key={salarie.matricule}
            className={salarie.sans_contrat ? "paie-personnel__sorti" : undefined}
          >
            <span className="paie-personnel__nom">
              {salarie.prenom} {salarie.nom}
            </span>
            <span className="paie-personnel__poste">
              {salarie.sans_contrat ? "sorti" : (salarie.poste ?? "poste non précisé")}
            </span>
            <span className="paie-personnel__salaire">
              {salarie.salaire_base ? montantFcfa(salarie.salaire_base) : ""}
            </span>
            {aUnBulletin.has(salarie.matricule) ? (
              <Link
                href={`/mon-espace/paie?annee=${annee}&mois=${mois}&salarie=${encodeURIComponent(salarie.matricule)}`}
              >
                Son bulletin
              </Link>
            ) : (
              <span className="paie-personnel__sans">pas de bulletin ce mois</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FicheBulletin({ bulletin }: { bulletin: Bulletin }) {
  const salariales = bulletin.lignes.filter((l) => l.a_charge_du_salarie);
  const patronales = bulletin.lignes.filter((l) => !l.a_charge_du_salarie);

  return (
    <>
      {bulletin.alertes.map((a) => (
        <p key={a} role="alert" className="adherent__alerte">
          {a}
        </p>
      ))}
      <section className="adherent__section">
        <h2 className="adherent__titre">Ce qui est versé au salarié</h2>
        <dl className="paie-chiffres">
          <Chiffre libelle="Salaire de base" valeur={montantFcfa(bulletin.salaire_base)} />
          <Chiffre libelle="Primes" valeur={montantFcfa(bulletin.primes)} />
          <Chiffre libelle="Avantages évalués" valeur={montantFcfa(bulletin.avantages_evalues)} />
          <Chiffre libelle="Brut taxable" valeur={montantFcfa(bulletin.brut_taxable)} />
          <Chiffre libelle="Net à payer" valeur={montantFcfa(bulletin.net_a_payer)} />
          <Chiffre libelle="Coût employeur" valeur={montantFcfa(bulletin.cout_employeur)} />
        </dl>
      </section>

      <Retenues titre="Retenues sur le salaire" lignes={salariales} />
      <Retenues titre="Charges à votre charge" lignes={patronales} />
    </>
  );
}

function Retenues({
  titre,
  lignes,
}: {
  titre: string;
  lignes: Bulletin["lignes"];
}) {
  if (lignes.length === 0) return null;
  return (
    <section className="adherent__section">
      <h2 className="adherent__titre">{titre}</h2>
      <ul className="paie-retenues">
        {lignes.map((ligne) => (
          <li key={ligne.code}>
            <span className="paie-retenues__libelle">
              {ligne.libelle}
              {/* ⚠️ Un taux que le cabinet n'a pas encore validé se signale sur la
                  ligne même. Le dire une fois en haut de page ne suffit pas :
                  c'est ce montant-là qui sera contesté, pas la page. */}
              {ligne.non_valide && <em className="paie-retenues__reserve"> taux à confirmer</em>}
            </span>
            <span className="paie-retenues__taux">{ligne.taux ?? ""}</span>
            <span className="paie-retenues__montant">{montantFcfa(ligne.montant)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
