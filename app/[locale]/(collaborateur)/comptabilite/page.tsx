import type { Metadata } from "next";

import {
  Cellule,
  EnteteTableau,
  EtatVide,
  LigneTableau,
  Panneau,
  type Colonne,
} from "@/app/components/Tableau";
import { Montant } from "@/app/components/Montant";
import { EnteteTravail } from "@/app/components/coquille/EnteteTravail";
import { Link } from "@/i18n/navigation";
import { DetailDuCompte } from "@/app/components/comptabilite/DetailDuCompte";
import { ErreurApi } from "@/app/lib/api";
import {
  exerciceCourant,
  lireBalance,
  lireGrandLivre,
  lireJournaux,
  lirePlanComptable,
  lireSante,
  type FiltreDeLettrage,
  type FiltresComptables,
  type LigneGrandLivre,
  type SoldeCompte,
} from "@/app/lib/comptabilite";
import { lireDossiers } from "@/app/lib/portefeuille";
import { EcranReserve } from "@/app/components/coquille/EcranReserve";
import { detient } from "@/app/lib/acces";
import { exigerAcces } from "@/app/lib/session";

export const metadata: Metadata = { title: "Comptabilité — Plateforme CGA" };

/**
 * E-E01 · Balance et santé comptable d'un dossier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA BALANCE EST CALCULÉE PAR LE BACKEND, JAMAIS ICI
 *
 * Il n'existe qu'une source : le journal. Une balance recalculée dans le
 * navigateur serait un second exemplaire de la vérité, et le jour où les deux
 * divergeraient personne ne saurait lequel croire.
 *
 * LES TROIS CONTRÔLES D'AVANT DÉPÔT SONT EN TÊTE
 *
 * Équilibre, continuité des numéros, résultat. Ce sont les trois questions que
 * l'administration posera, et il vaut mieux se les poser avant elle. Le champ
 * `deposable` vient du backend : l'écran ne réinvente pas la règle.
 *
 * PAS 108 : LA BALANCE À GAUCHE, LE COMPTE CHOISI À DROITE
 *
 * « Le comptable ne perd jamais le contexte pour ouvrir un compte » (maquette « Parcours
 * comptable », vue C, note 1). Un numéro de compte ouvre son détail à côté de la balance, avec
 * le lettrage ; sur un écran étroit, le détail passe dessous. La période et le journal filtrent
 * la balance **et** ses totaux, calculés par le backend ; la recherche ne fait que masquer des
 * lignes, elle ne recalcule rien.
 *
 * LE DOSSIER SE CHOISIT PAR LA BARRE LATÉRALE
 *
 * Faute de dossier sélectionné, le premier du portefeuille est affiché — et
 * l'écran le dit. Afficher une page vide en attendant un clic ferait croire que
 * la comptabilité est vide.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "compte", libelle: "Compte", largeur: "96px" },
  { cle: "libelle", libelle: "Intitulé", largeur: "minmax(0, 2fr)" },
  { cle: "debit", libelle: "Débit", largeur: "130px", aDroite: true },
  { cle: "credit", libelle: "Crédit", largeur: "130px", aDroite: true },
  { cle: "solde", libelle: "Solde", largeur: "140px", aDroite: true },
];

export default async function Comptabilite({
  searchParams,
}: {
  searchParams: Promise<{
    dossier?: string;
    exercice?: string;
    du?: string;
    au?: string;
    journal?: string;
    q?: string;
    compte?: string;
    lettrage?: string;
  }>;
}) {
  const acces = await exigerAcces();
  // ⚠️ Garde avant tout appel : sinon l'API rend 403, l'erreur remonte, et le
  // visiteur voit un 500 au lieu d'un refus lisible. Voir `EcranReserve`.
  if (!detient(acces, "LIRE_COMPTABILITE")) {
    return <EcranReserve titre="Comptabilité" permission="LIRE_COMPTABILITE" acces={acces} />;
  }
  const brut = await searchParams;
  const { dossier, exercice = exerciceCourant() } = brut;
  const date = (valeur?: string) => (valeur && /^\d{4}-\d{2}-\d{2}$/.test(valeur) ? valeur : undefined);
  const filtres: FiltresComptables = { du: date(brut.du), au: date(brut.au), journal: brut.journal || undefined };
  const recherche = (brut.q ?? "").trim().toLowerCase();
  const lettrage: FiltreDeLettrage = brut.lettrage === "LETTREES" || brut.lettrage === "NON_LETTREES" ? brut.lettrage : "TOUTES";
  const dossiers = await lireDossiers();

  if (dossiers.length === 0) {
    return (
      <>
        <EnteteTravail miettes={[{ libelle: "Comptabilité" }]} />
        <div className="page-travail">
          <EtatVide
            titre="Aucun dossier"
            detail="Aucun dossier ne vous est affecté : il n'y a pas de comptabilité à afficher."
          />
        </div>
      </>
    );
  }

  const niu = dossier && dossiers.some((d) => d.niu === dossier) ? dossier : dossiers[0].niu;
  const courant = dossiers.find((d) => d.niu === niu)!;
  const [soldes, sante, plan, journaux] = await Promise.all([
    lireBalance(niu, exercice, filtres),
    lireSante(niu, exercice, filtres),
    // ⚠️ Pas 77 : la balance ne porte pas l'intitulé des comptes, et la colonne était
    // vide. Il se lit au plan ; un plan illisible laisse l'intitulé vide sans faire
    // tomber la balance.
    lirePlanComptable().catch(() => []),
    lireJournaux().catch(() => []),
  ]);
  const intitules = new Map(plan.map((c) => [c.numero, c.intitule]));
  const visibles = recherche
    ? soldes.filter((s) => s.compte.startsWith(recherche) || (intitules.get(s.compte) ?? "").toLowerCase().includes(recherche))
    : soldes;

  // Le compte choisi, et ses mouvements, filtrés comme la balance.
  const compte = brut.compte && /^[1-9][0-9]{0,7}$/.test(brut.compte) ? brut.compte : null;
  let mouvements: LigneGrandLivre[] | null = null;
  if (compte) {
    try {
      mouvements = await lireGrandLivre(niu, compte, exercice, { ...filtres, lettrage });
    } catch (erreur) {
      // 404 : aucun mouvement sur l'exercice, ce qui n'est pas une panne.
      if (erreur instanceof ErreurApi && erreur.statut === 404) mouvements = [];
      else throw erreur;
    }
  }
  const auPlan = compte ? plan.find((c) => c.numero === compte) : undefined;
  // Les liens gardent les filtres : ouvrir un compte ne doit pas faire perdre la période.
  const lien = (autres: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valeurs = { dossier: niu, exercice, du: filtres.du, au: filtres.au, journal: filtres.journal, q: brut.q, compte: compte ?? undefined, lettrage: lettrage === "TOUTES" ? undefined : lettrage, ...autres };
    for (const [cle, valeur] of Object.entries(valeurs)) if (valeur) p.set(cle, valeur);
    return `/comptabilite?${p}`;
  };

  return (
    <>
      <EnteteTravail
        miettes={[{ libelle: "Comptabilité" }, { libelle: courant.denomination }]}
      />
      <div className="page-travail">
        <div className="page-travail__titre">
          <h1>Balance générale</h1>
          <p>
            {courant.denomination} · exercice {exercice} ·{" "}
            {filtres.du || filtres.au ? `du ${filtres.du ?? "début"} au ${filtres.au ?? "fin"} · ` : ""}
            {filtres.journal ? `journal ${filtres.journal} · ` : ""}
            {soldes.length} compte{soldes.length > 1 ? "s" : ""} mouvementé
            {soldes.length > 1 ? "s" : ""} · totaux contrôlés à l&apos;affichage
            {dossiers.length > 1 && " · changez de dossier dans la barre latérale"}
          </p>
        </div>

        <Sante sante={sante} />

        <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--line-200)", borderRadius: "var(--rayon)" }}>
          <input type="hidden" name="dossier" value={niu} />
          <input type="hidden" name="exercice" value={exercice} />
          <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)", flex: "1 1 200px" }}>
            Rechercher
            <input name="q" type="search" defaultValue={brut.q ?? ""} placeholder="Numéro ou intitulé de compte" style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }} />
          </label>
          <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
            Du
            <input name="du" type="date" defaultValue={filtres.du ?? ""} style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }} />
          </label>
          <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
            Au
            <input name="au" type="date" defaultValue={filtres.au ?? ""} style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }} />
          </label>
          <label style={{ display: "grid", gap: 4, font: "600 12px/1.4 var(--police-texte)" }}>
            Journal
            <select name="journal" defaultValue={filtres.journal ?? ""} style={{ padding: "6px 8px", border: "1px solid var(--line-200)", borderRadius: "var(--rayon-petit)" }}>
              <option value="">Tous</option>
              {journaux.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} · {j.intitule}
                </option>
              ))}
            </select>
          </label>
          {compte && <input type="hidden" name="compte" value={compte} />}
          <button type="submit" className="action-secondaire">
            Filtrer
          </button>
        </form>

        <div className={compte ? "balance-et-compte balance-et-compte--ouvert" : "balance-et-compte"}>
        <Panneau
          titre="Balance"
          aide="Calculée sur les écritures validées. Un brouillon n'est pas de la comptabilité, c'est une intention."
        >
          {visibles.length === 0 ? (
            <EtatVide
              titre="Aucun mouvement"
              detail={soldes.length > 0 ? "Aucun compte ne correspond à la recherche." : `Aucune écriture validée sur l'exercice ${exercice} pour ces filtres.`}
            />
          ) : (
            // ⚠️ Pas 108 : sur téléphone, la colonne « Crédit » et le solde étaient coupés sans
            // barre de défilement. Le tableau défile désormais dans son panneau.
            <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 620 }}>
              <EnteteTableau colonnes={COLONNES} />
              {visibles.map((solde, rang) => (
                <Ligne
                  key={solde.compte}
                  href={lien({ compte: solde.compte })}
                  choisi={solde.compte === compte}
                  solde={solde}
                  intitule={intitules.get(solde.compte) ?? null}
                  rang={rang}
                />
              ))}
              <Totaux sante={sante} />
            </div>
            </div>
          )}
        </Panneau>

        {compte && mouvements && (
          <Panneau
            titre={`${compte} · ${auPlan?.intitule ?? "compte hors plan de référence"}`}
            aide={auPlan?.lettrable ? "Compte de tiers : cochez les lignes qui se soldent pour les lettrer" : "Le détail du compte sur la période"}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 14px", font: "500 12px/1.4 var(--police-texte)" }}>
              {(["TOUTES", "NON_LETTREES", "LETTREES"] as const).map((valeur) => (
                <Link key={valeur} href={lien({ lettrage: valeur === "TOUTES" ? undefined : valeur })} aria-current={lettrage === valeur ? "true" : undefined} style={{ fontWeight: lettrage === valeur ? 700 : 500 }}>
                  {{ TOUTES: "Toutes les lignes", NON_LETTREES: "Non lettrées", LETTREES: "Lettrées" }[valeur]}
                </Link>
              ))}
              <Link href={lien({ compte: undefined, lettrage: undefined })} style={{ marginLeft: "auto" }}>
                Fermer
              </Link>
            </div>
            {mouvements.length === 0 ? (
              <EtatVide titre="Aucun mouvement" detail="Aucune ligne de ce compte pour ces filtres. Ce n'est pas une erreur : vérifiez la période." />
            ) : (
              <DetailDuCompte
                dossier={niu}
                exercice={exercice}
                compte={compte}
                lettrable={Boolean(auPlan?.lettrable)}
                peutLettrer={detient(acces, "SAISIR_ECRITURE")}
                lignes={mouvements}
              />
            )}
          </Panneau>
        )}
        </div>
      </div>
    </>
  );
}

function Sante({ sante }: { sante: Awaited<ReturnType<typeof lireSante>> }) {
  if (sante.deposable) {
    return (
      <div className="avertissement-ecran avertissement-ecran--reserve" role="status">
        <strong>Les trois contrôles d&rsquo;avant dépôt passent.</strong>
        Balance équilibrée, numérotation continue, résultat de l&rsquo;exercice :{" "}
        <Montant valeur={sante.resultat} avecDevise />. ⚠️ Cela ne dit rien de la{" "}
        <em>sincérité</em> des écritures — seulement de leur cohérence formelle.
      </div>
    );
  }
  return (
    <div className="avertissement-ecran" role="alert">
      <strong>Ce dossier n&rsquo;est pas en état d&rsquo;être déposé.</strong>
      {!sante.equilibree && (
        <span style={{ display: "block" }}>
          La balance ne s&rsquo;équilibre pas : <Montant valeur={sante.total_debit} /> au
          débit contre <Montant valeur={sante.total_credit} /> au crédit. Une déclaration
          assise sur une comptabilité déséquilibrée est fausse par construction.
        </span>
      )}
      {sante.trous_de_sequence.length > 0 && (
        <span style={{ display: "block" }}>
          {sante.trous_de_sequence.length} rupture(s) de numérotation. Un vérificateur lit
          la continuité des numéros avant tout le reste : un trou est présumé être une
          écriture retirée.
        </span>
      )}
    </div>
  );
}

function Ligne({
  href,
  choisi,
  solde,
  intitule,
  rang,
}: {
  /** L'intitulé au plan comptable, ou `null` pour un compte absent du plan de référence. */
  intitule: string | null;
  href: string;
  choisi: boolean;
  solde: SoldeCompte;
  rang: number;
}) {
  return (
    <LigneTableau colonnes={COLONNES} ton={choisi ? "selection" : rang % 2 ? "alterne" : "normal"}>
      <Cellule tabulaire gras>
        {/* Le grand livre est la vue par compte de ce que le journal enregistre
            chronologiquement. C'est là qu'on voit ce qui reste ouvert chez un
            fournisseur, et c'est le geste suivant du comptable. */}
        <Link href={href} style={{ color: "var(--brand-indigo-700)" }} aria-current={choisi ? "true" : undefined}>
          {solde.compte}
        </Link>
      </Cellule>
      <Cellule couleur="var(--ink-500)" titre={intitule ?? "absent du plan de référence"}>
        {intitule ?? "—"}
      </Cellule>
      <Cellule aDroite tabulaire>
        <Montant valeur={solde.total_debit} />
      </Cellule>
      <Cellule aDroite tabulaire>
        <Montant valeur={solde.total_credit} />
      </Cellule>
      <Cellule aDroite tabulaire gras>
        <Montant valeur={solde.solde} />
      </Cellule>
    </LigneTableau>
  );
}

function Totaux({ sante }: { sante: Awaited<ReturnType<typeof lireSante>> }) {
  return (
    <LigneTableau colonnes={COLONNES} ton="selection">
      <Cellule gras>Totaux</Cellule>
      <Cellule couleur="var(--ink-500)">
        {sante.equilibree ? "Balance équilibrée" : "⚠️ Balance déséquilibrée"}
      </Cellule>
      <Cellule aDroite tabulaire gras>
        <Montant valeur={sante.total_debit} />
      </Cellule>
      <Cellule aDroite tabulaire gras>
        <Montant valeur={sante.total_credit} />
      </Cellule>
      <Cellule aDroite tabulaire gras>
        {sante.equilibree ? "—" : <Montant valeur={String(Number(sante.total_debit) - Number(sante.total_credit))} />}
      </Cellule>
    </LigneTableau>
  );
}
