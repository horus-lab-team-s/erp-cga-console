import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { soumettreLaCloture } = await import("./actions-cloture");

/**
 * La clôture d'un exercice — le geste que le produit ne sait pas défaire.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ IL N'Y A PAS DE RÉOUVERTURE. Une clôture appliquée par erreur ne se
 * corrige pas depuis l'écran ; il faut une intervention en base. C'est la
 * définition même d'un geste qui mérite deux temps et une confirmation.
 *
 * Les cas ci-dessous gardent surtout **ce qui n'appelle pas** : un premier envoi
 * qui appliquerait au lieu de contrôler, ou une application sans confirmation,
 * sont des défauts dont on ne se relève pas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doublerFetch(reponse: unknown = { applique: false, possible: true }, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(reponse), {
      status: statut,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
}

const MOTIF =
  "Comptes arrêtés après revue du réviseur, points de contrôle levés le 25/09/2026.";
const VIDE = { echec: null, rapport: null, motif: "" };

beforeEach(() => vi.unstubAllGlobals());

describe("Ce qui est refusé avant tout appel", () => {
  it("refuse sans dossier ni exercice", async () => {
    const f = doublerFetch();
    const etat = await soumettreLaCloture(VIDE, formulaire({ dossier: "", exercice: "", motif: MOTIF }));
    expect(etat.echec).toContain("non désigné");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige un motif circonstancié, et dit à qui il servira", async () => {
    const f = doublerFetch();
    const etat = await soumettreLaCloture(
      VIDE,
      formulaire({ dossier: "M081234567890P", exercice: "2025", motif: "clôture" }),
    );
    // ⚠️ Le motif part au journal d'audit. Le message ne dit pas « trop court »,
    // il dit POURQUOI : un vérificateur demandera pourquoi cet exercice a été
    // arrêté ce jour-là, et « clôture » ne répondra pas.
    expect(etat.echec).toContain("vérificateur");
    expect(f).not.toHaveBeenCalled();
  });

  it("garde le motif saisi pour qu'il ne se retape pas", async () => {
    doublerFetch();
    const etat = await soumettreLaCloture(
      VIDE,
      formulaire({ dossier: "M081234567890P", exercice: "2025", motif: "trop court" }),
    );
    // Effacer un motif refusé obligerait à le réécrire en entier, et le second
    // jet est toujours plus pauvre que le premier.
    expect(etat.motif).toBe("trop court");
  });

  it("refuse d'APPLIQUER sans confirmation cochée", async () => {
    const f = doublerFetch();
    const etat = await soumettreLaCloture(
      VIDE,
      formulaire({
        dossier: "M081234567890P",
        exercice: "2025",
        motif: MOTIF,
        appliquer: "oui",
        confirmation: "non",
      }),
    );
    expect(etat.echec).toContain("ne se rouvre pas");
    // ⚠️ AUCUN APPEL. Un appel avec `appliquer=true` parti sans confirmation
    // clôt l'exercice : il n'y a pas de seconde chance.
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Les deux temps", () => {
  it("contrôle sans appliquer par défaut", async () => {
    const f = doublerFetch();
    await soumettreLaCloture(VIDE, formulaire({ dossier: "M081234567890P", exercice: "2025", motif: MOTIF }));
    // ⚠️ Le premier envoi ne porte JAMAIS `appliquer=true`. Le mode contrôle
    // rend le même rapport sans rien écrire.
    expect(String(f.mock.calls[0][0])).toContain("appliquer=false");
  });

  it("n'applique que sur demande explicite ET confirmation", async () => {
    const f = doublerFetch({ applique: true, possible: true });
    const etat = await soumettreLaCloture(
      VIDE,
      formulaire({
        dossier: "M081234567890P",
        exercice: "2025",
        motif: MOTIF,
        appliquer: "oui",
        confirmation: "oui",
      }),
    );
    expect(String(f.mock.calls[0][0])).toContain("appliquer=true");
    expect(etat.rapport).toMatchObject({ applique: true });
  });

  it("n'accepte pas une valeur approchante pour « appliquer »", async () => {
    const f = doublerFetch();
    // Seul « oui » applique. « true », « 1 », « OUI » ne sont pas le formulaire
    // du produit : les accepter multiplierait les chemins vers l'irréversible.
    for (const valeur of ["true", "1", "OUI", "yes"]) {
      vi.unstubAllGlobals();
      const doublure = doublerFetch();
      await soumettreLaCloture(
        VIDE,
        formulaire({ dossier: "D", exercice: "2025", motif: MOTIF, appliquer: valeur, confirmation: "oui" }),
      );
      expect(String(doublure.mock.calls[0][0]), `valeur « ${valeur} »`).toContain("appliquer=false");
    }
    expect(f).toBeDefined();
  });

  it("échappe le dossier et l'exercice dans l'adresse", async () => {
    const f = doublerFetch();
    await soumettreLaCloture(VIDE, formulaire({ dossier: "../audit", exercice: "2025", motif: MOTIF }));
    expect(String(f.mock.calls[0][0])).toContain("..%2Faudit");
  });
});

describe("Le rapport rendu", () => {
  it("rend un rapport NON appliqué sans le présenter comme un échec", async () => {
    // ⚠️ Le backend rejoue tous les obstacles au moment d'appliquer : un
    // brouillon saisi entre-temps rend un rapport non appliqué. Ce n'est pas
    // une erreur, c'est le résultat — et l'écran doit le montrer tel quel.
    doublerFetch({ applique: false, possible: false, obstacles: ["Un brouillon subsiste"] });
    const etat = await soumettreLaCloture(
      VIDE,
      formulaire({ dossier: "D", exercice: "2025", motif: MOTIF, appliquer: "oui", confirmation: "oui" }),
    );
    expect(etat.echec).toBeNull();
    expect(etat.rapport).toMatchObject({ applique: false, possible: false });
  });

  it("montre le refus du backend tel quel", async () => {
    doublerFetch({ detail: "Exercice déjà clos le 12/03/2026." }, 409);
    const etat = await soumettreLaCloture(
      VIDE,
      formulaire({ dossier: "D", exercice: "2025", motif: MOTIF }),
    );
    expect(etat.echec).toBe("Exercice déjà clos le 12/03/2026.");
    expect(etat.rapport).toBeNull();
    expect(etat.motif).toBe(MOTIF);
  });
});
