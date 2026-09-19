import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { Montant, PastilleStatut, type Statut } from "@/app/components/Montant";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { Link } from "@/i18n/navigation";
import { dateCourte } from "@/app/lib/formats";
import {
  lireCatalogueDesObligations,
  lireEcheancier,
  lireRelancesDEcheance,
  type LigneEcheance,
} from "@/app/lib/obligations";
import { ErreurApi } from "@/app/lib/api";
import { SimulateurPenalite } from "@/app/components/obligations/GestesEcheancier";
import { exerciceCourant } from "@/app/lib/comptabilite";
import { aujourdhui, lireDossiers } from "@/app/lib/portefeuille";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { ConstatDepot } from "@/app/components/obligations/ConstatDepot";
import { PorteSecondFacteur } from "@/app/components/securite/PorteSecondFacteur";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";
import { lireMesEcheances } from "@/app/lib/espace-adherent";

export const metadata: Metadata = { title: "Obligations — Plateforme CGA" };

/**
 * E-F01 · L'échéancier d'un dossier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ÉCHÉANCIER SE CALCULE, IL NE SE STOCKE PAS
 *
 * Il découle du profil du dossier, réévalué **à la fin de chaque période**. C'est
 * ce qui rend le franchissement de seuil correct : une entreprise assujettie à
 * partir de septembre a quatre déclarations de TVA sur l'exercice, pas douze et
 * pas zéro.
 *
 * LE RETARD EST UNE COMPARAISON, PAS UN ÉTAT
 *
 * `en_retard` vient du backend, résolu à la date demandée. Une obligation n'est
 * pas « en retard » dans l'absolu — elle l'est au regard d'un jour donné, et
 * l'écran affiche lequel.
 *
 * ⚠️ LES OBLIGATIONS SOCIALES SE LISENT AU FICHIER DU PERSONNEL (pas 56)
 *
 * Ce commentaire disait que le contexte Social n'existait pas, et que l'échéancier
 * était calculé sans salariés. Le contexte existait, et l'échéancier ignorait bien
 * les salariés : la CNPS et les retenues sur salaires n'apparaissaient jamais. Le
 * backend les calcule désormais mois par mois, selon les contrats du dossier.
 *
 * Quand le fichier du personnel n'a pas répondu, l'obligation figure quand même,
 * marquée « effectif à confirmer » : l'écran le dit sous le libellé.
 *
 * ⚠️ TROIS PANNEAUX DE PLUS AU PAS 87
 *
 * - **Les relances du jour**, sur tout le portefeuille de la session : c'est la liste de
 *   travail du matin. Elles ne dépendent plus d'un exercice « 2026 » écrit en dur.
 * - **L'estimation de pénalité** d'une obligation en retard, avec les taux du référentiel
 *   et leur texte : la route appliquait 10 % au lieu des 25 % validés.
 * - **Le catalogue** : ce qui fonde le calendrier affiché, pour répondre à « pourquoi cette
 *   obligation, pourquoi le 15 ? ».
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "echeance", libelle: "Échéance", largeur: "96px" },
  { cle: "obligation", libelle: "Obligation", largeur: "minmax(0, 2fr)" },
  { cle: "periode", libelle: "Période", largeur: "180px" },
  { cle: "montant", libelle: "Montant estimé", largeur: "132px", aDroite: true },
  { cle: "jours", libelle: "Reste", largeur: "92px", aDroite: true },
  { cle: "statut", libelle: "Statut", largeur: "124px" },
];

const LIBELLES: Record<string, Statut> = {
  A_FAIRE: "À faire",
  EN_PREPARATION: "En préparation",
  PRETE: "Prête",
  DECLAREE: "Déclarée",
  PAYEE: "Payée",
};

export default async function Obligations({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; exercice?: string }>;
}) {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403, l'erreur remonte, et le
  // visiteur voit un 500 au lieu d'un refus lisible. Voir `EcranReserve`.
  if (!detient(acces, "LIRE_DOSSIER")) {
    return <EcranReserve titre="Obligations fiscales" permission="LIRE_DOSSIER" acces={acces} />;
  }
  const { dossier, exercice = exerciceCourant() } = await searchParams;
  const dossiers = await lireDossiers();

  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Obligations fiscales" }]} />
        <div className="page-travail">
          <EtatVide titre="Aucun dossier" detail="Aucun dossier ne vous est affecté." />
        </div>
      </>
    );
  }

  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;
  const jour = aujourdhui();
  const echeances = await lireEcheancier(niu, exercice, jour);

  // ⚠️ Un filtre d'affichage, pas une règle : voir `ConstatDepot.tsx`. La TVA est
  // exclue parce qu'elle a son parcours, et le backend la refuserait ici.
  const peutDeposer = detient(acces, "DEPOSER_DECLARATION");
  const aConstater = echeances
    .map((e) => e.obligation)
    .filter((o) => o.code_obligation !== "TVA" && !o.deposee && o.periode_debut <= jour)
    .map((o) => ({
      valeur: `${o.code_obligation}|${o.periode_debut}|${o.periode_fin}`,
      libelle: `${o.libelle} · ${dateCourte(o.periode_debut)} → ${dateCourte(o.periode_fin)} · échéance ${dateCourte(o.echeance)}`,
    }));

  const enRetard = echeances.filter((e) => e.en_retard);
  // Deux lectures facultatives : leur panne ne doit pas faire tomber l'échéancier.
  const [relances, catalogue] = await Promise.all([
    lireRelancesDEcheance(jour).catch((e: unknown) => (e instanceof ErreurApi ? e.message : Promise.reject(e))),
    lireCatalogueDesObligations(jour).catch((e: unknown) => (e instanceof ErreurApi ? e.message : Promise.reject(e))),
  ]);
  const aVenir = echeances.filter((e) => !e.en_retard && !e.obligation.deposee);
  // Pas 113 : les quittances envoyées par l'adhérent, à vérifier puis à joindre au constat. Lecture
  // facultative : sa panne ne masque pas l'échéancier.
  const preuves = await lireMesEcheances(niu)
    .then((v) => v.echeances.filter((e) => e.etat === "PREUVE_ENVOYEE"))
    .catch(() => []);

  return (
    <>
      <EnteteTravail
        miettes={[
          { libelle: "Obligations fiscales" },
          { libelle: courant.denomination },
        ]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Échéancier {exercice}</h1>
          <p>
            {courant.denomination} · {echeances.length} obligations ·{" "}
            {enRetard.length} en retard, {aVenir.length} à venir · résolu au{" "}
            {dateCourte(jour)}
          </p>
        </div>

        {/* ⚠️ Ce bandeau disait « cet échéancier suppose que le dossier n'a pas de
            salariés ; le contexte Social n'existe pas encore ». Le pas 56 a corrigé le
            calcul et le commentaire du code, **et a laissé le bandeau** : l'écran
            affichait douze CNPS sous une phrase qui niait leur existence. Relevé et
            retiré au pas 61. Il ne reste d'avertissement que lorsqu'il est vrai. */}
        {echeances.some((e) => e.obligation.effectif_a_confirmer) && (
          <div className="avertissement-ecran avertissement-ecran--reserve" role="alert">
            <strong>Le fichier du personnel n&rsquo;a pas répondu.</strong> Les obligations
            sociales sont affichées par prudence : vérifiez que le dossier employait bien
            quelqu&rsquo;un sur chaque période concernée.
          </div>
        )}

        <Panneau
          titre="Obligations de l'exercice"
          aide="Calculées depuis le profil du dossier, réévalué à la fin de chaque période. Un changement de régime en cours d'année se reflète immédiatement."
        >
          {echeances.length === 0 ? (
            <EtatVide
              titre="Aucune obligation"
              detail={`Le profil de ce dossier ne produit aucune obligation sur ${exercice}.`}
            />
          ) : (
            <>
              <EnteteTableau colonnes={COLONNES} />
              {echeances.map((ligne, rang) => (
                <Ligne
                  key={`${ligne.obligation.code_obligation}${ligne.obligation.periode_fin}`}
                  ligne={ligne}
                  niu={niu}
                  rang={rang}
                />
              ))}
            </>
          )}
        </Panneau>

        <Panneau
          titre="Relances d'échéance du jour"
          aide="Sur tout votre portefeuille. Jalons J-15, J-7, J-2 et J+1 : le J+1 est le jour où la pénalité commence à courir."
        >
          {typeof relances === "string" ? (
            <EtatVide titre="Les relances ne se lisent pas" detail={relances} />
          ) : relances.length === 0 ? (
            <EtatVide titre="Aucune relance aujourd'hui" detail="Aucune échéance du portefeuille ne tombe sur un jalon ce jour." />
          ) : (
            <>
              <EnteteTableau colonnes={RELANCES} />
              {relances.map((r, rang) => (
                <LigneTableau
                  key={`${r.obligation.entreprise}-${r.obligation.code_obligation}-${r.obligation.periode_fin}`}
                  colonnes={RELANCES}
                  ton={r.depassee ? "alerte" : rang % 2 ? "alterne" : "normal"}
                >
                  <Cellule tabulaire gras>
                    {r.jalon > 0 ? `J+${r.jalon}` : `J${r.jalon}`}
                  </Cellule>
                  <Cellule>
                    <Link href={`/obligations?dossier=${encodeURIComponent(r.obligation.entreprise)}`}>
                      {dossiers.find((d) => d.niu === r.obligation.entreprise)?.denomination ?? r.obligation.entreprise}
                    </Link>
                  </Cellule>
                  <Cellule titre={r.obligation.libelle}>{r.obligation.libelle}</Cellule>
                  <Cellule tabulaire>{dateCourte(r.obligation.echeance)}</Cellule>
                  <Cellule couleur={r.depassee ? "var(--danger)" : undefined}>
                    {r.depassee ? "Pénalité en cours" : r.urgente ? "Urgente" : "À rappeler"}
                  </Cellule>
                </LigneTableau>
              ))}
            </>
          )}
        </Panneau>

        {enRetard.length > 0 && (
          <Panneau
            titre="Estimer une pénalité"
            aide="Pour une obligation en retard de ce dossier. Les taux viennent du référentiel, à la date de l'échéance."
          >
            <SimulateurPenalite
              aujourdhui={jour}
              echeances={enRetard.map((e) => ({
                valeur: e.obligation.echeance,
                libelle: `${e.obligation.libelle} · ${dateCourte(e.obligation.periode_debut)} → ${dateCourte(e.obligation.periode_fin)} · échéance ${dateCourte(e.obligation.echeance)}`,
                montant: e.obligation.montant_estime,
              }))}
            />
          </Panneau>
        )}

        {preuves.length > 0 && (
          <Panneau
            titre="Preuves de paiement envoyées par l'adhérent"
            aide="Une quittance envoyée ne déclare rien : la vérifier (bonne obligation, bonne période, lisible), puis consigner le dépôt avec la pièce en pièce jointe."
          >
            <ul style={{ margin: 0, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6, font: "400 13px/1.5 var(--police-texte)" }}>
              {preuves.map((p) => (
                <li key={`${p.code_obligation}-${p.periode_debut}`}>
                  {/* ⚠️ Pas de lien vers `/pieces/[reference]` : cette fiche est désignée par la référence
                      d'une facture, et une quittance n'en a pas. La pièce se lit dans la boîte de réception. */}
                  <strong>{p.libelle}</strong> · {p.periode} · pièce <strong>{p.preuve!.piece}</strong>, envoyée le{" "}
                  {dateCourte(p.preuve!.envoyee_le)} · <Link href="/pieces">boîte de réception</Link>
                </li>
              ))}
            </ul>
          </Panneau>
        )}

        {peutDeposer && aConstater.length > 0 && (
          <Panneau
            titre="Constater un dépôt"
            aide="Pour une obligation déposée hors de la plateforme : CNPS, retenues, IGS, DSF, patente. La TVA se dépose par son propre parcours, qui contrôle la déclaration."
          >
            {acces.facteur_fort ? (
              <ConstatDepot dossier={niu} obligations={aConstater} />
            ) : (
              <PorteSecondFacteur
                enrole={acces.second_facteur_enrole}
                geste="Consigner un dépôt"
              />
            )}
          </Panneau>
        )}
        <Panneau titre="Catalogue des obligations" aide="Ce qui fonde le calendrier : un type d'obligation, son guichet, sa périodicité et son jour limite.">
          {typeof catalogue === "string" ? (
            <EtatVide titre="Le catalogue ne se lit pas" detail={catalogue} />
          ) : (
            <>
              <EnteteTableau colonnes={CATALOGUE} />
              {catalogue.map((t, rang) => (
                <LigneTableau key={t.code} colonnes={CATALOGUE} ton={rang % 2 ? "alterne" : "normal"}>
                  <Cellule gras titre={t.code}>{t.libelle}</Cellule>
                  <Cellule>{t.portail.replaceAll("_", " ")}</Cellule>
                  <Cellule>{t.periodicite.toLowerCase()}</Cellule>
                  <Cellule tabulaire>
                    {t.jour_limite
                      ? `le ${t.jour_limite}`
                      : t.delai_jours_apres_cloture
                        ? `${t.delai_jours_apres_cloture} j après clôture`
                        : t.jour_civil && t.mois_civil
                          ? `le ${t.jour_civil}/${String(t.mois_civil).padStart(2, "0")}`
                          : "—"}
                  </Cellule>
                  <Cellule couleur="var(--ink-500)">
                    {[
                      t.regimes_concernes ? t.regimes_concernes.join(", ") : "tous régimes",
                      t.exige_assujettissement_tva && "assujettis TVA",
                      t.exige_salaries && "avec salariés",
                      t.declaration_neant_due && "néant dû",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Cellule>
                </LigneTableau>
              ))}
            </>
          )}
        </Panneau>
      </div>
    </>
  );
}

const RELANCES: Colonne[] = [
  { cle: "jalon", libelle: "Jalon", largeur: "64px" },
  { cle: "dossier", libelle: "Dossier", largeur: "minmax(0, 1.2fr)" },
  { cle: "obligation", libelle: "Obligation", largeur: "minmax(0, 1.6fr)" },
  { cle: "echeance", libelle: "Échéance", largeur: "96px" },
  { cle: "etat", libelle: "", largeur: "130px" },
];

const CATALOGUE: Colonne[] = [
  { cle: "libelle", libelle: "Obligation", largeur: "minmax(0, 1.6fr)" },
  { cle: "portail", libelle: "Guichet", largeur: "160px" },
  { cle: "periodicite", libelle: "Périodicité", largeur: "110px" },
  { cle: "limite", libelle: "Limite", largeur: "140px" },
  { cle: "conditions", libelle: "Concerne", largeur: "minmax(0, 1.4fr)" },
];

function Ligne({
  ligne,
  niu,
  rang,
}: {
  ligne: LigneEcheance;
  niu: string;
  rang: number;
}) {
  const o = ligne.obligation;
  const estTva = o.code_obligation === "TVA";
  return (
    <LigneTableau
      colonnes={COLONNES}
      // Le ton `alerte` est réservé à ce qui bloque réellement : un dépôt en
      // retard fait courir une pénalité, et elle s'accroît par mois entamé.
      ton={ligne.en_retard ? "alerte" : rang % 2 ? "alterne" : "normal"}
    >
      <Cellule tabulaire gras>{dateCourte(o.echeance)}</Cellule>
      <Cellule titre={o.libelle}>
        {estTva ? (
          <Link
            href={`/obligations/declarations?dossier=${niu}&debut=${o.periode_debut}&fin=${o.periode_fin}`}
            style={{ color: "var(--brand-indigo-700)" }}
          >
            {o.libelle}
          </Link>
        ) : (
          o.libelle
        )}
        {o.effectif_a_confirmer && (
          <span
            style={{
              display: "block",
              font: "400 11.5px/1.4 var(--police-texte)",
              color: "var(--warning)",
            }}
          >
            Effectif à confirmer : le fichier du personnel n&rsquo;a pas répondu
          </span>
        )}
      </Cellule>
      <Cellule tabulaire couleur="var(--ink-500)">
        {dateCourte(o.periode_debut)} → {dateCourte(o.periode_fin)}
      </Cellule>
      {/* Un montant estimé sur un dossier incomplet n'engage à rien : le tiret
          vaut mieux qu'un zéro, qui laisserait croire qu'il n'y a rien à payer. */}
      <Cellule aDroite tabulaire>
        {o.montant_estime ? <Montant valeur={o.montant_estime} /> : "—"}
      </Cellule>
      <Cellule
        aDroite
        tabulaire
        couleur={ligne.en_retard ? "var(--danger)" : "var(--ink-500)"}
      >
        {o.deposee
          ? "—"
          : ligne.jours_restants < 0
            ? `${-ligne.jours_restants} j de retard`
            : `${ligne.jours_restants} j`}
      </Cellule>
      <Cellule>
        <PastilleStatut statut={ligne.en_retard ? "En retard" : LIBELLES[o.statut]} />
      </Cellule>
    </LigneTableau>
  );
}
