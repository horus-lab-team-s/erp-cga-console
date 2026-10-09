import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  accorderUnMandat,
  fermerLesSessions,
  fermerUneHabilitation,
  inviterUnCollaborateur,
  retablirUnCompte,
  revoquerUnMandat,
  suspendreUnCompte,
} = await import("./actions-administration");

/**
 * L'administration des comptes — l'écran qui distribue les droits.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ TOUT CE QUI SE FAIT ICI SE VOIT AILLEURS, ET PAS TOUT DE SUITE.
 *
 * Une portée mal envoyée ne produit aucune erreur : le collaborateur est créé,
 * il se connecte, et il voit trop — ou rien. Personne ne s'en aperçoit avant
 * qu'il ne s'en plaigne, ou qu'un contrôle ne le relève.
 *
 * La distinction `null` / liste vide est la même que celle d'`acces.ts`, et
 * c'est la plus coûteuse du produit : `null` veut dire **tout le portefeuille**,
 * une liste veut dire **ces dossiers-là**. Les confondre donne tout le cabinet à
 * un nouvel arrivant.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doublerFetch(reponse: unknown = {}, statut = 200) {
  const doublure = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(statut === 204 ? null : JSON.stringify(reponse), {
      status: statut,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

function formulaire(champs: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) {
    if (Array.isArray(valeur)) for (const v of valeur) f.append(cle, v);
    else f.append(cle, valeur);
  }
  return f;
}

function corps(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const INVITATION = {
  courriel: "n.arrivant@cga-brcg.cm",
  nom: "ARRIVANT",
  prenom: "Nadège",
  role: "COMPTABLE",
  depuis: "2026-10-01",
};
const REPONSE_INVITATION = {
  compte: { courriel: "n.arrivant@cga-brcg.cm" },
  expire_le: "2026-10-08T12:00:00",
};

beforeEach(() => vi.unstubAllGlobals());

describe("Inviter un collaborateur", () => {
  it("exige l'identité, le rôle et la date d'entrée", async () => {
    const f = doublerFetch();
    for (const manquant of ["courriel", "nom", "prenom", "role", "depuis"]) {
      const etat = await inviterUnCollaborateur(VIDE, formulaire({ ...INVITATION, [manquant]: "" }));
      expect(etat.echec, `sans ${manquant}`).toContain("obligatoires");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une date d'entrée qui n'est pas une date", async () => {
    const f = doublerFetch();
    // ⚠️ La date d'entrée ouvre l'habilitation. « bientôt » ou « 01/10/2026 »
    // partiraient au backend et produiraient un refus de schéma illisible.
    for (const depuis of ["bientôt", "01/10/2026", "2026-10", "2026-13-01x"]) {
      const etat = await inviterUnCollaborateur(VIDE, formulaire({ ...INVITATION, depuis }));
      expect(etat.echec, `date « ${depuis} »`).toContain("obligatoires");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("envoie `null` pour « tout le cabinet », jamais une liste vide", async () => {
    const f = doublerFetch(REPONSE_INVITATION);
    await inviterUnCollaborateur(VIDE, formulaire({ ...INVITATION, portee_mode: "tout" }));
    // ⚠️ `null` = tout le portefeuille. Une liste, MÊME VIDE, restreint. Envoyer
    // `[]` en croyant dire « tout » créerait un collaborateur qui ne voit rien,
    // et le défaut se manifeste le jour de son arrivée.
    expect(corps(f).portee).toBeNull();
  });

  it("envoie la liste des dossiers quand la portée est restreinte", async () => {
    const f = doublerFetch(REPONSE_INVITATION);
    await inviterUnCollaborateur(
      VIDE,
      formulaire({ ...INVITATION, portee: ["M081234567890P", "P027788990011M"] }),
    );
    expect(corps(f).portee).toEqual(["M081234567890P", "P027788990011M"]);
  });

  it("accepte des NIU saisis à la main, séparés comme on veut", async () => {
    const f = doublerFetch(REPONSE_INVITATION);
    // Un administrateur ne lit pas le portefeuille : il n'a pas de cases à
    // cocher et recopie les NIU. Il les sépare par des virgules, des
    // points-virgules ou des retours à la ligne, selon d'où il les copie.
    await inviterUnCollaborateur(
      VIDE,
      formulaire({ ...INVITATION, portee_niu: "M081234567890P, P027788990011M;\n  X099999999999Z" }),
    );
    expect(corps(f).portee).toEqual(["M081234567890P", "P027788990011M", "X099999999999Z"]);
  });

  it("réunit les cases cochées et la saisie libre", async () => {
    const f = doublerFetch(REPONSE_INVITATION);
    await inviterUnCollaborateur(
      VIDE,
      formulaire({ ...INVITATION, portee: ["M081234567890P"], portee_niu: "P027788990011M" }),
    );
    expect(corps(f).portee).toHaveLength(2);
  });

  it("envoie `null` pour un téléphone non communiqué", async () => {
    const f = doublerFetch(REPONSE_INVITATION);
    await inviterUnCollaborateur(VIDE, formulaire(INVITATION));
    expect(corps(f).telephone).toBeNull();
  });

  it("dit jusqu'à quand le lien d'invitation vaut", async () => {
    doublerFetch(REPONSE_INVITATION);
    const etat = await inviterUnCollaborateur(VIDE, formulaire(INVITATION));
    // Sans cette date, l'invité ouvre le lien trois semaines plus tard et
    // appelle le cabinet parce que « ça ne marche pas ».
    expect(etat.fait).toContain("08/10/2026");
    expect(etat.fait).toContain("n.arrivant@cga-brcg.cm");
  });
});

describe("Suspendre et rétablir un compte", () => {
  const suspension = { identifiant: "C-004", motif: "Départ du cabinet le 30/09.", confirmation: "oui" };

  it("exige un motif écrit, qui reste au journal", async () => {
    const f = doublerFetch();
    const etat = await suspendreUnCompte(VIDE, formulaire({ ...suspension, motif: "parti" }));
    expect(etat.echec).toContain("journal d'audit");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la confirmation, parce que les sessions tombent", async () => {
    const f = doublerFetch();
    const etat = await suspendreUnCompte(VIDE, formulaire({ ...suspension, confirmation: "non" }));
    expect(etat.echec).toContain("sessions ouvertes seront fermées");
    expect(f).not.toHaveBeenCalled();
  });

  it("annonce les trois conséquences de la suspension", async () => {
    doublerFetch();
    const etat = await suspendreUnCompte(VIDE, formulaire(suspension));
    expect(etat.fait).toContain("suspendu");
    expect(etat.fait).toContain("sessions fermées");
    expect(etat.fait).toContain("prévenu");
  });

  it("exige aussi un motif pour LEVER une suspension", async () => {
    const f = doublerFetch();
    // ⚠️ Lever une suspension est un geste aussi traçable que la poser : c'est
    // le rétablissement d'un accès. Le motif se relit deux ans plus tard.
    const etat = await retablirUnCompte(VIDE, formulaire({ identifiant: "C-004", motif: "ok" }));
    expect(etat.echec).toContain("journal d'audit");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Fermer une habilitation", () => {
  const fermeture = { habilitation: "H-012", le: "2026-09-30", motif: "DEPART", confirmation: "oui" };

  it("n'accepte qu'un motif du vocabulaire, jamais du texte libre", async () => {
    const f = doublerFetch();
    // ⚠️ Le motif de fermeture est une DONNÉE, pas une phrase : il est repris
    // dans les états du cabinet. Un motif inventé produirait une ligne
    // inclassable.
    const etat = await fermerUneHabilitation(VIDE, formulaire({ ...fermeture, motif: "il est parti" }));
    expect(etat.echec).toContain("Choisissez le motif");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la confirmation, parce qu'une habilitation fermée ne se rouvre pas", async () => {
    const f = doublerFetch();
    const etat = await fermerUneHabilitation(VIDE, formulaire({ ...fermeture, confirmation: "non" }));
    expect(etat.echec).toContain("ne se rouvre pas");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse une date de fin qui n'est pas une date", async () => {
    const f = doublerFetch();
    const etat = await fermerUneHabilitation(VIDE, formulaire({ ...fermeture, le: "fin du mois" }));
    expect(etat.echec).toContain("date de fin");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Fermer les sessions d'un compte", () => {
  it("accorde le pluriel, et dit quand il n'y avait rien à fermer", async () => {
    // ⚠️ « 0 sessions fermées » laisse croire que le geste a échoué. « Aucune
    // session ouverte » dit ce qui s'est passé : l'appareil perdu n'était plus
    // connecté.
    doublerFetch({ sessions_fermees: 0 });
    expect((await fermerLesSessions(VIDE, formulaire({ identifiant: "C-004" }))).fait).toBe(
      "Aucune session ouverte.",
    );

    vi.unstubAllGlobals();
    doublerFetch({ sessions_fermees: 1 });
    expect((await fermerLesSessions(VIDE, formulaire({ identifiant: "C-004" }))).fait).toBe(
      "1 session fermée.",
    );

    vi.unstubAllGlobals();
    doublerFetch({ sessions_fermees: 3 });
    expect((await fermerLesSessions(VIDE, formulaire({ identifiant: "C-004" }))).fait).toBe(
      "3 sessions fermées.",
    );
  });
});

describe("Accorder un mandat à un autre cabinet", () => {
  const mandat = {
    mandataire: "CGA-PARTENAIRE",
    roles: ["REVISEUR"],
    debut: "2026-10-01",
    motif: "Revue croisée annuelle",
  };

  it("refuse un mandat sans rôle, qui n'autoriserait rien", async () => {
    const f = doublerFetch();
    const etat = await accorderUnMandat(VIDE, formulaire({ ...mandat, roles: [] }));
    expect(etat.echec).toContain("n'autorise rien");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige le mandataire, la date de début et le titre", async () => {
    const f = doublerFetch();
    for (const [champ, message] of [
      ["mandataire", "locataire mandaté"],
      ["debut", "date de début"],
      ["motif", "à quel titre"],
    ] as const) {
      const etat = await accorderUnMandat(VIDE, formulaire({ ...mandat, [champ]: "" }));
      expect(etat.echec, `sans ${champ}`).toContain(message);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("envoie `null` quand aucun compte n'est désigné, jamais une liste vide", async () => {
    const f = doublerFetch();
    await accorderUnMandat(VIDE, formulaire(mandat));
    // ⚠️ Champ vide = TOUS les comptes du mandataire. Une liste vide
    // n'autoriserait personne, et le modèle la refuse : l'écran ne doit donc
    // jamais en envoyer une.
    expect(corps(f).comptes).toBeNull();
  });

  it("n'envoie aucun mandant : c'est le locataire servi", async () => {
    const f = doublerFetch();
    const donnees = formulaire(mandat);
    donnees.append("mandant", "UN-AUTRE-CABINET");

    await accorderUnMandat(VIDE, donnees);

    // ⚠️ Le mandant est pris de la requête par le backend. Le laisser choisir
    // permettrait d'accorder un mandat sur les données d'un autre cabinet.
    expect(corps(f).mandant).toBeUndefined();
  });

  it("nomme le mandataire et la date dans la confirmation", async () => {
    doublerFetch();
    const etat = await accorderUnMandat(VIDE, formulaire(mandat));
    expect(etat.fait).toContain("CGA-PARTENAIRE");
    expect(etat.fait).toContain("01/10/2026");
  });
});

describe("Révoquer un mandat", () => {
  it("exige un motif long, qu'on relira dans deux ans", async () => {
    const f = doublerFetch();
    const etat = await revoquerUnMandat(VIDE, formulaire({ identifiant: "M-003", motif: "fini" }));
    expect(etat.echec).not.toBeNull();
    // Le backend refuse en deçà de dix caractères ; l'écran le dit AVANT
    // d'appeler, plutôt que de faire découvrir la règle par un refus.
    expect(f).not.toHaveBeenCalled();
  });
});
