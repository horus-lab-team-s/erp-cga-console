import { beforeEach, describe, expect, it, vi } from "vitest";

const poserTemoin = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "jeton" }), set: poserTemoin }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  admettreAuCentre,
  choisirMonEntreprise,
  renvoyerUnLienDAcces,
  resilierLAdhesion,
  signalerUnChangement,
} = await import("./actions-portefeuille");

/**
 * Le portefeuille — par où un dossier entre au Centre, et par où il en sort.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ADMETTRE UNE ENTREPRISE AU CENTRE EST UN ACTE ATTESTÉ, PAS UN ENREGISTREMENT.
 *
 * C'est le Centre qui atteste l'éligibilité — le chiffre d'affaires sous le
 * seuil, la source de ce chiffre, la date d'effet. Devant un contrôle, ce sont
 * ces trois éléments qu'on présente ; s'ils sont vides ou approximatifs,
 * l'attestation ne vaut rien et le Centre engage sa responsabilité.
 *
 * Les seuils de longueur ne mesurent pas la qualité d'un texte. Ils forcent à
 * en écrire un : « ok » passe en une seconde, une phrase demande d'y avoir
 * pensé.
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
const ADMISSION = {
  dossier: "M081234567890P",
  a_compter_du: "2026-01-01",
  chiffre_affaires_declare: "62 000 000",
  source_du_chiffre: "Liasse fiscale de l'exercice 2025",
  justification: "Chiffre d'affaires sous le seuil, liasse 2025 vérifiée au dossier.",
};

beforeEach(() => {
  vi.unstubAllGlobals();
  poserTemoin.mockReset();
});

describe("Admettre une entreprise au Centre", () => {
  it("exige une date d'effet qui soit une date", async () => {
    const f = doublerFetch();
    for (const date of ["", "janvier 2026", "01/01/2026", "2026-01"]) {
      const etat = await admettreAuCentre(VIDE, formulaire({ ...ADMISSION, a_compter_du: date }));
      expect(etat.echec, `date « ${date} »`).toContain("date d'effet est obligatoire");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("tolère les espaces des milliers dans le chiffre d'affaires", async () => {
    const f = doublerFetch({ a_la_date: "2026-01-01", adherente: true });
    await admettreAuCentre(VIDE, formulaire(ADMISSION));
    // « 62 000 000 » est la façon dont on lit une liasse. Refuser cette forme
    // ferait retaper le chiffre, avec le risque d'un zéro en moins.
    expect(corps(f).chiffre_affaires_declare).toBe("62000000");
  });

  it("refuse un chiffre d'affaires à décimales ou illisible", async () => {
    const f = doublerFetch();
    for (const chiffre of ["", "62 000 000,50", "environ 62M", "-1000"]) {
      const etat = await admettreAuCentre(
        VIDE,
        formulaire({ ...ADMISSION, chiffre_affaires_declare: chiffre }),
      );
      expect(etat.echec, `chiffre « ${chiffre} »`).toContain("sans décimales");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("exige que la source du chiffre soit nommée", async () => {
    const f = doublerFetch();
    const etat = await admettreAuCentre(VIDE, formulaire({ ...ADMISSION, source_du_chiffre: "CA" }));
    // ⚠️ Le message donne deux exemples — la liasse, une attestation — parce
    // que « nommez la source » seul se remplit par « le client ».
    expect(etat.echec).toContain("liasse");
    expect(etat.echec).toContain("attestation");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige une justification, et dit qui atteste", async () => {
    const f = doublerFetch();
    const etat = await admettreAuCentre(VIDE, formulaire({ ...ADMISSION, justification: "éligible" }));
    expect(etat.echec).toContain("journal d'audit");
    expect(etat.echec).toContain("c'est le Centre qui atteste");
    expect(f).not.toHaveBeenCalled();
  });

  it("confirme avec la date d'effet rendue par le backend", async () => {
    // ⚠️ La date affichée vient du BACKEND, pas du formulaire : le domaine peut
    // la recaler (début d'exercice, date d'immatriculation). Renvoyer la saisie
    // ferait croire à une date qui n'est pas celle inscrite.
    doublerFetch({ a_la_date: "2026-01-01", adherente: true });
    const etat = await admettreAuCentre(VIDE, formulaire(ADMISSION));
    expect(etat.fait).toContain("01/01/2026");
  });
});

describe("Résilier une adhésion", () => {
  const resiliation = {
    dossier: "M081234567890P",
    au: "2026-12-31",
    justification: "Cessation d'activité déclarée, radiation RCCM du 15/12/2026.",
  };

  it("exige une date de résiliation", async () => {
    const f = doublerFetch();
    const etat = await resilierLAdhesion(VIDE, formulaire({ ...resiliation, au: "fin d'année" }));
    expect(etat.echec).toContain("date de résiliation est obligatoire");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige une justification aussi longue que pour admettre", async () => {
    const f = doublerFetch();
    // Sortir du Centre se justifie autant qu'y entrer : c'est la fin d'une
    // attestation, et le dossier peut revenir en contrôle des années après.
    const etat = await resilierLAdhesion(VIDE, formulaire({ ...resiliation, justification: "parti" }));
    expect(etat.echec).not.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("dit clairement à partir de quand l'entreprise n'est plus adhérente", async () => {
    doublerFetch({});
    const etat = await resilierLAdhesion(VIDE, formulaire(resiliation));
    expect(etat.fait).toContain("plus adhérent le 31/12/2026");
  });
});

describe("Renvoyer un lien d'accès à un adhérent", () => {
  it("refuse sans compte désigné", async () => {
    const f = doublerFetch();
    const etat = await renvoyerUnLienDAcces(
      VIDE,
      formulaire({ dossier: "M081234567890P", compte: "", verification: "CNI vue" }),
    );
    expect(etat.echec).toBe("Compte non désigné.");
    expect(f).not.toHaveBeenCalled();
  });

  it("annonce la bonne durée selon le type de lien", async () => {
    // ⚠️ Sept jours pour une activation, deux heures pour une
    // réinitialisation : ce n'est pas la même urgence à annoncer au client au
    // téléphone. Confondre les deux fait rappeler le cabinet.
    doublerFetch({ type: "ACTIVATION" });
    let etat = await renvoyerUnLienDAcces(
      VIDE,
      formulaire({ dossier: "D", compte: "C-009", verification: "CNI présentée au guichet." }),
    );
    expect(etat.fait).toContain("7 jours");

    vi.unstubAllGlobals();
    doublerFetch({ type: "REINITIALISATION" });
    etat = await renvoyerUnLienDAcces(
      VIDE,
      formulaire({ dossier: "D", compte: "C-009", verification: "CNI présentée au guichet." }),
    );
    expect(etat.fait).toContain("2 heures");
  });

  it("ne dit jamais l'adresse du destinataire", async () => {
    doublerFetch({ type: "ACTIVATION" });
    const etat = await renvoyerUnLienDAcces(
      VIDE,
      formulaire({ dossier: "D", compte: "C-009", verification: "CNI présentée." }),
    );
    // ⚠️ « envoyé à l'adresse du compte » et non l'adresse elle-même : l'écran
    // du chargé de clientèle est souvent visible depuis l'accueil.
    expect(etat.fait).toContain("à l'adresse du compte");
    expect(etat.fait).not.toContain("@");
  });
});

describe("Signaler un changement, côté adhérent", () => {
  it("refuse sans nature de changement", async () => {
    const f = doublerFetch();
    const etat = await signalerUnChangement(
      VIDE,
      formulaire({ dossier: "D", nature: "", message: "Nouvelle adresse" }),
    );
    expect(etat.echec).toBe("Choisissez ce qui change.");
    expect(f).not.toHaveBeenCalled();
  });

  it("demande quelques mots, pas une dissertation", async () => {
    const f = doublerFetch();
    // ⚠️ Cinq caractères, et pas trente : c'est l'ADHÉRENT qui écrit, depuis un
    // téléphone. Un seuil de trente caractères ici ferait abandonner le signalement.
    const etat = await signalerUnChangement(
      VIDE,
      formulaire({ dossier: "D", nature: "ADRESSE", message: "x" }),
    );
    expect(etat.echec).toContain("quelques mots");

    vi.unstubAllGlobals();
    doublerFetch({ libelle: "Adresse" });
    const ok = await signalerUnChangement(
      VIDE,
      formulaire({ dossier: "D", nature: "ADRESSE", message: "Bonapriso" }),
    );
    expect(ok.echec).toBeNull();
    // Le libellé du changement est repris en minuscules dans la confirmation :
    // l'adhérent relit ce qu'il vient de signaler.
    expect(ok.fait).toContain("adresse");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Choisir son entreprise, côté adhérent multi-dossiers", () => {
  it("ne retient qu'un NIU qui a la forme d'un NIU", async () => {
    await choisirMonEntreprise(formulaire({ entreprise: "M081234567890P" }));
    expect(poserTemoin).toHaveBeenCalled();
    const [nom, valeur, options] = poserTemoin.mock.calls[0];
    expect(nom).toBe("cga_entreprise");
    expect(valeur).toBe("M081234567890P");
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("ignore une valeur fabriquée plutôt que de la poser", async () => {
    // ⚠️ Ce témoin ne retient qu'un AFFICHAGE : il ne protège rien, et un NIU
    // hors périmètre est ignoré à la lecture. Raison de plus pour ne pas y
    // écrire n'importe quoi — un témoin vaut un an.
    for (const valeur of ["", "court", "../../etc", "<script>", "m081234567890p"]) {
      await choisirMonEntreprise(formulaire({ entreprise: valeur }));
    }
    expect(poserTemoin).not.toHaveBeenCalled();
  });
});
