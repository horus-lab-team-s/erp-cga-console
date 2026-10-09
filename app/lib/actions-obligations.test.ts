import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { constaterLeDepotTva, constaterUnDepot, simulerUnePenalite } = await import(
  "./actions-obligations"
);

/**
 * Le constat d'un dépôt fiscal — ce qui prouve qu'on a déclaré, et quand.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ L'HEURE DU DÉPÔT N'EST PAS UNE DÉCORATION.
 *
 * Une TVA se dépose au plus tard le 15. Un accusé portant « 15/10 à 00:30 »
 * saisi à Douala vaut « 14/10 à 23:30 » en UTC, et c'est cette valeur qui part
 * au serveur. Une conversion oubliée, et un dépôt fait dans les temps est
 * consigné hors délai — ou l'inverse, ce qui est pire : le cabinet croit son
 * client en règle.
 *
 * ⚠️ ET LA DATE VIENT DE L'ACCUSÉ, PAS DE L'HORLOGE.
 *
 * Le collaborateur recopie ce que l'accusé de la DGI porte. C'est pourquoi le
 * champ est obligatoire et au format complet : une date sans heure ne permet
 * pas de trancher un dépôt de dernière minute.
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

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
}

function corps(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const DEPOT = {
  dossier: "M081234567890P",
  obligation: "TVA-MENSUELLE|2026-08-01|2026-08-31",
  numero: "ACC-2026-45678",
  depose_le: "2026-09-15T10:30",
};

beforeEach(() => vi.unstubAllGlobals());

describe("Ce qui est refusé avant tout appel", () => {
  it("refuse sans obligation choisie", async () => {
    const f = doublerFetch();
    for (const obligation of ["", "TVA-MENSUELLE", "TVA-MENSUELLE|2026-08-01"]) {
      const etat = await constaterUnDepot(VIDE, formulaire({ ...DEPOT, obligation }));
      expect(etat.echec, `obligation « ${obligation} »`).toBe("Choisissez l'obligation déposée.");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse sans numéro d'accusé", async () => {
    const f = doublerFetch();
    const etat = await constaterUnDepot(VIDE, formulaire({ ...DEPOT, numero: "" }));
    // ⚠️ Le numéro EST la preuve. Un dépôt consigné sans lui n'est opposable à
    // personne : devant un contrôle, « nous avons déposé » ne vaut rien.
    expect(etat.echec).toContain("numéro de l'accusé est obligatoire");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la date ET l'heure, telles que l'accusé les porte", async () => {
    const f = doublerFetch();
    for (const depose of ["", "2026-09-15", "15/09/2026 10:30", "2026-09-15 10:30", "2026-09-15T10"]) {
      const etat = await constaterUnDepot(VIDE, formulaire({ ...DEPOT, depose_le: depose }));
      expect(etat.echec, `date « ${depose} »`).toContain("telles que l'accusé les porte");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse un montant à décimales", async () => {
    const f = doublerFetch();
    const etat = await constaterUnDepot(VIDE, formulaire({ ...DEPOT, montant_constate: "150000,50" }));
    expect(etat.echec).toContain("sans décimales");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("L'heure du dépôt, convertie", () => {
  it("part en UTC, pas en heure de Douala", async () => {
    const f = doublerFetch();
    await constaterUnDepot(VIDE, formulaire(DEPOT));
    // 10:30 à Douala est 09:30 UTC. Sans cette conversion, le serveur
    // enregistrerait une heure décalée d'une heure sur la preuve même du dépôt.
    expect(corps(f).depose_le).toBe("2026-09-15T09:30:00");
  });

  it("recule d'un jour pour un dépôt de dernière minute après minuit", async () => {
    const f = doublerFetch();
    // ⚠️ LE CAS QUI COÛTE. Un dépôt fait le 15 à 00:30 à Douala — donc dans les
    // délais — vaut le 14 à 23:30 en UTC. L'inverse, un dépôt du 16 à 00:30
    // consigné comme le 15, ferait croire le client en règle alors qu'il est
    // hors délai.
    await constaterUnDepot(VIDE, formulaire({ ...DEPOT, depose_le: "2026-09-15T00:30" }));
    expect(corps(f).depose_le).toBe("2026-09-14T23:30:00");
  });

  it("applique la même conversion au dépôt de TVA", async () => {
    const f = doublerFetch({ accuse: { numero: "ACC-1" }, reserves_assumees: [] });
    await constaterLeDepotTva(
      VIDE,
      formulaire({ ...DEPOT, periode_debut: "2026-08-01", periode_fin: "2026-08-31" }),
    );
    expect(corps(f).depose_le).toBe("2026-09-15T09:30:00");
  });
});

describe("Ce qui part au backend", () => {
  it("éclate l'obligation choisie en code et période", async () => {
    const f = doublerFetch();
    await constaterUnDepot(VIDE, formulaire(DEPOT));
    const envoye = corps(f);
    expect(envoye.code_obligation).toBe("TVA-MENSUELLE");
    expect(envoye.periode_debut).toBe("2026-08-01");
    expect(envoye.periode_fin).toBe("2026-08-31");
  });

  it("envoie `null` pour ce qui n'est pas renseigné", async () => {
    const f = doublerFetch();
    await constaterUnDepot(VIDE, formulaire(DEPOT));
    const envoye = corps(f);
    // Un montant absent n'est pas un montant nul : une déclaration sans
    // paiement existe, et « 0 » dirait autre chose.
    expect(envoye.montant_constate).toBeNull();
    expect(envoye.piece_jointe).toBeNull();
    expect(envoye.precision).toBeNull();
  });

  it("accepte un montant écrit avec les espaces des milliers", async () => {
    const f = doublerFetch();
    await constaterUnDepot(VIDE, formulaire({ ...DEPOT, montant_constate: "1 500 000" }));
    expect(corps(f).montant_constate).toBe("1500000");
  });

  it("met la référence de pièce jointe en majuscules", async () => {
    const f = doublerFetch();
    // Les références de la DGI sont en majuscules ; les saisir autrement
    // produirait deux écritures pour la même pièce.
    await constaterUnDepot(VIDE, formulaire({ ...DEPOT, piece_jointe: "dgi-2026-abc" }));
    expect(corps(f).piece_jointe).toBe("DGI-2026-ABC");
  });

  it("échappe le dossier dans l'adresse", async () => {
    const f = doublerFetch();
    await constaterUnDepot(VIDE, formulaire({ ...DEPOT, dossier: "../audit" }));
    expect(String(f.mock.calls[0][0])).toContain("..%2Faudit");
  });
});

describe("Ce que le collaborateur lit", () => {
  it("nomme l'accusé consigné", async () => {
    doublerFetch();
    const etat = await constaterUnDepot(VIDE, formulaire(DEPOT));
    expect(etat.fait).toContain("ACC-2026-45678");
    expect(etat.fait).toContain("l'obligation est déclarée");
  });

  it("énumère les réserves assumées sur un dépôt de TVA", async () => {
    doublerFetch({
      accuse: { numero: "ACC-1" },
      reserves_assumees: ["écart de TVA collectée", "pièce manquante"],
    });
    const etat = await constaterLeDepotTva(
      VIDE,
      formulaire({ ...DEPOT, periode_debut: "2026-08-01", periode_fin: "2026-08-31" }),
    );
    // ⚠️ Assumer une réserve engage le cabinet. La taire ferait signer sans
    // savoir ; l'écrire dans le message de réussite la met sous les yeux au
    // moment même où le geste est fait.
    expect(etat.fait).toContain("Réserves assumées");
    expect(etat.fait).toContain("écart de TVA collectée");
  });

  it("ne mentionne aucune réserve quand il n'y en a pas", async () => {
    doublerFetch({ accuse: { numero: "ACC-1" }, reserves_assumees: [] });
    const etat = await constaterLeDepotTva(
      VIDE,
      formulaire({ ...DEPOT, periode_debut: "2026-08-01", periode_fin: "2026-08-31" }),
    );
    expect(etat.fait).not.toContain("Réserves");
  });
});

describe("La simulation de pénalité", () => {
  it("refuse un montant nul : il n'y a rien à pénaliser", async () => {
    const f = doublerFetch();
    for (const montant of ["0", "", "abc", "-100"]) {
      const etat = await simulerUnePenalite(
        { echec: null, penalite: null },
        formulaire({ dossier: "M081234567890P", montant_du: montant }),
      );
      expect(etat.echec, `montant « ${montant} »`).toContain("n'est pas nul");
    }
    expect(f).not.toHaveBeenCalled();
  });
});
