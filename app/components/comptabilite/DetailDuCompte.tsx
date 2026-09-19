"use client";

import { startTransition, useActionState, useState } from "react";

import { Montant } from "@/app/components/Montant";
import { Cellule, EnteteTableau, LigneTableau, type Colonne } from "@/app/components/Tableau";
import { delettrer, lettrerLaSelection } from "@/app/lib/actions-lettrage";
import { dateCourte } from "@/app/lib/formats";
import { ETAT_ACTE_INITIAL } from "@/app/lib/saisie";
import { Link } from "@/i18n/navigation";

/**
 * Le détail d'un compte, avec son lettrage (pas 108). Maquette « Parcours comptable », vue C.
 *
 * ⚠️ Composant client : ni `comptabilite.ts` ni `api.ts` ici, seulement des types et des
 * valeurs. Le type de ligne est redéclaré au plus juste, pour la même raison.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'ÉCRAN FAIT, ET CE QU'IL NE FAIT PAS
 *
 * * Sur un compte lettrable, chaque ligne **non lettrée** se coche ; « Lettrer la sélection »
 *   envoie les lignes cochées. **L'écran n'additionne pas la sélection** : c'est le backend qui
 *   dit si elle se solde, et son refus donne les deux totaux et l'écart.
 * * Une lettre posée ici se défait d'un clic ; une lettre reprise du logiciel du client
 *   s'affiche, marquée « reprise », et ne se défait pas.
 * * Chaque ligne mène à sa pièce, par la recherche globale : la référence peut être celle d'une
 *   pièce reçue (PJ-…) comme celle d'un document (F-…), et la recherche sait trouver les deux.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type LigneDuCompte = {
  cle_ecriture: string;
  rang: number;
  journal: string;
  date_operation: string;
  libelle: string;
  sens: "DEBIT" | "CREDIT";
  montant: string;
  solde_progressif: string;
  lettrage: string | null;
  lettrage_origine: "PLATEFORME" | "REPRISE" | null;
  lettrage_identifiant: string | null;
  piece_justificative: string | null;
};

const note: React.CSSProperties = { margin: 0, font: "400 12px/1.5 var(--police-texte)", color: "var(--ink-500)" };

export function DetailDuCompte({
  dossier,
  exercice,
  compte,
  lettrable,
  peutLettrer,
  lignes,
}: {
  dossier: string;
  exercice: string;
  compte: string;
  lettrable: boolean;
  peutLettrer: boolean;
  lignes: LigneDuCompte[];
}) {
  const [etatLettrage, lettrer, lettrageEnCours] = useActionState(lettrerLaSelection, ETAT_ACTE_INITIAL);
  const [etatDelettrage, defaire, delettrageEnCours] = useActionState(delettrer, ETAT_ACTE_INITIAL);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const coche = lettrable && peutLettrer;
  const colonnes: Colonne[] = [
    ...(coche ? [{ cle: "choix", libelle: "", largeur: "22px" }] : []),
    { cle: "date", libelle: "Date", largeur: "80px" },
    { cle: "journal", libelle: "Jnl", largeur: "36px" },
    { cle: "libelle", libelle: "Libellé", largeur: "minmax(0, 2fr)" },
    { cle: "debit", libelle: "Débit", largeur: "100px", aDroite: true },
    { cle: "credit", libelle: "Crédit", largeur: "100px", aDroite: true },
    { cle: "solde", libelle: "Solde", largeur: "110px", aDroite: true },
    { cle: "lettre", libelle: "Lettre", largeur: coche ? "80px" : "56px" },
  ];
  const nonLettrees = lignes.filter((l) => l.lettrage === null).length;
  const cle = (l: LigneDuCompte) => `${l.cle_ecriture}#${l.rang}`;
  // ⚠️ La sélection n'est **pas** vidée à l'envoi : un refus (« la sélection ne se solde pas »)
  // doit laisser les cases cochées, pour corriger d'une case plutôt que tout recocher. Une ligne
  // lettrée entre-temps sort d'elle-même de la sélection : elle n'a plus de case.
  const ouvertes = new Set(lignes.filter((l) => l.lettrage === null).map(cle));
  const cochees = new Set([...coches].filter((valeur) => ouvertes.has(valeur)));
  const basculer = (valeur: string) =>
    setCoches((avant) => {
      const apres = new Set(avant);
      if (apres.has(valeur)) apres.delete(valeur);
      else apres.add(valeur);
      return apres;
    });
  // ⚠️ Pas de `<form action>` ici, et c'est la leçon de l'essai réel : React réinitialise le
  // formulaire après chaque action, **même en cas de refus**. Les cases se décochaient à l'écran
  // alors que la sélection restait en mémoire, et la case qu'on croyait décocher se recochait.
  // Les deux gestes construisent donc leur envoi depuis l'état, sans formulaire à réinitialiser.
  const envoyerLeLettrage = () => {
    const donnees = new FormData();
    donnees.set("dossier", dossier);
    donnees.set("exercice", exercice);
    donnees.set("compte", compte);
    for (const valeur of cochees) donnees.append("ligne", valeur);
    startTransition(() => lettrer(donnees));
  };
  const envoyerLeDelettrage = (identifiant: string) => {
    const donnees = new FormData();
    donnees.set("dossier", dossier);
    donnees.set("exercice", exercice);
    donnees.set("identifiant", identifiant);
    startTransition(() => defaire(donnees));
  };
  const retour = etatLettrage.echec ?? etatDelettrage.echec;
  const fait = etatLettrage.fait ?? etatDelettrage.fait;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        {/* Les colonnes fixes font 610 px avec leurs marges : en dessous de 760, le libellé
            tombait à zéro (vu sur téléphone). Plus étroit, le tableau défile. */}
        <div style={{ minWidth: 760 }}>
          <EnteteTableau colonnes={colonnes} />
          {lignes.map((ligne, rang) => (
            <LigneTableau key={cle(ligne)} colonnes={colonnes} ton={cochees.has(cle(ligne)) ? "selection" : rang % 2 ? "alterne" : "normal"}>
              {coche && (
                <span>
                  {ligne.lettrage === null && (
                    <input
                      type="checkbox"
                      checked={cochees.has(cle(ligne))}
                      onChange={() => basculer(cle(ligne))}
                      aria-label={`Sélectionner ${ligne.cle_ecriture}, ligne ${ligne.rang + 1}`}
                    />
                  )}
                </span>
              )}
              <Cellule tabulaire>{dateCourte(ligne.date_operation)}</Cellule>
              <Cellule couleur="var(--ink-500)">{ligne.journal}</Cellule>
              <Cellule titre={`${ligne.cle_ecriture} · ${ligne.libelle}`}>
                {ligne.piece_justificative ? (
                  <Link href={`/recherche?q=${encodeURIComponent(ligne.piece_justificative)}`} title={`Ouvrir la pièce ${ligne.piece_justificative}`}>
                    {ligne.libelle}
                  </Link>
                ) : (
                  ligne.libelle
                )}
              </Cellule>
              <Cellule aDroite tabulaire>
                {ligne.sens === "DEBIT" ? <Montant valeur={ligne.montant} /> : "—"}
              </Cellule>
              <Cellule aDroite tabulaire>
                {ligne.sens === "CREDIT" ? <Montant valeur={ligne.montant} /> : "—"}
              </Cellule>
              <Cellule aDroite tabulaire gras>
                <Montant valeur={ligne.solde_progressif} />
              </Cellule>
              <span style={{ display: "flex", gap: 6, alignItems: "center", font: "600 12px/1 var(--police-texte)" }}>
                {ligne.lettrage ?? <span style={{ color: "var(--ink-400)", fontWeight: 400 }}>—</span>}
                {ligne.lettrage_origine === "REPRISE" && <span style={{ ...note, fontSize: 11 }}>reprise</span>}
                {ligne.lettrage_origine === "PLATEFORME" && peutLettrer && ligne.lettrage_identifiant && (
                  <button
                    type="button"
                    onClick={() => envoyerLeDelettrage(ligne.lettrage_identifiant!)}
                    className="bouton-discret"
                    disabled={delettrageEnCours}
                    title={`Délettrer ${ligne.lettrage}`}
                    style={{ fontSize: 11, padding: "2px 6px" }}
                  >
                    Délettrer
                  </button>
                )}
              </span>
            </LigneTableau>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "10px 14px" }}>
        <span style={{ font: "600 12.5px/1.4 var(--police-texte)" }}>
          {nonLettrees} ligne{nonLettrees > 1 ? "s" : ""} non lettrée{nonLettrees > 1 ? "s" : ""}
        </span>
        {coche && (
          <>
            <span style={note}>
              {cochees.size} sélectionnée{cochees.size > 1 ? "s" : ""}
            </span>
            <button type="button" onClick={envoyerLeLettrage} className="action-secondaire" disabled={lettrageEnCours || cochees.size < 2} style={{ marginLeft: "auto" }}>
              {lettrageEnCours ? "…" : "Lettrer la sélection"}
            </button>
          </>
        )}
        {!lettrable && <span style={note}>Compte non lettrable : seuls les comptes de tiers se lettrent.</span>}
      </div>
      {retour && (
        <p role="alert" style={{ ...note, padding: "0 14px 10px", color: "var(--danger)" }}>
          {retour}
        </p>
      )}
      {fait && !retour && (
        <p role="status" style={{ ...note, padding: "0 14px 10px", color: "var(--success)" }}>
          {fait}
        </p>
      )}
    </div>
  );
}
