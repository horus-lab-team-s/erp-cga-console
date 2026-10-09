import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Les actions serveur sont doublées : ce fichier éprouve le FORMULAIRE, pas
// l'appel. Leur contenu est couvert par `actions-comptabilite.test.ts`.
vi.mock("@/app/lib/actions-comptabilite", () => ({
  saisirEcriture: vi.fn(async () => ({ echec: null, enregistree: null })),
  corrigerEcriture: vi.fn(async () => ({ echec: null, enregistree: null })),
}));

import type { Compte, Ecriture, Journal, LigneEcriture } from "@/app/lib/comptabilite";
import { FormulaireEcriture } from "./FormulaireEcriture";

/**
 * Le formulaire de saisie — l'outil principal du comptable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'ÉCART EST CALCULÉ À CHAQUE FRAPPE, ET ANNONCÉ EN ZONE VIVANTE.
 *
 * C'est ce qui remplace la bande de calculatrice posée à côté du clavier. Sans
 * lui, le comptable saisit huit lignes, envoie, et découvre le déséquilibre
 * dans un message d'erreur — puis relit ses huit lignes pour trouver le chiffre
 * fautif.
 *
 * `aria-live="polite"` fait annoncer le total par un lecteur d'écran sans
 * interrompre la frappe : un comptable aveugle entend « écart 10 000 au débit »
 * au moment où il l'introduit, et non dix lignes plus loin.
 *
 * ⚠️ LE TOTAL COMPTE CE QUE LE COMPTABLE A TAPÉ, y compris « 1 500,75 » avec
 * ses espaces et sa virgule. Un total qui ignorerait cette forme afficherait
 * « équilibrée » sur une écriture qui ne l'est pas — le pire des défauts ici,
 * parce qu'il rassure à tort.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Des données d'essai TYPÉES, sans `as` de complaisance.
 *
 * ⚠️ Un `as Journal[]` sur un objet approximatif compile, passe les cas, et
 * masque le jour où le contrat du backend change. Le compilateur a refusé ma
 * première version — un champ `libelle` là où le type dit `intitule` — et il
 * avait raison : l'écran lit `intitule`.
 */
const JOURNAUX: Journal[] = [
  { code: "ACH", intitule: "Achats", nature: "ACHAT", compte_contrepartie: "401000" },
  { code: "VTE", intitule: "Ventes", nature: "VENTE", compte_contrepartie: "411000" },
];

const COMPTES: Compte[] = [
  {
    numero: "601100",
    intitule: "Achats de matières",
    compte_reference: null,
    lettrable: false,
    rapprochable: false,
  },
  {
    numero: "401000",
    intitule: "Fournisseurs",
    compte_reference: null,
    lettrable: true,
    rapprochable: false,
  },
];

function ligne(
  compte: string,
  libelle: string,
  sens: LigneEcriture["sens"],
  montant: string,
): LigneEcriture {
  return { compte, libelle, sens, montant, tiers: null, lettrage: null, attribut_fiscal: null };
}

function ecriture(ajustements: Partial<Ecriture> = {}): Ecriture {
  return {
    exercice: "2026",
    journal: "ACH",
    numero: 42,
    date_operation: "2026-09-25",
    libelle: "Facture ALUCAM",
    piece_justificative: "FA-2026-001",
    reference_externe: null,
    lignes: [
      ligne("601100", "Achat", "DEBIT", "150000"),
      ligne("401000", "Fournisseur", "CREDIT", "150000"),
    ],
    etat: "BROUILLON",
    type: "ORDINAIRE",
    ecriture_contrepassee: null,
    motif_contrepassation: null,
    saisie_par: "l.fotso",
    validee_par: null,
    validee_le: null,
    ...ajustements,
  };
}

function rendre(props: Partial<Parameters<typeof FormulaireEcriture>[0]> = {}) {
  return render(
    <FormulaireEcriture
      dossier="M081234567890P"
      exercice="2026"
      journaux={JOURNAUX}
      comptes={COMPTES}
      aujourdHui="2026-09-25"
      {...props}
    />,
  );
}

/** Le bloc des totaux, celui que le lecteur d'écran annonce. */
function totaux(): HTMLElement {
  return document.querySelector('[aria-live="polite"]') as HTMLElement;
}

async function taper(champ: HTMLElement, valeur: string) {
  const utilisateur = userEvent.setup();
  await utilisateur.clear(champ);
  await utilisateur.type(champ, valeur);
}

beforeEach(() => vi.clearAllMocks());

describe("L'écart, calculé en direct", () => {
  it("s'annonce en zone vivante, pour être entendu sans interrompre la frappe", () => {
    rendre();
    // ⚠️ Sans `aria-live`, un comptable aveugle découvre le déséquilibre à
    // l'envoi, et doit relire ses huit lignes.
    expect(totaux()).not.toBeNull();
    expect(totaux().getAttribute("aria-live")).toBe("polite");
  });

  it("dit « équilibrée » sur un brouillon qui l'est", () => {
    rendre({ ecriture: ecriture() });
    expect(totaux().textContent).toContain("équilibrée");
  });

  it("nomme le côté où il manque, et non un simple « déséquilibre »", () => {
    // Débit 150 000, crédit 140 000 → il manque 10 000 AU CRÉDIT ; l'écart est
    // positif, donc annoncé « au débit » : c'est le débit qui pèse trop.
    rendre({
      ecriture: ecriture({
        lignes: [
          ligne("601100", "Achat", "DEBIT", "150000"),
          ligne("401000", "Fournisseur", "CREDIT", "140000"),
        ],
      }),
    });
    const texte = totaux().textContent ?? "";
    expect(texte).toContain("écart");
    expect(texte).toContain("au débit");
    // ⚠️ `toLocaleString("fr-FR")` emploie l'espace insécable ÉTROITE (U+202F),
    // la même que `ESPACE_FINE` du reste du produit. Les totaux du pied sont
    // donc cohérents avec les montants formatés ailleurs — et un cas écrit avec
    // une espace ordinaire ne les verrait pas.
    expect(texte).toContain("10 000");
  });

  it("bascule le côté annoncé quand c'est le crédit qui pèse trop", () => {
    rendre({
      ecriture: ecriture({
        lignes: [
          ligne("601100", "Achat", "DEBIT", "140000"),
          ligne("401000", "Fournisseur", "CREDIT", "150000"),
        ],
      }),
    });
    expect(totaux().textContent).toContain("au crédit");
  });

  it("se met à jour à la frappe, sans attendre l'envoi", async () => {
    rendre();
    // Les champs de montant sont du TEXTE, pas des `input[type=number]` : un
    // champ numérique refuse « 1 500,75 » et affiche des flèches inutiles sur
    // un montant en francs.
    const montants = Array.from(
      document.querySelectorAll('input[name^="montant-"]'),
    ) as HTMLElement[];

    await taper(montants[0], "150000");
    expect(totaux().textContent).toContain("150 000");
    // Une seule ligne saisie : l'écriture n'est pas équilibrée, et le pied le
    // dit tout de suite.
    expect(totaux().textContent).not.toContain("équilibrée");

    await taper(montants[1], "150000");
    const sens = document.querySelectorAll('select[name^="sens-"]');
    await userEvent.setup().selectOptions(sens[1] as HTMLElement, "CREDIT");
    expect(totaux().textContent).toContain("équilibrée");
  });

  it("compte un montant tapé à la française, espaces et virgule compris", async () => {
    rendre();
    const montants = Array.from(
      document.querySelectorAll('input[name^="montant-"]'),
    ) as HTMLElement[];

    await taper(montants[0], "1 500,75");

    // ⚠️ LE DÉFAUT QUI RASSURE À TORT. Un total qui ignorerait cette forme
    // compterait zéro, et afficherait « équilibrée » sur une écriture qui ne
    // l'est pas.
    expect(totaux().textContent).toContain("1 500,75");
  });

  it("ignore une saisie illisible plutôt que d'afficher NaN", async () => {
    rendre();
    const montants = Array.from(
      document.querySelectorAll('input[name^="montant-"]'),
    ) as HTMLElement[];
    await taper(montants[0], "abc");
    expect(totaux().textContent).not.toContain("NaN");
  });
});

describe("Les lignes offertes", () => {
  it("en offre huit d'emblée, sans attendre le script", () => {
    rendre();
    // ⚠️ Huit lignes offertes plutôt qu'un bouton « ajouter » : le formulaire
    // doit fonctionner AVANT que le script n'ait pris la main. Sur les
    // connexions visées, c'est la différence entre « je saisis » et « la page
    // ne fait rien ».
    expect(document.querySelectorAll('input[name^="compte-"]')).toHaveLength(8);
  });

  it("en offre autant qu'un brouillon en compte, quand il en a plus", () => {
    const longue = ecriture({
      lignes: Array.from({ length: 11 }, (_, rang) =>
        ligne("601100", `Ligne ${rang}`, "DEBIT", "1000"),
      ),
    });
    rendre({ ecriture: longue });
    // Une reprise ou une paie dépasse huit lignes : en offrir huit ferait
    // perdre les suivantes à la correction.
    expect(document.querySelectorAll('input[name^="compte-"]')).toHaveLength(11);
  });

  it("annonce au serveur combien de lignes il a offertes", () => {
    rendre();
    const champ = document.querySelector('input[name="lignes_offertes"]') as HTMLInputElement;
    // ⚠️ L'action serveur lit ce nombre pour savoir jusqu'où chercher. Un écart
    // entre les deux ferait perdre les dernières lignes en silence.
    expect(champ.value).toBe("8");
  });
});

describe("Corriger un brouillon", () => {
  it("porte la clé de l'écriture, pour ne pas en créer une seconde", () => {
    rendre({ ecriture: ecriture() });
    const cle = document.querySelector('input[name="cle"]') as HTMLInputElement;
    expect(cle.value).toBe("2026/ACH/42");
  });

  it("n'en porte aucune sur une saisie neuve", () => {
    rendre();
    expect(document.querySelector('input[name="cle"]')).toBeNull();
  });

  it("dit qu'on corrige, et non qu'on enregistre", () => {
    rendre({ ecriture: ecriture() });
    expect(screen.getByRole("button", { name: /correction/i })).toBeInTheDocument();
  });

  it("reprend les lignes du brouillon", () => {
    rendre({ ecriture: ecriture() });
    const comptes = Array.from(
      document.querySelectorAll('input[name^="compte-"]'),
    ) as HTMLInputElement[];
    expect(comptes[0].value).toBe("601100");
    expect(comptes[1].value).toBe("401000");
  });
});

describe("Dupliquer une écriture", () => {
  it("prévient que la pièce justificative n'est PAS reprise", () => {
    rendre({ modele: ecriture() });
    // ⚠️ Reprendre le numéro de pièce d'une autre écriture le rattacherait à
    // deux opérations différentes. Le taire ferait enregistrer une écriture
    // sans pièce sans que personne ne le remarque.
    expect(screen.getByText(/n’est pas reprise|n'est pas reprise/)).toBeInTheDocument();
  });

  it("ne porte pas de clé : c'est une écriture NEUVE", () => {
    rendre({ modele: ecriture() });
    expect(document.querySelector('input[name="cle"]')).toBeNull();
  });

  it("propose d'enregistrer en brouillon, pas de corriger", () => {
    rendre({ modele: ecriture() });
    expect(screen.getByRole("button", { name: /brouillon/i })).toBeInTheDocument();
  });
});

describe("Ce qui part au serveur sans que l'utilisateur le voie", () => {
  it("porte le dossier et l'exercice en champs cachés", () => {
    rendre();
    expect((document.querySelector('input[name="dossier"]') as HTMLInputElement).value).toBe(
      "M081234567890P",
    );
    expect((document.querySelector('input[name="exercice"]') as HTMLInputElement).value).toBe("2026");
  });
});
