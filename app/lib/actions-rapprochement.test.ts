import { beforeEach, describe, expect, it, vi } from "vitest";

const rediriger = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/i18n/navigation", () => ({
  redirect: (cible: unknown) => {
    rediriger(cible);
    throw new Error("REDIRECTION");
  },
}));

const { abandonnerLeReleve, importerUnReleve, justifierLaLigne } = await import(
  "./actions-rapprochement"
);

/**
 * Le rapprochement bancaire — confronter le relevé de la banque aux écritures.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LES SOLDES SONT RECOPIÉS À LA MAIN, DEPUIS UN RELEVÉ PAPIER OU PDF.
 *
 * C'est délibéré : ils servent de **contrôle** sur le fichier importé. Si le
 * fichier ne mène pas du solde initial au solde final, quelque chose manque —
 * une ligne tronquée à l'export, une période mal choisie. Le contrôle ne vaut
 * que si la saisie est fidèle, d'où le soin mis à accepter la forme que le
 * comptable a sous les yeux : « 4 031 500 », « -18 500 » pour un découvert.
 *
 * ⚠️ UN SOLDE NÉGATIF EST NORMAL. Le refuser rendrait l'écran inutilisable sur
 * tout compte en découvert, c'est-à-dire sur une bonne part des dossiers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doublerFetch(reponse: unknown = {}, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(reponse), {
      status: statut,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

function fichier(octets = 512, nom = "releve.csv"): File {
  return new File([new Uint8Array(octets)], nom, { type: "text/csv" });
}

function formulaire(champs: Record<string, string | File>): FormData {
  const f = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) {
    if (valeur instanceof File) f.append(cle, valeur, valeur.name);
    else f.append(cle, valeur);
  }
  return f;
}

function corps(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const RELEVE = {
  dossier: "M081234567890P",
  fichier: fichier(),
  solde_initial: "4 031 500",
  solde_final: "3 890 000",
  journal: "BQ",
  du: "2026-08-01",
  au: "2026-08-31",
  profil: "AFRILAND",
};
const VUE = { rapprochement: { identifiant: "R-0012" } };

beforeEach(() => {
  vi.unstubAllGlobals();
  rediriger.mockReset();
});

describe("Importer un relevé", () => {
  it("refuse sans fichier, ou avec un fichier vide", async () => {
    const f = doublerFetch();
    for (const taille of [null, 0]) {
      const donnees = formulaire({ ...RELEVE, fichier: fichier(1) });
      donnees.delete("fichier");
      if (taille === 0) donnees.append("fichier", fichier(0), "vide.csv");
      const etat = await importerUnReleve(VIDE, donnees);
      expect(etat.echec).toContain("exporté par la banque");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("accepte les soldes écrits avec les espaces des milliers", async () => {
    const f = doublerFetch(VUE);
    await expect(importerUnReleve(VIDE, formulaire(RELEVE))).rejects.toThrow("REDIRECTION");
    expect(corps(f).solde_initial).toBe("4031500");
    expect(corps(f).solde_final).toBe("3890000");
  });

  it("accepte un solde négatif : un découvert est un état normal", async () => {
    const f = doublerFetch(VUE);
    // ⚠️ Refuser le négatif rendrait l'écran inutilisable sur tout compte en
    // découvert, c'est-à-dire sur une bonne part des dossiers du cabinet.
    await expect(
      importerUnReleve(VIDE, formulaire({ ...RELEVE, solde_final: "-18 500" })),
    ).rejects.toThrow("REDIRECTION");
    expect(corps(f).solde_final).toBe("-18500");
  });

  it("accepte « ,00 » et le retire, parce qu'un relevé l'imprime", async () => {
    const f = doublerFetch(VUE);
    await expect(
      importerUnReleve(VIDE, formulaire({ ...RELEVE, solde_initial: "4 031 500,00" })),
    ).rejects.toThrow("REDIRECTION");
    expect(corps(f).solde_initial).toBe("4031500");
  });

  it("refuse des centimes réels, qui n'existent pas en francs CFA", async () => {
    const f = doublerFetch();
    for (const solde of ["4031500,75", "quatre millions", "", "4 031 500 F"]) {
      const etat = await importerUnReleve(VIDE, formulaire({ ...RELEVE, solde_final: solde }));
      expect(etat.echec, `solde « ${solde} »`).toContain("sans centimes");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("envoie le fichier en base64, octets intacts", async () => {
    const f = doublerFetch(VUE);
    const octets = new Uint8Array([0xe9, 0x00, 0xff, 0x41]); // du cp1252, un nul, un octet haut
    const donnees = formulaire({ ...RELEVE });
    donnees.delete("fichier");
    donnees.append("fichier", new File([octets], "releve.csv"), "releve.csv");

    await expect(importerUnReleve(VIDE, donnees)).rejects.toThrow("REDIRECTION");

    // ⚠️ Un relevé de banque camerounaise est souvent en cp1252. Le décoder en
    // texte abîmerait chaque accent, et le comptable ne le verrait qu'au
    // rapprochement, sur des libellés devenus illisibles.
    const rendu = Buffer.from(corps(f).fichier_base64, "base64");
    expect(Array.from(rendu)).toEqual(Array.from(octets));
  });

  it("mène directement au rapprochement créé", async () => {
    doublerFetch(VUE);
    await expect(importerUnReleve(VIDE, formulaire(RELEVE))).rejects.toThrow("REDIRECTION");
    expect(rediriger).toHaveBeenCalledWith({
      href: "/comptabilite/rapprochement/R-0012?dossier=M081234567890P",
      locale: "fr",
    });
  });

  it("ne redirige pas quand le backend refuse le relevé", async () => {
    doublerFetch({ detail: "Le fichier ne correspond pas au profil AFRILAND." }, 422);
    const etat = await importerUnReleve(VIDE, formulaire(RELEVE));
    expect(etat.echec).toContain("profil AFRILAND");
    expect(rediriger).not.toHaveBeenCalled();
  });

  it("retombe sur le journal de banque à défaut", async () => {
    const f = doublerFetch(VUE);
    const donnees = formulaire(RELEVE);
    donnees.delete("journal");
    await expect(importerUnReleve(VIDE, donnees)).rejects.toThrow("REDIRECTION");
    expect(corps(f).journal).toBe("BQ");
  });
});

describe("Justifier une ligne restée seule", () => {
  it("exige une explication, qui se relit à la révision", async () => {
    const f = doublerFetch();
    const etat = await justifierLaLigne(
      VIDE,
      formulaire({ identifiant: "R-0012", ligne: "3", motif: "ok" }),
    );
    // ⚠️ Une ligne justifiée sort du rapprochement : elle cesse d'apparaître
    // comme un écart. Le réviseur relit ce motif, et « ok » ne lui apprend rien.
    expect(etat.echec).toContain("se relit à la révision");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Abandonner un relevé", () => {
  it("exige de dire pourquoi", async () => {
    const f = doublerFetch();
    const etat = await abandonnerLeReleve(VIDE, formulaire({ identifiant: "R-0012", motif: "non" }));
    expect(etat.echec).toContain("10 caractères au moins");
    expect(f).not.toHaveBeenCalled();
  });
});
