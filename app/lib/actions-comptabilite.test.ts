import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "jeton" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saisirEcriture } = await import("./actions-comptabilite");

/**
 * La saisie d'une écriture comptable, éprouvée sur ce qu'elle refuse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE QUI EST VÉRIFIÉ ICI, ET CE QUI NE L'EST PAS
 *
 * L'ÉQUILIBRE N'EST PAS VÉRIFIÉ ICI, et c'est délibéré — le fichier le dit :
 * l'équilibre, l'existence des comptes et l'ouverture de l'exercice
 * appartiennent au backend, seul à pouvoir les dire et seul dont la réponse
 * engage. Recopier une règle métier ici en produirait une seconde version, qui
 * divergerait.
 *
 * Ce qui se vérifie ici, c'est la **mise en forme** : quelles lignes du
 * formulaire deviennent des lignes d'écriture, et sous quelle forme les
 * montants partent. Un montant mal normalisé — « 1 500,75 » envoyé tel quel —
 * est refusé par le backend avec un message de validation que le comptable ne
 * comprend pas, alors qu'il a saisi exactement ce qu'on lui a appris à saisir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doublerFetch(reponse: unknown = { numero: 1 }, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(reponse), {
      status: statut,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

/** Un formulaire complet, auquel chaque cas retire ou change une chose. */
function formulaire(ajustements: Record<string, string> = {}): FormData {
  const f = new FormData();
  const base: Record<string, string> = {
    dossier: "M081234567890P",
    exercice: "2026",
    journal: "ACH",
    date_operation: "2026-09-25",
    libelle: "Facture fournisseur ALUCAM",
    "compte-0": "601100",
    "libelle-0": "Achat de matières",
    "sens-0": "DEBIT",
    "montant-0": "150000",
    "compte-1": "401000",
    "libelle-1": "Fournisseur ALUCAM",
    "sens-1": "CREDIT",
    "montant-1": "150000",
  };
  for (const [k, v] of Object.entries({ ...base, ...ajustements })) {
    if (v !== "\u0000") f.append(k, v);
  }
  return f;
}
/** Marqueur : ce champ doit être ABSENT du formulaire. */
const ABSENT = "\u0000";

function corpsEnvoye(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("Ce qui est refusé avant tout appel", () => {
  it("refuse une écriture sans date d'opération", async () => {
    const f = doublerFetch();
    const etat = await saisirEcriture({ echec: null, enregistree: null }, formulaire({ date_operation: "" }));
    expect(etat.echec).toBe("Renseigner la date de l'opération.");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une écriture sans libellé, en disant pourquoi il compte", async () => {
    const f = doublerFetch();
    const etat = await saisirEcriture({ echec: null, enregistree: null }, formulaire({ libelle: "" }));
    // Le message explique l'enjeu plutôt que de nommer un champ : c'est ce
    // qu'un vérificateur lit en premier.
    expect(etat.echec).toContain("vérificateur");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une écriture à une seule ligne", async () => {
    const f = doublerFetch();
    const etat = await saisirEcriture(
      { echec: null, enregistree: null },
      formulaire({ "compte-1": "", "montant-1": "", "libelle-1": "" }),
    );
    expect(etat.echec).toContain("au moins deux lignes");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une ligne commencée mais incomplète", async () => {
    const f = doublerFetch();
    // ⚠️ Un compte saisi sans montant est une ligne OUBLIÉE, pas une ligne
    // vide. La laisser passer enverrait une écriture amputée que le backend
    // refuserait avec un message de schéma, illisible pour le comptable.
    const etat = await saisirEcriture(
      { echec: null, enregistree: null },
      formulaire({ "compte-2": "445660", "montant-2": "", "libelle-2": "" }),
    );
    expect(etat.echec).toContain("un compte, un libellé et un montant");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse sans dossier, exercice ou journal", async () => {
    const f = doublerFetch();
    for (const champ of ["dossier", "exercice", "journal"]) {
      const etat = await saisirEcriture({ echec: null, enregistree: null }, formulaire({ [champ]: "" }));
      expect(etat.echec, `champ ${champ}`).toContain("requis");
    }
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Ce qui part au backend", () => {
  it("normalise un montant saisi à la française", async () => {
    const f = doublerFetch();
    // ⚠️ Le comptable saisit « 1 500,75 » parce que c'est ainsi qu'on écrit un
    // montant ici. Envoyé tel quel, le backend rend une erreur de schéma que
    // personne ne relie à l'espace des milliers.
    await saisirEcriture({ echec: null, enregistree: null }, formulaire({ "montant-0": "1 500,75", "montant-1": "1 500,75" }));
    expect(corpsEnvoye(f).lignes[0].montant).toBe("1500.75");
  });

  it("ignore les lignes qu'on n'a pas employées", async () => {
    const f = doublerFetch();
    // Le formulaire en offre huit ; on en remplit deux. Exiger les huit le
    // rendrait inutilisable.
    await saisirEcriture({ echec: null, enregistree: null }, formulaire());
    expect(corpsEnvoye(f).lignes).toHaveLength(2);
  });

  it("garde le sens saisi, et retombe sur le débit à défaut", async () => {
    const f = doublerFetch();
    await saisirEcriture({ echec: null, enregistree: null }, formulaire({ "sens-0": ABSENT, "sens-1": "CREDIT" }));
    const lignes = corpsEnvoye(f).lignes;
    expect(lignes[0].sens).toBe("DEBIT");
    expect(lignes[1].sens).toBe("CREDIT");
  });

  it("n'accepte aucun sens inventé", async () => {
    const f = doublerFetch();
    // ⚠️ Une valeur fabriquée — le formulaire n'offre que deux choix — ne doit
    // pas traverser. Tout ce qui n'est pas « CREDIT » est un débit.
    await saisirEcriture({ echec: null, enregistree: null }, formulaire({ "sens-0": "ANNULATION" }));
    expect(corpsEnvoye(f).lignes[0].sens).toBe("DEBIT");
  });

  it("rend la pièce justificative nulle quand elle est vide, jamais vide", async () => {
    const f = doublerFetch();
    await saisirEcriture({ echec: null, enregistree: null }, formulaire());
    // `null` dit « pas de pièce » ; une chaîne vide dit « une pièce dont le
    // numéro est vide », et le backend ne peut pas distinguer les deux.
    expect(corpsEnvoye(f).piece_justificative).toBeNull();
  });

  it("porte le journal et l'exercice à côté du contenu", async () => {
    const f = doublerFetch();
    await saisirEcriture({ echec: null, enregistree: null }, formulaire());
    const corps = corpsEnvoye(f);
    expect(corps.journal).toBe("ACH");
    expect(corps.exercice).toBe("2026");
    expect(corps.date_operation).toBe("2026-09-25");
  });

  it("borne le nombre de lignes lues, même si le formulaire en annonce mille", async () => {
    const f = doublerFetch();
    // ⚠️ `lignes_offertes` vient du formulaire, donc du client : ce n'est pas
    // une donnée de confiance. Une requête fabriquée annonçant un million de
    // lignes ferait boucler le serveur Next sur un million de tours.
    const donnees = formulaire({ lignes_offertes: "1000000" });
    for (let rang = 2; rang < 150; rang += 1) {
      donnees.append(`compte-${rang}`, "601100");
      donnees.append(`libelle-${rang}`, "x");
      donnees.append(`montant-${rang}`, "1");
    }
    await saisirEcriture({ echec: null, enregistree: null }, donnees);
    expect(corpsEnvoye(f).lignes.length).toBeLessThanOrEqual(100);
  });
});

describe("Ce que le comptable lit quand le backend refuse", () => {
  it("montre le motif du backend, tel quel", async () => {
    doublerFetch({ detail: "L'écriture n'est pas équilibrée : 150 000 au débit, 140 000 au crédit." }, 422);
    const etat = await saisirEcriture({ echec: null, enregistree: null }, formulaire());
    // ⚠️ L'équilibre est refusé PAR LE BACKEND, et son message est précis. Le
    // remplacer par « une erreur est survenue » ferait perdre les deux totaux,
    // c'est-à-dire la seule chose utile.
    expect(etat.echec).toContain("pas équilibrée");
    expect(etat.enregistree).toBeNull();
  });

  it("rend l'écriture enregistrée quand tout passe", async () => {
    doublerFetch({ numero: 42, journal: "ACH" });
    const etat = await saisirEcriture({ echec: null, enregistree: null }, formulaire());
    expect(etat.echec).toBeNull();
    expect(etat.enregistree).toMatchObject({ numero: 42 });
  });
});
