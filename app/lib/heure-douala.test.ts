import { describe, expect, it } from "vitest";

import { depuisUtc, jourADouala, moisPrecedentADouala, versUtc } from "./heure-douala";

/**
 * L'heure saisie à Douala, rendue en UTC pour le backend.
 *
 * ⚠️ CE DÉCALAGE D'UNE HEURE A UN COÛT CONCRET. Le backend horodate tout en UTC
 * et refuse un dépôt « postérieur à maintenant ». Envoyer « 10:30 » tel quel,
 * saisi à Douala, fait refuser un dépôt effectué il y a vingt minutes : 10:30 à
 * Douala est 09:30 UTC.
 *
 * Le Cameroun est à UTC+1 toute l'année, sans heure d'été. Le décalage est donc
 * une constante, et ces cas la figent.
 */

describe("Le passage à l'heure UTC", () => {
  it("retire l'heure de décalage du Cameroun", () => {
    expect(versUtc("2026-09-24T10:30")).toBe("2026-09-24T09:30:00");
  });

  it("recule d'un jour quand la saisie est après minuit", () => {
    // ⚠️ Le cas qui casse une conversion écrite à la main : 00:30 à Douala est
    // 23:30 LA VEILLE en UTC. Une soustraction sur les seules heures rendrait
    // « 2026-09-24T-1:30 » ou garderait le mauvais jour.
    expect(versUtc("2026-09-24T00:30")).toBe("2026-09-23T23:30:00");
  });

  it("franchit un changement de mois", () => {
    expect(versUtc("2026-10-01T00:15")).toBe("2026-09-30T23:15:00");
  });

  it("franchit un changement d'année", () => {
    expect(versUtc("2027-01-01T00:00")).toBe("2026-12-31T23:00:00");
  });

  it("tient compte des années bissextiles", () => {
    // 2028 est bissextile : le 1er mars à 00:30 recule au 29 février.
    expect(versUtc("2028-03-01T00:30")).toBe("2028-02-29T23:30:00");
  });

  it("rend une forme sans fuseau, celle que le backend attend", () => {
    // Pas de « Z » final : le backend reçoit un horodatage nu qu'il interprète
    // en UTC. Un « Z » le ferait reconvertir une seconde fois.
    expect(versUtc("2026-09-24T10:30")).not.toMatch(/Z$/);
    expect(versUtc("2026-09-24T10:30")).toHaveLength(19);
  });
});

describe("La lecture d'un horodatage rendu par le backend", () => {
  it("ajoute l'heure de décalage du Cameroun", () => {
    // ⚠️ LE DÉFAUT TROUVÉ EN VÉRIFIANT L'ORDONNANCEUR. L'écran d'exploitation
    // affichait « 10:06 » à un exploitant dont la montre disait 11:07 : un
    // ordonnanceur dont le relais venait de passer deux secondes plus tôt
    // paraissait ARRÊTÉ DEPUIS UNE HEURE. La première réaction est la
    // mauvaise — on relance un service qui tourne.
    expect(depuisUtc("2026-09-25T10:06:59")).toBe("2026-09-25T11:06:59");
  });

  it("avance d'un jour quand l'heure UTC est celle du soir", () => {
    expect(depuisUtc("2026-09-24T23:30:00")).toBe("2026-09-25T00:30:00");
  });

  it("franchit un changement d'année", () => {
    expect(depuisUtc("2026-12-31T23:00:00")).toBe("2027-01-01T00:00:00");
  });

  it("fait l'aller-retour sans perdre une minute", () => {
    // La propriété qui compte : les deux fonctions sont bien réciproques. Une
    // dérive d'une heure dans un sens seulement se verrait à l'écran comme un
    // dépôt daté du futur.
    for (const local of ["2026-09-25T11:06", "2026-01-01T00:15", "2028-02-29T23:45"]) {
      expect(depuisUtc(versUtc(local))).toBe(`${local}:00`);
    }
  });

  it("accepte un horodatage qui porte déjà des fractions de seconde", () => {
    // Le backend rend parfois « 2026-09-19T20:09:43.214397 ».
    expect(depuisUtc("2026-09-19T20:09:43.214397")).toBe("2026-09-19T21:09:43");
  });

  it("rend la chaîne telle quelle plutôt que « Invalid Date »", () => {
    // Un horodatage illisible doit rester lisible à l'écran : « NaN/NaN/NaN »
    // dans une colonne de dernier passage fait appeler l'exploitant.
    expect(depuisUtc("pas une date")).toBe("pas une date");
  });
});

/** Un instant UTC précis, pour éprouver les bascules sans toucher à l'horloge. */
function instantUtc(iso: string): Date {
  return new Date(`${iso}Z`);
}

describe("Aujourd'hui, à Douala", () => {
  it("rend le jour courant en pleine journée", () => {
    expect(jourADouala(instantUtc("2026-09-25T09:00:00"))).toBe("2026-09-25");
  });

  it("est DÉJÀ demain quand il est 23 h à Douala… non : quand il est 23 h UTC", () => {
    // ⚠️ LE DÉFAUT. Ces pages sont des composants SERVEUR : elles tournent dans
    // le conteneur, en UTC. À 00 h 30 à Douala — 23 h 30 UTC la veille —
    // « aujourd'hui » valait LA VEILLE, et cette date part au backend comme
    // `a_la_date` : ce qui est échu, ce qui est en retard, quel exercice est
    // courant.
    expect(jourADouala(instantUtc("2026-09-25T23:30:00"))).toBe("2026-09-26");
  });

  it("bascule à 23 h UTC pile, et pas avant", () => {
    expect(jourADouala(instantUtc("2026-09-25T22:59:59"))).toBe("2026-09-25");
    expect(jourADouala(instantUtc("2026-09-25T23:00:00"))).toBe("2026-09-26");
  });

  it("franchit le mois et l'année", () => {
    expect(jourADouala(instantUtc("2026-09-30T23:10:00"))).toBe("2026-10-01");
    expect(jourADouala(instantUtc("2026-12-31T23:10:00"))).toBe("2027-01-01");
  });

  it("tient sur un 29 février", () => {
    expect(jourADouala(instantUtc("2028-02-28T23:30:00"))).toBe("2028-02-29");
    expect(jourADouala(instantUtc("2028-02-29T23:30:00"))).toBe("2028-03-01");
  });
});

describe("Le mois écoulé, à Douala", () => {
  it("rend le mois d'avant en pleine journée", () => {
    expect(moisPrecedentADouala(instantUtc("2026-09-25T09:00:00"))).toBe("2026-08");
  });

  it("ne recule PAS de deux mois au tout début du premier du mois", () => {
    // ⚠️ LE DÉFAUT LE PLUS COÛTEUX DE CETTE FAMILLE, et il était recopié dans
    // CINQ endroits. Le 1er octobre à 00 h 30 à Douala, c'est le 30 septembre
    // 23 h 30 en UTC : « le mois écoulé » calculé en UTC désignait AOÛT.
    //
    // C'est-à-dire le jour même où le cabinet ouvre la période déclarative de
    // septembre, la clôture, la relance des pièces et le rapport mensuel
    // proposaient tous le mois d'avant.
    expect(moisPrecedentADouala(instantUtc("2026-09-30T23:30:00"))).toBe("2026-09");
  });

  it("franchit l'année dans les deux sens", () => {
    expect(moisPrecedentADouala(instantUtc("2027-01-15T09:00:00"))).toBe("2026-12");
    expect(moisPrecedentADouala(instantUtc("2026-12-31T23:30:00"))).toBe("2026-12");
  });

  it("rend toujours un mois valide, sur les douze mois de l'année", () => {
    for (let mois = 1; mois <= 12; mois += 1) {
      const m = String(mois).padStart(2, "0");
      const rendu = moisPrecedentADouala(instantUtc(`2026-${m}-15T09:00:00`));
      expect(rendu, `mois ${m}`).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
  });
});
