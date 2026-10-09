import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  chiffrerLeDossier,
  classerSansSuite,
  deposerUneDemande,
  emettreLaProforma,
  enregistrerLaQualification,
} = await import("./actions-acquisition");

/**
 * Le parcours commercial : la demande entrante, puis la proforma.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ LA DEMANDE ENTRANTE EST LE SEUL GESTE DU PRODUIT OUVERT À TOUT INTERNET.
 *
 * Elle n'a ni session, ni compte, ni collaborateur derrière. Les contrôles
 * d'écran y servent à deux choses, et pas du tout aux mêmes :
 *
 *   · **dire au visiteur quoi corriger** — un numéro incomplet, un nom vide ;
 *   · **ne pas déranger le backend** pour une saisie manifestement inutilisable.
 *
 * Ils ne protègent de rien : tout ce qui compte est revérifié côté serveur. En
 * revanche, le CONSENTEMENT, lui, se vérifie ici ET là-bas, parce qu'enregistrer
 * les coordonnées de quelqu'un qui n'a pas dit oui n'est pas un défaut technique.
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

/**
 * Le motif d'un refus, en restreignant le type.
 *
 * ⚠️ `ResultatDemande` est une union discriminée : un succès porte le canal de
 * rappel, un refus porte le motif, et aucun des deux ne porte les champs de
 * l'autre. Lire `.motif` sans restreindre compile par accident dans un cas
 * d'essai laxiste, et masque le jour où la forme change.
 */
function motifDuRefus(r: Awaited<ReturnType<typeof deposerUneDemande>>): string {
  if (r.enregistree) throw new Error("attendu un refus, reçu un enregistrement");
  return r.motif;
}

const VIDE = { echec: null, fait: null };
const DEMANDE = {
  nom: "Jean-Paul NKOA",
  telephone: "+237 676 88 76 86",
  courriel: "jp.nkoa@batimentplus.cm",
  message: "Je souhaite adhérer.",
  demarche: "ADHESION" as const,
  consentementContact: true,
  origine: "vitrine",
};

beforeEach(() => vi.unstubAllGlobals());

describe("La demande déposée depuis la vitrine", () => {
  it("refuse sans consentement, et le dit sans reproche", async () => {
    const f = doublerFetch();
    const r = await deposerUneDemande({ ...DEMANDE, consentementContact: false });
    expect(r.enregistree).toBe(false);
    expect(motifDuRefus(r)).toContain("Sans votre accord");
    // ⚠️ Enregistrer les coordonnées de quelqu'un qui n'a pas dit oui n'est pas
    // un défaut technique : aucun appel ne part.
    expect(f).not.toHaveBeenCalled();
  });

  it("n'accepte que les démarches du catalogue", async () => {
    const f = doublerFetch();
    const r = await deposerUneDemande({ ...DEMANDE, demarche: "n-importe-quoi" as never });
    expect(motifDuRefus(r)).toBe("Démarche inconnue.");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse un nom trop court ou démesuré", async () => {
    const f = doublerFetch();
    for (const nom of ["", "ab", "x".repeat(121)]) {
      const r = await deposerUneDemande({ ...DEMANDE, nom });
      expect(motifDuRefus(r), `nom de ${nom.length} caractères`).toContain("3 et 120");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("compte les chiffres d'un téléphone, pas ses espaces", async () => {
    // ⚠️ « +237 676 88 76 86 » est la façon dont on écrit un numéro ici. Compter
    // la longueur brute refuserait des numéros valides et accepterait
    // « ---------- ».
    const f = doublerFetch({ canal_de_rappel: "APPEL" });
    const r = await deposerUneDemande(DEMANDE);
    expect(r.enregistree).toBe(true);

    vi.unstubAllGlobals();
    const g = doublerFetch();
    const court = await deposerUneDemande({ ...DEMANDE, telephone: "6 76 88" });
    expect(motifDuRefus(court)).toContain("incomplet");
    expect(g).not.toHaveBeenCalled();
    expect(f).toHaveBeenCalled();
  });

  it("envoie `null` plutôt qu'une chaîne vide pour le courriel et le message", async () => {
    const f = doublerFetch({ canal_de_rappel: "APPEL" });
    await deposerUneDemande({ ...DEMANDE, courriel: "", message: "" });
    expect(corps(f).courriel).toBeNull();
    expect(corps(f).message).toBeNull();
  });

  it("borne l'origine, qui vient de la page", async () => {
    const f = doublerFetch({ canal_de_rappel: "APPEL" });
    // L'origine sert à savoir d'où vient le prospect. Venant de la page, elle
    // n'est pas de confiance : une valeur d'un kilo-octet n'a rien à faire en
    // base.
    await deposerUneDemande({ ...DEMANDE, origine: "x".repeat(200) });
    expect(corps(f).origine).toHaveLength(40);
  });

  it("transmet le motif du backend, qui dit quoi corriger", async () => {
    doublerFetch({ detail: "+33612345678 n'est pas un numéro camerounais exploitable." }, 422);
    const r = await deposerUneDemande({ ...DEMANDE, telephone: "+33612345678" });
    // ⚠️ « Une erreur est survenue » ne dit rien au visiteur ; ce message-là lui
    // dit exactement quoi changer.
    expect(motifDuRefus(r)).toContain("camerounais");
  });

  it("distingue une panne de service d'un refus", async () => {
    // Un backend injoignable rend `statut: null`. Afficher son message
    // technique — « Le backend est injoignable sur http://… » — exposerait
    // l'adresse interne à un visiteur.
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")));
    const r = await deposerUneDemande(DEMANDE);
    expect(motifDuRefus(r)).toBe("Le service d'enregistrement est momentanément indisponible.");
  });
});

describe("La qualification", () => {
  it("ne retient que les réponses réellement saisies", async () => {
    const f = doublerFetch({ complete: false, manquantes: ["effectif"] });
    const donnees = formulaire({
      reference: "A-001",
      q_secteur: "Bâtiment",
      q_effectif: "   ",
      autre_champ: "ignoré",
    });
    await enregistrerLaQualification(VIDE, donnees);
    const envoye = corps(f);
    // Les champs vides ne sont pas des réponses : les envoyer ferait croire à
    // une qualification faite.
    expect(JSON.stringify(envoye)).toContain("Bâtiment");
    expect(JSON.stringify(envoye)).not.toContain("autre_champ");
  });

  it("dit ce qu'il reste à demander, plutôt que « enregistré »", async () => {
    doublerFetch({ complete: false, manquantes: ["effectif", "chiffre d'affaires"] });
    const etat = await enregistrerLaQualification(
      VIDE,
      formulaire({ reference: "A-001", q_secteur: "Bâtiment" }),
    );
    // ⚠️ Le chargé de clientèle a le client au téléphone. « Enregistré » le fait
    // raccrocher ; la liste de ce qui manque lui fait poser la question tout de
    // suite, et évite un second appel.
    expect(etat.fait).toContain("effectif");
    expect(etat.fait).toContain("chiffre d'affaires");
  });

  it("annonce qu'on peut chiffrer dès que la qualification est complète", async () => {
    doublerFetch({ complete: true, manquantes: [] });
    const etat = await enregistrerLaQualification(
      VIDE,
      formulaire({ reference: "A-001", q_secteur: "Bâtiment" }),
    );
    expect(etat.fait).toContain("peut être chiffré");
  });

  it("refuse une qualification sans aucune réponse", async () => {
    const f = doublerFetch();
    const etat = await enregistrerLaQualification(VIDE, formulaire({ reference: "A-001" }));
    expect(etat.echec).toBe("Aucune réponse saisie.");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Le chiffrage et la proforma", () => {
  it("refuse un montant à décimales : le franc CFA n'en a pas", async () => {
    const f = doublerFetch();
    for (const montant of ["150000,50", "150000.50", "cent cinquante mille", ""]) {
      const etat = await emettreLaProforma(
        { echec: null, proforma: null, lien: null },
        formulaire({ reference: "A-001", montant }),
      );
      expect(etat.echec, `montant « ${montant} »`).toContain("sans décimales");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("accepte un montant saisi avec les espaces des milliers", async () => {
    const f = doublerFetch({ numero: "PF-001", version: 1, lien_acceptation: null, expire_le: null });
    const etat = await emettreLaProforma(
      { echec: null, proforma: null, lien: null },
      formulaire({ reference: "A-001", montant: "1 500 000" }),
    );
    expect(etat.echec).toBeNull();
    expect(corps(f).montant).toBe("1500000");
  });

  it("refuse un score de charge qui n'est pas un entier positif", async () => {
    const f = doublerFetch();
    for (const score of ["-1", "2.5", "beaucoup"]) {
      const etat = await emettreLaProforma(
        { echec: null, proforma: null, lien: null },
        formulaire({ reference: "A-001", montant: "150000", score_charge: score }),
      );
      expect(etat.echec, `score « ${score} »`).toContain("entier positif");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("demande au SERVEUR d'écrire au client quand la case est cochée", async () => {
    const f = doublerFetch({ numero: "PF-001", version: 1, lien_acceptation: null, expire_le: null });
    await emettreLaProforma(
      { echec: null, proforma: null, lien: null },
      formulaire({ reference: "A-001", montant: "150000", envoyer_par_courriel: "oui" }),
    );
    // ⚠️ Le serveur écrit au client AU MOMENT où il forge le lien : le lien ne
    // transite alors par aucun humain, ni par le presse-papier du chargé de
    // clientèle.
    expect(corps(f).envoyer_par_courriel).toBe(true);
  });

  it("prend le lien du SERVEUR, et n'en recompose aucun", async () => {
    // ⚠️ CE CAS A CHANGÉ DE SENS LE 28 SEPTEMBRE, ET C'EST UN PROGRÈS.
    //
    // Il gardait la recomposition de l'adresse par la console — « sur la
    // vitrine, pas sur le domaine du site ». Il gardait donc la SECONDE recette
    // d'une adresse qui en avait déjà une, côté serveur, pour le courriel. Les
    // deux avaient divergé une première fois, et la cliente recevait un lien
    // vers un site où sa proforma n'existe pas ; le courriel, lui, marchait, et
    // rien ne le signalait.
    //
    // Le serveur compose `lien_client` là où il compose celle du courriel. La
    // console le prend tel quel : un paramètre renommé les change toutes les
    // deux, ou aucune.
    doublerFetch({
      numero: "PF-2026-0001",
      version: 2,
      lien_acceptation: "sceau123",
      lien_client: "http://vitrine/fr/proforma/PF-2026-0001?v=2&e=2026-10-15&s=sceau123",
      expire_le: "2026-10-15T00:00:00",
    });
    const etat = await emettreLaProforma(
      { echec: null, proforma: null, lien: null },
      formulaire({ reference: "A-001", montant: "150000" }),
    );
    expect(etat.lien).toBe(
      "http://vitrine/fr/proforma/PF-2026-0001?v=2&e=2026-10-15&s=sceau123",
    );
  });

  it("ne fabrique aucun lien quand le backend n'en rend pas", async () => {
    doublerFetch({ numero: "PF-001", version: 1, lien_acceptation: null, lien_client: null, expire_le: null });
    const etat = await emettreLaProforma(
      { echec: null, proforma: null, lien: null },
      formulaire({ reference: "A-001", montant: "150000" }),
    );
    // Un lien inventé mènerait à une page qui refuse : le chargé de clientèle
    // l'enverrait au client, et le client appellerait.
    expect(etat.lien).toBeNull();
  });

  it("refuse un chiffrage dont le score n'est pas entier", async () => {
    const f = doublerFetch();
    const etat = await chiffrerLeDossier(
      { echec: null, proposition: null },
      formulaire({ reference: "A-001", score_charge: "-3" }),
    );
    expect(etat.echec).toContain("entier positif");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("Classer sans suite", () => {
  it("exige un motif du vocabulaire", async () => {
    const f = doublerFetch();
    const etat = await classerSansSuite(VIDE, formulaire({ reference: "A-001", motif: "" }));
    expect(etat.echec).toBe("Choisissez un motif.");
    expect(f).not.toHaveBeenCalled();
  });

  it("dit que le dossier n'est pas supprimé", async () => {
    doublerFetch({});
    const etat = await classerSansSuite(VIDE, formulaire({ reference: "A-001", motif: "SANS_REPONSE" }));
    // ⚠️ « Classé » se comprend comme « effacé » par beaucoup de gens. Le dire
    // évite l'appel paniqué du chargé de clientèle qui a cliqué par erreur.
    expect(etat.fait).toContain("Il n'est pas supprimé");
  });
});
