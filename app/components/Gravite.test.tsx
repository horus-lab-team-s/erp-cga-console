import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { APPARENCE, BadgeGravite, BandeauVerdict, type Severite } from "./Gravite";

/**
 * Le système de gravité — § 9 du dossier de design.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA RÈGLE QUE CES CAS GARDENT : LA COULEUR NE PORTE JAMAIS SEULE
 * L'INFORMATION.
 *
 * Elle n'est pas décorative. Un comptable daltonien — environ un homme sur
 * douze — ne distingue pas le rouge « bloquant » de l'orange « majeur ». Un
 * rapport de conformité imprimé en noir et blanc, ce qui arrive à chaque
 * contrôle, perd toute couleur. Dans les deux cas, le glyphe et le libellé sont
 * la SEULE information qui reste.
 *
 * C'est aussi une règle qu'on enfreint sans y penser : « la pastille suffit, on
 * gagne de la place dans le tableau ». Ces cas la rendent coûteuse à enfreindre.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SEVERITES = Object.keys(APPARENCE) as Severite[];

describe("La pastille de gravité", () => {
  it.each(SEVERITES)("porte un glyphe ET un libellé pour « %s »", (severite) => {
    render(<BadgeGravite severite={severite} />);
    const a = APPARENCE[severite];

    // Le libellé, lisible sans couleur.
    expect(screen.getByText(a.libelle, { exact: false })).toBeInTheDocument();
    // Le glyphe, visible à l'impression.
    expect(document.body.textContent).toContain(a.glyphe);
  });

  it("garde le glyphe dans la forme abrégée des colonnes étroites", () => {
    render(<BadgeGravite severite="AVERTISSEMENT" court />);

    // ⚠️ Abréger le libellé est permis — « Avertis. » tient dans une colonne.
    // Retirer le glyphe ne l'est pas : c'est lui qui survit à l'impression.
    expect(document.body.textContent).toContain(APPARENCE.AVERTISSEMENT.glyphe);
    expect(screen.getByText("Avertis.", { exact: false })).toBeInTheDocument();
  });

  it("cache le glyphe aux lecteurs d'écran, qui lisent déjà le libellé", () => {
    const { container } = render(<BadgeGravite severite="BLOQUANT" />);

    // ⚠️ Sans `aria-hidden`, un lecteur d'écran annonce « hexagone noir
    // Bloquant » : le nom Unicode du caractère, puis le mot. Le glyphe est là
    // pour les yeux, le libellé pour la voix.
    const glyphe = container.querySelector('[aria-hidden="true"]');
    expect(glyphe).not.toBeNull();
    expect(glyphe!.textContent).toBe(APPARENCE.BLOQUANT.glyphe);
  });
});

describe("Les cinq niveaux", () => {
  it("se distinguent par leur glyphe, pas seulement par leur couleur", () => {
    const glyphes = SEVERITES.map((s) => APPARENCE[s].glyphe);
    // Deux niveaux au même glyphe seraient indiscernables en noir et blanc.
    expect(new Set(glyphes).size).toBe(glyphes.length);
  });

  it("se distinguent par leur libellé, en toutes lettres et en abrégé", () => {
    const libelles = SEVERITES.map((s) => APPARENCE[s].libelle);
    const courts = SEVERITES.map((s) => APPARENCE[s].libelleCourt);
    expect(new Set(libelles).size).toBe(libelles.length);
    expect(new Set(courts).size).toBe(courts.length);
  });

  it("n'affichent jamais le code technique", () => {
    for (const severite of SEVERITES) {
      expect(APPARENCE[severite].libelle).not.toBe(severite);
    }
  });

  it("comprennent « conforme », qui n'est pas une gravité mais s'affiche pareil", () => {
    // Un contrôle sans anomalie doit dire quelque chose. Une pastille absente
    // se lit « contrôle non fait », pas « tout va bien ».
    expect(SEVERITES).toContain("CONFORME");
    expect(APPARENCE.CONFORME.glyphe).toBe("✓");
  });
});

describe("Le bandeau de verdict", () => {
  it("s'annonce comme un état, pour être lu sans qu'on le cherche", () => {
    const { container } = render(
      <BandeauVerdict
        severite="MAJEUR"
        titre="Anomalie majeure"
        detail="TVA non déductible : 379 350 FCFA"
      />,
    );

    // ⚠️ `role="status"` fait annoncer le verdict par un lecteur d'écran dès
    // qu'il apparaît. Sans lui, le comptable aveugle doit deviner qu'un
    // bandeau vient de s'afficher en haut de page.
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it("annonce la gravité ET la conséquence chiffrée", () => {
    render(
      <BandeauVerdict
        severite="MAJEUR"
        titre="Anomalie majeure"
        detail="TVA non déductible : 379 350 FCFA"
      />,
    );

    // C'est le premier élément que lit le comptable : le montant en jeu doit y
    // être, pas seulement le mot « majeur ».
    expect(screen.getByText("Anomalie majeure")).toBeInTheDocument();
    expect(screen.getByText(/379 350 FCFA/)).toBeInTheDocument();
  });

  it("écrit en blanc sur les deux fonds pleins, et en encre sur les fonds clairs", () => {
    for (const severite of ["BLOQUANT", "MAJEUR"] as const) {
      const { container, unmount } = render(
        <BandeauVerdict severite={severite} titre="t" detail="d" />,
      );
      expect(
        (container.firstChild as HTMLElement).style.color,
        `gravité ${severite}`,
      ).toBe("rgb(255, 255, 255)");
      unmount();
    }

    // ⚠️ Du blanc sur `--warning-100`, qui est un fond très clair, serait
    // illisible. L'encre foncée est ce qui garde le contraste.
    const { container } = render(
      <BandeauVerdict severite="AVERTISSEMENT" titre="t" detail="d" />,
    );
    expect((container.firstChild as HTMLElement).style.color).toBe("var(--ink-900)");
  });
});
