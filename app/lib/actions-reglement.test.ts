import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { accorderLeMandat, fixerLaRegleDeDepassement, reviserLeTarif } = await import("./actions-reglement");

/** Le règlement des adhérents (18 octobre 2026) : ce qui part, et ce qui ne part pas. */

function doublerFetch(reponse: unknown = {}, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(reponse), { status: statut, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}
const formulaire = (champs: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) for (const x of [v].flat()) f.append(k, x);
  return f;
};
const appel = (f: ReturnType<typeof doublerFetch>) => f.mock.calls[0] as [string, RequestInit];
const VIDE = { echec: null, fait: null };
const MOTIF = "décision du gérant du 18 octobre";

beforeEach(() => vi.unstubAllGlobals());

describe("Le règlement", () => {
  it("ne part pas sans motif", async () => {
    const f = doublerFetch();
    const etat = await reviserLeTarif(VIDE, formulaire({ niu: "M1", montant: "60000", a_partir_du: "2026-11-01", motif: "court" }));
    expect(etat.echec).toContain("motif");
    expect(f).not.toHaveBeenCalled();
  });

  it("révise un tarif à partir d'une date, montant sans espaces", async () => {
    const f = doublerFetch();
    await reviserLeTarif(VIDE, formulaire({ niu: "M1", montant: "60 000", a_partir_du: "2026-11-01", motif: MOTIF }));
    const [url, init] = appel(f);
    expect(url).toContain("/souscription/honoraires/M1/contrat/revisions");
    expect(JSON.parse(init.body as string)).toEqual({ montant: "60000", a_partir_du: "2026-11-01", motif: MOTIF });
  });

  it("fixe la règle de dépassement par un PUT, bornée de 0 à 365 jours", async () => {
    expect((await fixerLaRegleDeDepassement(VIDE, formulaire({ delai_jours: "400", motif: MOTIF }))).echec).toContain("365");
    const f = doublerFetch();
    await fixerLaRegleDeDepassement(VIDE, formulaire({ delai_jours: "30", motif: MOTIF }));
    expect(appel(f)[1].method).toBe("PUT");
  });

  it("n'accorde pas un mandat sans obligation cochée", async () => {
    const f = doublerFetch();
    const etat = await accorderLeMandat(VIDE, formulaire({ niu: "M1", motif: MOTIF }));
    expect(etat.echec).toContain("obligation");
    expect(f).not.toHaveBeenCalled();
  });
});
