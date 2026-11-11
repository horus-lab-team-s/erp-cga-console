import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { constaterLeRendezVous, fixerLAgenda, saisirUneDemandeAuCabinet } = await import("./actions-rendez-vous");
const { plagesDuJour, saisieDuJour } = await import("./rendez-vous-etats");

/** 9 novembre 2026 : l'agenda du responsable de la création, et la saisie au cabinet. */

function doublerFetch(reponse: unknown = {}, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(reponse), { status: statut, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}
const formulaire = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
};
const corpsDe = (f: ReturnType<typeof doublerFetch>) => JSON.parse(String((f.mock.calls[0][1] as RequestInit).body));
const VIDE = { echec: null, fait: null };

beforeEach(() => vi.unstubAllGlobals());

describe("L'agenda", () => {
  it("lit et réécrit les plages d'un jour", () => {
    const plages = plagesDuJour(1, "9h00-12:00, 14:00 - 16:00");
    expect(plages).toEqual([
      { jour: 1, debut: "09:00", fin: "12:00" },
      { jour: 1, debut: "14:00", fin: "16:00" },
    ]);
    expect(saisieDuJour(plages, 1)).toBe("09:00-12:00, 14:00-16:00");
    expect(() => plagesDuJour(0, "le matin")).toThrow("09:00-12:00");
  });

  it("envoie les plages, la durée, les modes cochés et les jours fermés", async () => {
    const f = doublerFetch({ agenda: {}, par_defaut: false });
    await fixerLAgenda(
      VIDE,
      formulaire({ jour_0: "09:00-12:00", duree_minutes: "60", mode_EN_LIGNE: "oui", jours_fermes: "2026-12-25" }),
    );
    expect(corpsDe(f)).toEqual({
      plages: [{ jour: 0, debut: "09:00", fin: "12:00" }],
      duree_minutes: 60,
      modes: ["EN_LIGNE"],
      jours_fermes: ["2026-12-25"],
    });
  });

  it("un constat manqué annonce la pénalité", async () => {
    doublerFetch({});
    const etat = await constaterLeRendezVous(VIDE, formulaire({ identifiant: "rdv-1", issue: "MANQUE" }));
    expect(etat.fait).toContain("pénalité");
  });
});

describe("La saisie au cabinet", () => {
  it("ne part pas sans l'accord du client", async () => {
    const f = doublerFetch();
    const etat = await saisirUneDemandeAuCabinet(
      { echec: null, reference: null },
      formulaire({ nom: "Ngono", telephone: "699445566" }),
    );
    expect(etat.echec).toContain("accepté");
    expect(f).not.toHaveBeenCalled();
  });

  it("rend la référence du dossier pour ouvrir la fiche", async () => {
    const f = doublerFetch({ reference: "dos-1", accuse: {} }, 201);
    const etat = await saisirUneDemandeAuCabinet(
      { echec: null, reference: null },
      formulaire({ nom: "Ngono", telephone: "699445566", accord: "oui", service: "CREATION" }),
    );
    expect(etat.reference).toBe("dos-1");
    expect(corpsDe(f)).toMatchObject({ nom: "Ngono", service_souhaite: "CREATION", consentement_whatsapp: false });
  });
});
