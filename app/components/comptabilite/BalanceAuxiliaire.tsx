import { Montant } from "@/app/components/Montant";
import { Cellule, EnteteTableau, EtatVide, LigneTableau, Panneau, type Colonne } from "@/app/components/Tableau";
import type { LigneAuxiliaire, NatureAuxiliaire } from "@/app/lib/comptabilite";
import { Link } from "@/i18n/navigation";

const COLONNES: Colonne[] = [
  { cle: "tiers", libelle: "Tiers", largeur: "minmax(0, 2fr)" },
  { cle: "niu", libelle: "NIU", largeur: "150px" },
  { cle: "report", libelle: "Reporté", largeur: "120px", aDroite: true },
  { cle: "debit", libelle: "Débit", largeur: "120px", aDroite: true },
  { cle: "credit", libelle: "Crédit", largeur: "120px", aDroite: true },
  { cle: "solde", libelle: "Solde", largeur: "130px", aDroite: true },
];

/**
 * La balance auxiliaire à l'écran (15 octobre 2026) : ce que l'Excel de l'annexe DSF
 * contient, lu avant de le télécharger. Une ligne « sans tiers » se signale : c'est ce
 * que le comptable ventile avant le dépôt.
 */
export function BalanceAuxiliaire({
  nature,
  lignes,
  autre,
  fermer,
}: {
  nature: NatureAuxiliaire;
  lignes: LigneAuxiliaire[];
  /** Le lien vers l'autre balance auxiliaire, et celui qui referme le panneau. */
  autre: string;
  fermer: string;
}) {
  const sansTiers = lignes.find((l) => l.tiers === null);
  return (
    <Panneau
      titre={`Balance auxiliaire ${nature}`}
      aide="Écritures validées, tiers par tiers : reporté du journal des à-nouveaux, mouvements de l'exercice."
      action={
        <span style={{ display: "flex", gap: 12, font: "500 12.5px/1.4 var(--police-texte)" }}>
          <Link href={autre}>{nature === "clients" ? "Voir les fournisseurs" : "Voir les clients"}</Link>
          <Link href={fermer}>Fermer</Link>
        </span>
      }
    >
      {sansTiers && (
        <p role="note" style={{ margin: "8px 14px", font: "500 12.5px/1.5 var(--police-texte)", color: "var(--danger)" }}>
          Des écritures sans tiers portent un solde de <Montant valeur={sansTiers.solde} avecDevise /> : à ventiler par
          tiers avant le dépôt de la DSF.
        </p>
      )}
      {lignes.length === 0 ? (
        <EtatVide titre="Aucun tiers mouvementé" detail="Aucune écriture validée sur ces comptes pour l'exercice." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 760 }}>
            <EnteteTableau colonnes={COLONNES} />
            {lignes.map((l, rang) => (
              <LigneTableau key={l.tiers ?? "sans-tiers"} colonnes={COLONNES} ton={rang % 2 ? "alterne" : "normal"}>
                <Cellule gras={l.tiers !== null} couleur={l.tiers === null ? "var(--danger)" : undefined}>
                  {l.tiers === null ? "Sans tiers" : l.denomination || l.tiers}
                </Cellule>
                <Cellule tabulaire couleur="var(--ink-500)">
                  {l.niu ?? ""}
                </Cellule>
                <Cellule aDroite tabulaire>
                  <Montant valeur={l.report} />
                </Cellule>
                <Cellule aDroite tabulaire>
                  <Montant valeur={l.debit} />
                </Cellule>
                <Cellule aDroite tabulaire>
                  <Montant valeur={l.credit} />
                </Cellule>
                <Cellule aDroite tabulaire gras>
                  <Montant valeur={l.solde} />
                </Cellule>
              </LigneTableau>
            ))}
          </div>
        </div>
      )}
    </Panneau>
  );
}
