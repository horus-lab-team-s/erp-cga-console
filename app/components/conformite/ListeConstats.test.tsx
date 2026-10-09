import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Constat } from "@/app/lib/api";
import { ListeConstats } from "./ListeConstats";

/**
 * La liste des constats de conformité — § 8.2 du dossier de design.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA RÉFÉRENCE LÉGALE EST VISIBLE SUR CHAQUE CONSTAT. C'EST LA CONTRAINTE
 * FORTE DE LA FICHE, ET CE N'EST PAS DE LA DÉCORATION.
 *
 * C'est elle qui distingue cet outil d'un validateur de formulaire : quand un
 * adhérent mécontent demande « de quel droit refusez-vous ma facture ? », le
 * comptable lit l'article. Un constat sans fondement affiché rend le refus
 * indéfendable, et le cabinet cède.
 *
 * ⚠️ ET UNE RÈGLE NON CONFIRMÉE LE DIT. Le référentiel distingue une règle
 * confrontée au texte officiel d'une règle livrée mais pas encore validée par
 * le cabinet. Taire la différence ferait opposer à un adhérent une règle que
 * personne n'a vérifiée.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function constat(ajustements: Partial<Constat> = {}): Constat {
  return {
    code_regle: "TVA-DEDUCT-01",
    libelle: "TVA déduite sur une facture sans NIU du fournisseur",
    severite: "MAJEUR",
    categorie: "TVA",
    fondement: {
      texte: "Article 143 du Code général des impôts",
      source: "CGI 2026, édition officielle",
    },
    message: "Le fournisseur n'a pas porté son NIU sur la facture.",
    remediation: "Demander une facture rectificative portant le NIU du fournisseur.",
    consequence: {
      tva_deductible: false,
      charge_deductible: null,
      poste_reintegration: null,
      rectification_requise: true,
      verification_requise: false,
    },
    enjeu: "379350",
    regle_a_valider: false,
    ...ajustements,
  };
}

describe("La référence légale", () => {
  it("est visible sur le constat déplié, sans qu'on la cherche", async () => {
    render(<ListeConstats constats={[constat()]} />);
    // Le premier constat est déplié d'office : une facture porte un constat
    // dominant, et l'ouvrir à chaque fois est une friction pure.
    expect(screen.getByText(/Article 143 du Code général des impôts/)).toBeInTheDocument();
  });

  it("s'accompagne de sa source", () => {
    render(<ListeConstats constats={[constat()]} />);
    // ⚠️ Le texte dit QUEL article ; la source dit DE QUELLE ÉDITION. Sans
    // elle, on ne sait pas si l'article cité est celui de l'année en cours.
    expect(screen.getByText(/CGI 2026, édition officielle/)).toBeInTheDocument();
  });

  it("apparaît pour chaque constat qu'on déplie", async () => {
    const utilisateur = userEvent.setup();
    render(
      <ListeConstats
        constats={[
          constat(),
          constat({
            code_regle: "IS-CHARGE-07",
            libelle: "Charge non justifiée",
            fondement: { texte: "Article 8 du CGI", source: "CGI 2026" },
          }),
        ]}
      />,
    );

    // Le second est replié : sa référence n'est pas encore à l'écran.
    expect(screen.queryByText(/Article 8 du CGI/)).not.toBeInTheDocument();

    await utilisateur.click(screen.getByText("Charge non justifiée"));
    expect(screen.getByText(/Article 8 du CGI/)).toBeInTheDocument();
  });
});

describe("Le dépliage", () => {
  it("ouvre le premier constat d'office", () => {
    const { container } = render(<ListeConstats constats={[constat(), constat({ code_regle: "B" })]} />);
    const boutons = container.querySelectorAll("button[aria-expanded]");
    expect(boutons[0].getAttribute("aria-expanded")).toBe("true");
    expect(boutons[1].getAttribute("aria-expanded")).toBe("false");
  });

  it("se referme au second clic", async () => {
    const utilisateur = userEvent.setup();
    const { container } = render(<ListeConstats constats={[constat()]} />);
    const bouton = container.querySelector("button[aria-expanded]")!;

    await utilisateur.click(bouton);
    expect(bouton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Article 143/)).not.toBeInTheDocument();

    await utilisateur.click(bouton);
    expect(bouton.getAttribute("aria-expanded")).toBe("true");
  });

  it("n'ouvre pas les autres quand on en ouvre un", async () => {
    const utilisateur = userEvent.setup();
    const { container } = render(
      <ListeConstats constats={[constat(), constat({ code_regle: "B", libelle: "Deuxième" }), constat({ code_regle: "C", libelle: "Troisième" })]} />,
    );
    await utilisateur.click(screen.getByText("Deuxième"));
    const etats = [...container.querySelectorAll("button[aria-expanded]")].map((b) =>
      b.getAttribute("aria-expanded"),
    );
    // Ce n'est pas un accordéon exclusif : le comptable compare deux constats
    // côte à côte. Refermer le premier l'obligerait à faire des allers-retours.
    expect(etats).toEqual(["true", "true", "false"]);
  });
});

describe("Ce qui est annoncé en tête de ligne", () => {
  it("porte le glyphe ET le libellé de gravité, jamais la couleur seule", () => {
    render(<ListeConstats constats={[constat({ severite: "BLOQUANT" })]} />);
    // La règle du § 9 s'applique ici aussi : imprimé en noir et blanc, le
    // rapport doit rester lisible.
    expect(document.body.textContent).toContain("⬣");
    expect(screen.getByText(/Bloquant/)).toBeInTheDocument();
  });

  it("affiche le code de la règle, qu'on cite au téléphone", () => {
    render(<ListeConstats constats={[constat()]} />);
    expect(screen.getByText("TVA-DEDUCT-01")).toBeInTheDocument();
  });

  it("met l'enjeu chiffré en bout de ligne quand il y en a un", () => {
    render(<ListeConstats constats={[constat({ enjeu: "379350" })]} />);
    // ⚠️ Le montant en jeu est ce qui fait agir. « Anomalie majeure » se
    // survole ; « 379 350 FCFA » arrête le regard.
    // ⚠️ On lit le texte BRUT du document, et non `getByText` : la
    // bibliothèque normalise les blancs, et l'espace insécable étroite — celle
    // qui empêche un montant de se couper en fin de ligne — y devient une
    // espace ordinaire. Un cas écrit sur le texte normalisé ne verrait donc pas
    // le jour où l'espace fine disparaît.
    expect(document.body.textContent).toContain("379 350 FCFA");
  });

  it("se rabat sur la conséquence quand aucun montant n'est chiffrable", () => {
    render(
      <ListeConstats
        constats={[
          constat({
            enjeu: null,
            consequence: {
              tva_deductible: null,
              charge_deductible: null,
              poste_reintegration: null,
              rectification_requise: true,
              verification_requise: false,
            },
          }),
        ]}
      />,
    );
    expect(screen.getByText("Facture rectificative")).toBeInTheDocument();
  });

  it("dit « à vérifier » plutôt que rien, quand c'est le cas", () => {
    render(
      <ListeConstats
        constats={[
          constat({
            enjeu: null,
            consequence: {
              tva_deductible: null,
              charge_deductible: null,
              poste_reintegration: null,
              rectification_requise: false,
              verification_requise: true,
            },
          }),
        ]}
      />,
    );
    expect(screen.getByText("À vérifier")).toBeInTheDocument();
  });
});

describe("La conséquence dépliée", () => {
  it("énumère tous les effets, séparés lisiblement", () => {
    render(
      <ListeConstats
        constats={[
          constat({
            consequence: {
              tva_deductible: false,
              charge_deductible: false,
              poste_reintegration: null,
              rectification_requise: true,
              verification_requise: true,
            },
          }),
        ]}
      />,
    );
    const texte = document.body.textContent ?? "";
    expect(texte).toContain("TVA non déductible");
    expect(texte).toContain("charge non déductible");
    expect(texte).toContain("facture rectificative à demander");
    expect(texte).toContain("vérification avant comptabilisation");
  });

  it("dit explicitement quand il n'y a aucune conséquence automatique", () => {
    render(
      <ListeConstats
        constats={[
          constat({
            consequence: {
              tva_deductible: null,
              charge_deductible: null,
              poste_reintegration: null,
              rectification_requise: false,
              verification_requise: false,
            },
          }),
        ]}
      />,
    );
    // ⚠️ Un blanc se lit « on ne sait pas ». « Aucune conséquence automatique »
    // dit que le moteur a bien conclu, et que c'est au comptable de juger.
    expect(screen.getByText(/aucune conséquence automatique/)).toBeInTheDocument();
  });

  it("ne confond pas « non déductible » et « non renseigné »", () => {
    render(<ListeConstats constats={[constat({ consequence: { ...constat().consequence, tva_deductible: null } })]} />);
    // `null` = le moteur ne se prononce pas ; `false` = il refuse la déduction.
    // Les confondre ferait réintégrer une TVA parfaitement déductible.
    expect(document.body.textContent).not.toContain("TVA non déductible");
  });
});

describe("Une règle non encore confirmée", () => {
  it("le dit sur le constat", () => {
    render(<ListeConstats constats={[constat({ regle_a_valider: true })]} />);
    // ⚠️ Opposer à un adhérent une règle que personne n'a confrontée au texte
    // officiel est indéfendable. L'avertissement le rend impossible par
    // inadvertance.
    expect(screen.getByText(/non encore confirmée sur le texte officiel/)).toBeInTheDocument();
  });

  it("ne le dit pas sur une règle confirmée", () => {
    render(<ListeConstats constats={[constat({ regle_a_valider: false })]} />);
    expect(screen.queryByText(/non encore confirmée/)).not.toBeInTheDocument();
  });
});

describe("La liste vide", () => {
  it("ne rend rien du tout", () => {
    const { container } = render(<ListeConstats constats={[]} />);
    // ⚠️ Un cadre vide se lit « contrôle non fait ». L'absence de liste laisse
    // la place au bandeau de verdict, qui dit « conforme ».
    expect(container).toBeEmptyDOMElement();
  });
});
