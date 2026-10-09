import { describe, expect, it } from "vitest";

import {
  dateCourte,
  dateLongue,
  ESPACE_FINE,
  montant,
  montantFcfa,
  periode,
  taux,
} from "./formats";

/**
 * Les formats de restitution — § 4 du dossier de design.
 *
 * ⚠️ CE FICHIER EST LE MIROIR DE `app/partage/formats.py`. Les deux doivent
 * rendre la même chose : un montant écrit « 2 350 000 » par le serveur et
 * « 2350000 » par la page, dans le MÊME écran, est un défaut que le client voit
 * avant nous. Ces cas figent la forme de ce côté-ci ; ceux du serveur figent
 * l'autre.
 */

describe("Les montants", () => {
  it("se groupent par trois avec une espace insécable étroite", () => {
    // ⚠️ U+202F, pas une espace ordinaire : une espace ordinaire laisse « 2 350
    // 000 » se couper en fin de ligne, et le montant devient illisible.
    expect(montant(2_350_000)).toBe(`2${ESPACE_FINE}350${ESPACE_FINE}000`);
    expect(ESPACE_FINE).toBe(" ");
  });

  it("mettent le négatif entre parenthèses, jamais un signe moins", () => {
    // La convention comptable. Un « -450 000 » dans une colonne de débits se
    // lit de travers ; les parenthèses sont ce que le comptable attend.
    expect(montant(-450_000)).toBe(`(450${ESPACE_FINE}000)`);
  });

  it("n'affichent aucune décimale, le franc CFA n'en ayant pas", () => {
    expect(montant(1500.49)).toBe(`1${ESPACE_FINE}500`);
    expect(montant(1500.5)).toBe(`1${ESPACE_FINE}501`);
  });

  it("acceptent une chaîne, parce que le backend rend les montants en décimal", () => {
    // ⚠️ Les montants voyagent en CHAÎNE dans le JSON : un flottant perdrait
    // des centimes sur les grands nombres. Le format doit donc l'accepter.
    expect(montant("2350000")).toBe(`2${ESPACE_FINE}350${ESPACE_FINE}000`);
  });

  it("rendent un tiret plutôt que « NaN » sur une valeur illisible", () => {
    // « NaN FCFA » dans une colonne de totaux fait appeler le cabinet.
    expect(montant("inconnu")).toBe("–");
  });

  it("ne confondent jamais « absent » et « zéro »", () => {
    // ⚠️ LE DÉFAUT TROUVÉ EN ÉCRIVANT CE FICHIER. `Number("")` vaut ZÉRO : un
    // montant absent s'affichait « 0 », c'est-à-dire « rien à payer » pour qui
    // lit la colonne, alors que la vérité est « on ne sait pas ». Et
    // `montant("inconnu")` rendait bien « — » : les deux absences ne se
    // comportaient pas pareil, et seule la plus dangereuse passait.
    expect(montant("")).toBe("–");
    expect(montant("   ")).toBe("–");
    expect(montantFcfa("")).toBe("–");
    // Un vrai zéro reste un zéro : un solde soldé n'est pas un solde inconnu.
    expect(montant(0)).toBe("0");
    expect(montant("0")).toBe("0");
  });

  it("collent la devise avec la même espace insécable", () => {
    expect(montantFcfa(2_350_000)).toBe(`2${ESPACE_FINE}350${ESPACE_FINE}000${ESPACE_FINE}FCFA`);
  });
});

describe("Les taux", () => {
  it("emploient la virgule décimale", () => {
    expect(taux(19.25)).toBe(`19,25${ESPACE_FINE}%`);
  });

  it("ôtent les zéros inutiles", () => {
    // « 19,25 % » et « 20 % », pas « 20,00 % » : le zéro superflu donne
    // l'impression d'une précision qui n'existe pas.
    expect(taux(20)).toBe(`20${ESPACE_FINE}%`);
    expect(taux(20.5)).toBe(`20,5${ESPACE_FINE}%`);
    expect(taux(0)).toBe(`0${ESPACE_FINE}%`);
  });

  it("distinguent un taux absent d'un taux nul", () => {
    // Même piège que sur les montants : « 0 % » est une exonération, « — » est
    // un taux qu'on n'a pas.
    expect(taux("")).toBe("–");
    expect(taux(0)).toBe(`0${ESPACE_FINE}%`);
  });
});

describe("Les dates", () => {
  it("s'écrivent en toutes lettres, en français", () => {
    expect(dateLongue("2026-08-15")).toBe("15 août 2026");
    expect(dateCourte("2026-08-15")).toBe("15/08/2026");
    expect(periode("2026-07-01")).toBe("juillet 2026");
  });

  it("complètent le jour à deux chiffres dans la forme compacte", () => {
    // Sans cela, une colonne de dates ne s'aligne pas et se lit mal.
    expect(dateCourte("2026-08-05")).toBe("05/08/2026");
  });

  it("acceptent une date-heure et n'en gardent que le jour", () => {
    // ⚠️ LE DÉFAUT DU PAS 87. Les trois fonctions ajoutaient « T00:00:00 » à la
    // chaîne reçue : une date-heure devenait « …T09:00:00T00:00:00 », invalide,
    // et l'écran affichait « le NaN/NaN/NaN » sous l'accusé d'un dépôt de TVA.
    expect(dateLongue("2026-02-12T09:00:00")).toBe("12 février 2026");
    expect(dateCourte("2026-02-12T09:00:00")).toBe("12/02/2026");
    expect(periode("2026-02-12T09:00:00")).toBe("février 2026");
  });

  it("acceptent un objet Date", () => {
    expect(dateLongue(new Date(2026, 11, 31))).toBe("31 décembre 2026");
  });

  it("nomment les douze mois sans faute", () => {
    const attendus = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ];
    for (const [index, nom] of attendus.entries()) {
      expect(periode(new Date(2026, index, 1))).toBe(`${nom} 2026`);
    }
  });
});

describe("Le jour d'un instant, lu à Douala", () => {
  it("ne touche pas à une date de calendrier", () => {
    // ⚠️ « 2026-08-15 » est une ÉCHÉANCE, pas un instant. Le 15 août est le 15
    // août partout ; lui appliquer un décalage la ferait glisser d'un jour.
    expect(dateCourte("2026-08-15")).toBe("15/08/2026");
    expect(dateLongue("2026-08-15")).toBe("15 août 2026");
  });

  it("garde le même jour quand l'instant est en pleine journée", () => {
    // 09:00 UTC = 10:00 à Douala : même jour.
    expect(dateCourte("2026-08-15T09:00:00")).toBe("15/08/2026");
  });

  it("passe au lendemain pour un instant de fin de soirée UTC", () => {
    // ⚠️ LE DÉFAUT. 23:30 UTC, c'est 00:30 le LENDEMAIN à Douala. L'interface
    // affichait la veille — et le contrat du serveur lui confiait pourtant
    // explicitement la conversion (`app/partage/horloge.py`).
    //
    // Sur un accusé de dépôt, un jour faux n'est pas un détail de présentation :
    // c'est la preuve qu'on a déposé à temps.
    expect(dateCourte("2026-08-15T23:30:00")).toBe("16/08/2026");
    expect(dateLongue("2026-08-15T23:30:00")).toBe("16 août 2026");
  });

  it("franchit le mois et l'année sur cette même limite", () => {
    expect(dateCourte("2026-08-31T23:45:00")).toBe("01/09/2026");
    expect(dateCourte("2026-12-31T23:59:00")).toBe("01/01/2027");
    expect(periode("2026-12-31T23:59:00")).toBe("janvier 2027");
  });

  it("tient à 23:00 pile, la seconde où le jour bascule", () => {
    expect(dateCourte("2026-08-15T22:59:59")).toBe("15/08/2026");
    expect(dateCourte("2026-08-15T23:00:00")).toBe("16/08/2026");
  });

  it("accepte les fractions de seconde que rend le journal d'audit", () => {
    expect(dateCourte("2026-09-19T20:09:43.214397")).toBe("19/09/2026");
    expect(dateCourte("2026-09-19T23:09:43.214397")).toBe("20/09/2026");
  });

  it("rend un tiret plutôt que « NaN/NaN/NaN » sur une valeur illisible", () => {
    // ⚠️ Défaut préexistant, trouvé en écrivant ce cas. « le NaN/NaN/NaN » sous
    // un accusé de dépôt fait appeler le cabinet. Même règle que les montants
    // absents : le tiret se lit « on ne sait pas ».
    expect(dateCourte("pas une date")).toBe("–");
    expect(dateLongue("")).toBe("–");
    expect(periode("2026-13-45")).toBe("–");
  });
});
