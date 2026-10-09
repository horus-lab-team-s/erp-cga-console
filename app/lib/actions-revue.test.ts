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

const {
  cloreLaRemarque,
  poserUneRemarque,
  renvoyerLeMois,
  repondreALaRemarque,
  retransmettreLeMois,
  transmettreUnMois,
  validerLeMois,
} = await import("./actions-revue");

/**
 * La revue mensuelle — les passages de relais entre comptable et réviseur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ C'EST UNE CHAÎNE, ET CHAQUE MAILLON CHANGE QUI TIENT LE DOSSIER.
 *
 * Le comptable transmet, le réviseur remarque, le comptable répond, le réviseur
 * clôt puis valide — ou renvoie. Un geste envoyé au mauvais endroit ne produit
 * pas d'erreur visible : il déplace simplement le dossier dans la file de
 * quelqu'un d'autre, et les deux attendent l'autre.
 *
 * ⚠️ LA PÉRIODE EST CALCULÉE À PARTIR DU MOIS CHOISI, et le dernier jour du
 * mois est le piège habituel : 28, 29, 30 ou 31 selon le mois ET l'année. Une
 * borne fausse d'un jour laisse une écriture hors de la revue — celle du 31,
 * précisément celle qu'on passe en fin de mois.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doublerFetch(reponse: unknown = { revue: { identifiant: "RV-001" } }, statut = 200) {
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

function corps(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const REVUE = { dossier: "M081234567890P", identifiant: "RV-001", rang: "2" };

beforeEach(() => {
  vi.unstubAllGlobals();
  rediriger.mockReset();
});

describe("Transmettre un mois", () => {
  it("refuse un mois qui n'a pas la forme d'un mois", async () => {
    const f = doublerFetch();
    // ⚠️ « 2026-13 », « 2026-00 » et « 2026-99 » PASSAIENT : le motif en place
    // n'exigeait que deux chiffres. Le mois sert ensuite à borner la période —
    // « 2026-00 » donnait du 2026-00-01 au 2025-12-31, période inversée, et
    // « 2026-99 » huit ans de revue. Trouvé en écrivant ce cas.
    for (const mois of ["", "2026", "août 2026", "2026-13", "2026-00", "2026-99", "2026-8"]) {
      const etat = await transmettreUnMois(VIDE, formulaire({ dossier: "D", mois }));
      expect(etat.echec, `mois « ${mois} »`).toBe("Choisissez le mois à transmettre.");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("borne la période du premier au dernier jour du mois", async () => {
    const f = doublerFetch();
    await expect(
      transmettreUnMois(VIDE, formulaire({ dossier: "D", mois: "2026-08" })),
    ).rejects.toThrow("REDIRECTION");
    expect(corps(f).du).toBe("2026-08-01");
    expect(corps(f).au).toBe("2026-08-31");
  });

  it("connaît les mois de 30 jours, février, et février bissextile", async () => {
    // ⚠️ Une borne fausse d'un jour laisse l'écriture du 31 hors de la revue —
    // précisément celle qu'on passe en fin de mois.
    for (const [mois, dernier] of [
      ["2026-04", "2026-04-30"],
      ["2026-02", "2026-02-28"],
      ["2028-02", "2028-02-29"],
      ["2026-12", "2026-12-31"],
    ] as const) {
      vi.unstubAllGlobals();
      const f = doublerFetch();
      await expect(
        transmettreUnMois(VIDE, formulaire({ dossier: "D", mois })),
      ).rejects.toThrow("REDIRECTION");
      expect(corps(f).au, `mois ${mois}`).toBe(dernier);
    }
  });

  it("mène directement à la revue créée", async () => {
    doublerFetch({ revue: { identifiant: "RV-0042" } });
    await expect(
      transmettreUnMois(VIDE, formulaire({ dossier: "M081234567890P", mois: "2026-08" })),
    ).rejects.toThrow("REDIRECTION");
    expect(rediriger).toHaveBeenCalledWith({
      href: "/comptabilite/revues/RV-0042?dossier=M081234567890P",
      locale: "fr",
    });
  });

  it("ne redirige pas quand le backend refuse la transmission", async () => {
    doublerFetch({ detail: "Un brouillon subsiste sur la période." }, 409);
    const etat = await transmettreUnMois(VIDE, formulaire({ dossier: "D", mois: "2026-08" }));
    expect(etat.echec).toContain("brouillon");
    expect(rediriger).not.toHaveBeenCalled();
  });

  it("envoie `null` plutôt qu'un message vide", async () => {
    const f = doublerFetch();
    await expect(
      transmettreUnMois(VIDE, formulaire({ dossier: "D", mois: "2026-08", message: "   " })),
    ).rejects.toThrow("REDIRECTION");
    expect(corps(f).message).toBeNull();
  });
});

describe("Les remarques du réviseur", () => {
  it("exige de dire ce qui ne va pas", async () => {
    const f = doublerFetch();
    // Une remarque vide renvoie le mois au comptable sans lui dire quoi
    // corriger : il rouvre le dossier, ne trouve rien, et retransmet.
    const etat = await poserUneRemarque(VIDE, formulaire({ ...REVUE, texte: "flou" }));
    expect(etat.echec).toContain("ce qui ne va pas");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige de dire ce qui a été fait pour répondre", async () => {
    const f = doublerFetch();
    const etat = await repondreALaRemarque(VIDE, formulaire({ ...REVUE, reponse: "fait" }));
    expect(etat.echec).toContain("ce qui a été fait");
    expect(f).not.toHaveBeenCalled();
  });

  it("vise la bonne remarque par son rang", async () => {
    const f = doublerFetch();
    await cloreLaRemarque(VIDE, formulaire(REVUE));
    expect(String(f.mock.calls[0][0])).toContain("/revues/RV-001/remarques/2/cloture");
  });
});

describe("Les passages de relais", () => {
  it("nomme à qui le dossier revient, à chaque geste", async () => {
    // ⚠️ « Enregistré » ne dit pas qui tient le dossier maintenant. Chacun de
    // ces messages nomme le destinataire, sans quoi les deux attendent l'autre.
    const attendus = [
      [renvoyerLeMois, "renvoi", "au comptable"],
      [retransmettreLeMois, "retransmission", "au réviseur"],
    ] as const;
    for (const [geste, chemin, destinataire] of attendus) {
      vi.unstubAllGlobals();
      const f = doublerFetch();
      const etat = await geste(VIDE, formulaire(REVUE));
      expect(etat.fait, chemin).toContain(destinataire);
      expect(String(f.mock.calls[0][0])).toContain(`/revues/RV-001/${chemin}`);
    }
  });

  it("valide le mois sans corps : il n'y a rien à dire de plus", async () => {
    const f = doublerFetch();
    const etat = await validerLeMois(VIDE, formulaire(REVUE));
    expect(etat.fait).toBe("Mois validé.");
    expect((f.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });

  it("échappe le dossier et l'identifiant dans les adresses", async () => {
    const f = doublerFetch();
    await validerLeMois(VIDE, formulaire({ ...REVUE, dossier: "../audit", identifiant: "../../x" }));
    const adresse = String(f.mock.calls[0][0]);
    expect(adresse).toContain("..%2Faudit");
    expect(adresse).toContain("..%2F..%2Fx");
  });

  it("montre le refus du domaine tel quel", async () => {
    doublerFetch({ detail: "Ce mois a déjà été validé." }, 409);
    const etat = await validerLeMois(VIDE, formulaire(REVUE));
    expect(etat.echec).toBe("Ce mois a déjà été validé.");
    expect(etat.fait).toBeNull();
  });
});
