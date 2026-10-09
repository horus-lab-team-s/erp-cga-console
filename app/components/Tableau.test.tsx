import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Cellule,
  type Colonne,
  EnteteTableau,
  EtatErreur,
  EtatVide,
  largeurMinimale,
  LigneTableau,
  Panneau,
} from "./Tableau";

/**
 * Les primitives de tableau — § 10.4.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE FICHIER EST EMPLOYÉ PAR PRESQUE TOUS LES ÉCRANS. Un défaut ici ne se
 * voit pas sur un écran : il se voit sur trente, et de trente façons.
 *
 * Les colonnes sont déclarées **une seule fois** et partagées par l'en-tête et
 * les lignes. C'est la seule façon d'éviter qu'elles se désalignent au premier
 * ajout de colonne — un décalage d'en-tête met un montant sous le libellé
 * « Date », et le comptable lit de travers sans s'en apercevoir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLONNES: Colonne[] = [
  { cle: "date", libelle: "Date", largeur: "96px" },
  { cle: "libelle", libelle: "Libellé", largeur: "minmax(0, 1.4fr)" },
  { cle: "montant", libelle: "Montant", largeur: "120px", aDroite: true },
];

describe("La largeur minimale d'un tableau", () => {
  it("garde la valeur des colonnes fixes et donne un plancher aux fractions", () => {
    // 96 + 150 + 120 = 366, plus deux écarts de 8, plus 28 de marge.
    expect(largeurMinimale(COLONNES)).toBe(96 + 150 + 120 + 8 * 2 + 28);
  });

  it("compte les écarts ENTRE les colonnes, pas après la dernière", () => {
    // ⚠️ Un écart de trop fait déborder le tableau de huit pixels et déclenche
    // un défilement horizontal sur un écran qui tenait tout juste.
    const une: Colonne[] = [{ cle: "a", libelle: "A", largeur: "100px" }];
    expect(largeurMinimale(une)).toBe(100 + 28);
  });

  it("traite une largeur décimale comme une largeur fixe", () => {
    expect(largeurMinimale([{ cle: "a", libelle: "A", largeur: "96.5px" }])).toBe(
      Math.round(96.5 + 28),
    );
  });

  it("tolère les espaces autour de la largeur", () => {
    expect(largeurMinimale([{ cle: "a", libelle: "A", largeur: "  100px  " }])).toBe(128);
  });

  it("donne le plancher à tout ce qui n'est pas des pixels", () => {
    // `1fr`, `minmax(...)`, `auto` : autant de colonnes élastiques. Leur donner
    // zéro ferait calculer une largeur minimale inférieure au contenu réel, et
    // les colonnes se chevaucheraient.
    for (const largeur of ["1fr", "minmax(0, 1.4fr)", "auto", "max-content", ""]) {
      expect(largeurMinimale([{ cle: "a", libelle: "A", largeur }]), largeur).toBe(150 + 28);
    }
  });

  it("rend un entier, parce qu'une largeur CSS fractionnaire flotte", () => {
    expect(Number.isInteger(largeurMinimale(COLONNES))).toBe(true);
  });
});

describe("L'alignement des colonnes", () => {
  it("emploie la MÊME grille pour l'en-tête et pour les lignes", () => {
    const { container } = render(
      <>
        <EnteteTableau colonnes={COLONNES} />
        <LigneTableau colonnes={COLONNES}>
          <Cellule>12/08/2026</Cellule>
          <Cellule>Facture ALUCAM</Cellule>
          <Cellule aDroite>150 000</Cellule>
        </LigneTableau>
      </>,
    );
    const grilles = [...container.querySelectorAll<HTMLElement>("[style*='grid-template-columns']")]
      .map((n) => n.style.gridTemplateColumns)
      .filter(Boolean);
    // ⚠️ L'INVARIANT DE CE FICHIER. Deux grilles différentes mettent un montant
    // sous le libellé « Date », et le comptable lit de travers sans le voir.
    expect(grilles.length).toBeGreaterThanOrEqual(2);
    expect(new Set(grilles).size).toBe(1);
  });

  it("nomme chaque colonne dans l'en-tête", () => {
    render(<EnteteTableau colonnes={COLONNES} />);
    for (const colonne of COLONNES) {
      expect(screen.getByText(colonne.libelle)).toBeInTheDocument();
    }
  });

  it("aligne à droite ce qui se compare verticalement", () => {
    const { container } = render(<EnteteTableau colonnes={COLONNES} />);
    const cellules = container.querySelectorAll<HTMLElement>("[style*='text-align']");
    // § 5 : montants, dates et délais alignés à droite — c'est ce qui permet de
    // comparer deux nombres d'un coup d'œil dans une colonne.
    expect([...cellules].some((c) => c.style.textAlign === "right")).toBe(true);
  });
});

describe("L'état vide", () => {
  it("dit ce qu'il n'y a pas, et pourquoi", () => {
    render(<EtatVide titre="Aucune pièce en attente" detail="Tout est traité pour ce mois." />);
    // ⚠️ Un tableau vide sans mot se lit « la page est cassée ». Le titre dit
    // l'absence, le détail dit que c'est normal.
    expect(screen.getByText("Aucune pièce en attente")).toBeInTheDocument();
    expect(screen.getByText("Tout est traité pour ce mois.")).toBeInTheDocument();
  });

  it("se contente d'un titre quand il n'y a rien à ajouter", () => {
    render(<EtatVide titre="Aucun dossier" />);
    expect(screen.getByText("Aucun dossier")).toBeInTheDocument();
  });
});

describe("L'état d'erreur", () => {
  it("s'annonce comme une alerte, pour être lu sans qu'on le cherche", () => {
    const { container } = render(
      <EtatErreur titre="Lecture impossible" detail="Le dossier M081234567890P n'existe pas." />,
    );
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("porte le MOTIF réel, jamais « une erreur est survenue »", () => {
    render(
      <EtatErreur titre="Lecture impossible" detail="Le dossier M081234567890P n'existe pas." />,
    );
    // ⚠️ C'est la règle du produit : un motif lisible permet d'agir, un message
    // générique fait appeler le cabinet.
    expect(screen.getByText(/M081234567890P n'existe pas/)).toBeInTheDocument();
  });

  it("porte un glyphe en plus de la couleur", () => {
    render(<EtatErreur titre="Lecture impossible" detail="Motif." />);
    // Règle du § 9 : la couleur ne porte jamais seule l'information.
    expect(document.body.textContent).toContain("⬣");
  });
});

describe("Le panneau", () => {
  it("donne au tableau un titre de section relié à son contenu", () => {
    render(
      <Panneau titre="Écritures du mois">
        <p>contenu</p>
      </Panneau>,
    );
    expect(screen.getByText("Écritures du mois")).toBeInTheDocument();
    expect(screen.getByText("contenu")).toBeInTheDocument();
  });

  it("affiche l'aide à côté du titre, et non en infobulle", () => {
    render(
      <Panneau titre="Écritures" aide="Brouillons compris.">
        <p>contenu</p>
      </Panneau>,
    );
    // Une infobulle ne se lit ni au clavier, ni à l'impression, ni sur un
    // téléphone.
    expect(screen.getByText("Brouillons compris.")).toBeInTheDocument();
  });
});
