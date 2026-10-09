import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "jeton" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  confirmerEnrolement,
  enrolerSecondFacteur,
  reinitialiserSecondFacteur,
  renforcerLaSession,
} = await import("./actions-second-facteur");

/**
 * Le second facteur, éprouvé sur ses refus.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE FICHIER GARDE DES GESTES IRRÉVERSIBLES.
 *
 * Réinitialiser le second facteur d'un collègue **ferme toutes ses sessions** et
 * retire sa protection. Fait par erreur ou sur une demande téléphonique non
 * vérifiée, c'est exactement le geste qu'un attaquant cherche à obtenir : il
 * appelle le cabinet, dit avoir perdu son téléphone, et repart avec un compte
 * sans second facteur.
 *
 * Les règles de fond — un compte enrôlé ne se ré-enrôle pas sans code, on ne
 * réinitialise pas le sien — sont au backend, et ces actions ne les rejouent
 * pas. Ce qu'elles portent, ce sont les **freins d'écran** : le motif
 * circonstancié, la confirmation explicite. Ils ne protègent pas d'un attaquant ;
 * ils protègent d'un collègue pressé, ce qui est le cas fréquent.
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

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  return f;
}

const MOTIF_VALABLE =
  "Téléphone perdu, signalé par téléphone le 25/09, identité vérifiée auprès du titulaire.";

beforeEach(() => vi.unstubAllGlobals());

describe("Enrôler", () => {
  it("rend le secret que le backend donne, une seule fois", async () => {
    doublerFetch({
      secret: "JBSWY3DPEHPK3PXP",
      uri: "otpauth://totp/CGA",
      consigne: "Saisissez ce code dans votre application.",
      confirmation_par_courriel: false,
    });

    const etat = await enrolerSecondFacteur();

    expect(etat.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(etat.echec).toBeNull();
  });

  it("n'expose aucun secret quand le backend passe par courriel", async () => {
    // ⚠️ Pas 62 : quand la confirmation part par courriel, le secret n'est PAS
    // rendu. L'écran ne doit rien inventer pour « remplir » l'affichage.
    doublerFetch({ secret: null, uri: null, consigne: "Lien envoyé.", confirmation_par_courriel: true });

    const etat = await enrolerSecondFacteur();

    expect(etat.secret).toBeNull();
    expect(etat.uri).toBeNull();
    expect(etat.confirmation_par_courriel).toBe(true);
  });

  it("n'emporte aucun secret dans l'état en cas de refus", async () => {
    // ⚠️ L'état d'échec doit être PROPRE : un secret qui survivrait à un refus
    // resterait affiché à l'écran à côté d'un message d'erreur.
    doublerFetch({ detail: "Ce compte a déjà un second facteur." }, 409);

    const etat = await enrolerSecondFacteur();

    expect(etat.echec).toBe("Ce compte a déjà un second facteur.");
    expect(etat.secret).toBeNull();
    expect(etat.uri).toBeNull();
    expect(etat.confirmation_par_courriel).toBe(false);
  });
});

describe("Confirmer l'enrôlement depuis un lien", () => {
  it("refuse un lien sans jeton sans rien consommer", async () => {
    const f = doublerFetch();
    const etat = await confirmerEnrolement(
      { echec: null, secret: null, uri: null, consigne: null, confirmation_par_courriel: false },
      formulaire({ jeton: "" }),
    );
    expect(etat.echec).toContain("rouvrez le lien");
    // ⚠️ Le jeton est à usage unique : un appel à vide le gaspillerait.
    expect(f).not.toHaveBeenCalled();
  });

  it("transmet le jeton tel quel", async () => {
    const f = doublerFetch({ secret: "S", uri: "u", consigne: "c", confirmation_par_courriel: false });
    await confirmerEnrolement(
      { echec: null, secret: null, uri: null, consigne: null, confirmation_par_courriel: false },
      formulaire({ jeton: "abc123" }),
    );
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ jeton: "abc123" });
  });
});

describe("Renforcer la session", () => {
  it("tolère les espaces que l'application affiche", async () => {
    const f = doublerFetch();
    // Les applications d'authentification affichent « 123 456 ». Refuser cette
    // forme ferait échouer une saisie parfaitement correcte.
    const etat = await renforcerLaSession({ echec: null, fait: null }, formulaire({ code: "123 456" }));
    expect(etat.echec).toBeNull();
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ code: "123456" });
  });

  it("accepte aussi les codes de huit chiffres", async () => {
    doublerFetch();
    const etat = await renforcerLaSession({ echec: null, fait: null }, formulaire({ code: "12345678" }));
    expect(etat.echec).toBeNull();
  });

  it("refuse une saisie trop courte, trop longue ou non numérique, sans appeler", async () => {
    const f = doublerFetch();
    for (const code of ["12345", "123456789", "12a456", "", "      "]) {
      const etat = await renforcerLaSession({ echec: null, fait: null }, formulaire({ code }));
      expect(etat.echec, `code « ${code} »`).toContain("six chiffres");
    }
    // ⚠️ Aucun appel : chaque tentative consomme le compteur de limitation du
    // renforcement, et quelques fautes de frappe verrouilleraient le geste.
    expect(f).not.toHaveBeenCalled();
  });

  it("annonce la durée du renforcement, parce qu'elle est courte", async () => {
    doublerFetch();
    const etat = await renforcerLaSession({ echec: null, fait: null }, formulaire({ code: "123456" }));
    // Quinze minutes : sans le dire, le collaborateur croit être couvert pour
    // la journée et retombe sur une demande de code au pire moment.
    expect(etat.fait).toContain("quinze minutes");
  });
});

describe("Réinitialiser le second facteur d'un collègue", () => {
  const complet = {
    identifiant: "C-004",
    motif: MOTIF_VALABLE,
    confirmation: "oui",
  };

  it("exige un motif circonstancié, pas un mot", async () => {
    const f = doublerFetch();
    // ⚠️ Trente caractères ne prouvent rien, et ce n'est pas le but : le seuil
    // force à ÉCRIRE comment la perte a été signalée et vérifiée. « perdu »
    // passe en une seconde ; une phrase demande d'y avoir pensé. Le motif est
    // ensuite lisible dans le journal d'audit.
    const etat = await reinitialiserSecondFacteur(
      { echec: null, fait: null },
      formulaire({ ...complet, motif: "perdu" }),
    );
    expect(etat.echec).toContain("trente caractères");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la confirmation cochée, parce que les sessions tombent", async () => {
    const f = doublerFetch();
    const etat = await reinitialiserSecondFacteur(
      { echec: null, fait: null },
      formulaire({ ...complet, confirmation: "non" }),
    );
    expect(etat.echec).toContain("sessions ouvertes du titulaire seront fermées");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse sans compte désigné", async () => {
    const f = doublerFetch();
    const etat = await reinitialiserSecondFacteur(
      { echec: null, fait: null },
      formulaire({ ...complet, identifiant: "" }),
    );
    expect(etat.echec).toBe("Compte non désigné.");
    expect(f).not.toHaveBeenCalled();
  });

  it("échappe l'identifiant dans l'adresse", async () => {
    const f = doublerFetch();
    // ⚠️ L'identifiant vient d'un formulaire. Sans échappement, un « ../ » y
    // désignerait une autre route du backend.
    await reinitialiserSecondFacteur(
      { echec: null, fait: null },
      formulaire({ ...complet, identifiant: "../audit" }),
    );
    expect(String(f.mock.calls[0][0])).toContain("..%2Faudit");
  });

  it("dit ce qui vient de se passer, en entier", async () => {
    doublerFetch();
    const etat = await reinitialiserSecondFacteur({ echec: null, fait: null }, formulaire(complet));
    // Trois conséquences, trois mentions : le facteur retiré, les sessions
    // fermées, le titulaire prévenu. En taire une ferait croire à un geste
    // anodin.
    expect(etat.fait).toContain("retiré");
    expect(etat.fait).toContain("sessions");
    expect(etat.fait).toContain("prévenu");
  });

  it("montre le refus du backend, qui seul connaît les règles de fond", async () => {
    // « On ne réinitialise pas son propre facteur » est une règle du backend.
    doublerFetch({ detail: "On ne réinitialise pas son propre second facteur." }, 403);
    const etat = await reinitialiserSecondFacteur({ echec: null, fait: null }, formulaire(complet));
    expect(etat.echec).toContain("son propre second facteur");
    expect(etat.fait).toBeNull();
  });
});
