import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "jeton" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { classerUneDemande, deposerUnePiece, recevoirUnePieceAuCabinet } = await import(
  "./actions-collecte"
);

/**
 * Le dépôt d'un justificatif — le geste le plus fait du produit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ CE GESTE EST FAIT PAR DES GENS QUI NE SONT PAS COMPTABLES, DEPUIS UN
 * TÉLÉPHONE, SUR UNE CONNEXION QUI TOMBE.
 *
 * Chacun de ces trois faits crée son défaut :
 *
 *   · **pas comptable** : le montant est saisi « 125 000 » ou « 125000,50 »,
 *     parce que c'est ainsi qu'on écrit un montant. Envoyé tel quel, le backend
 *     refuse, et l'adhérent ne recommence pas ;
 *   · **depuis un téléphone** : une photo fait facilement plus de 20 Mo. Le
 *     refus doit dire quoi faire, pas « erreur 413 » ;
 *   · **connexion qui tombe** : le dépôt est en DEUX appels. Une file hors
 *     ligne rejoue par construction, et l'adhérent doit lire « c'était déjà
 *     arrivé », jamais croire qu'il a envoyé deux fois.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Deux réponses d'affilée : le fichier, puis la pièce. */
function doublerFetch(...reponses: { corps: unknown; statut?: number }[]) {
  const doublure = vi.fn<typeof fetch>();
  for (const { corps, statut = 200 } of reponses) {
    doublure.mockResolvedValueOnce(
      new Response(JSON.stringify(corps), {
        status: statut,
        headers: { "content-type": "application/json" },
      }),
    );
  }
  vi.stubGlobal("fetch", doublure);
  return doublure;
}

const FICHIER_RENDU = { corps: { empreinte: "abc123", nom_fichier: "facture.pdf", deja_present: false } };
const PIECE_RENDUE = {
  corps: { piece: { identifiant: "P-0042", reference_document: null }, suspicions: [], a_arbitrer: false, rejeu: false },
};

function fichier(octets = 1024, nom = "facture.pdf"): File {
  return new File([new Uint8Array(octets)], nom, { type: "application/pdf" });
}

function formulaire(champs: Record<string, string | File>): FormData {
  const f = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) {
    if (valeur instanceof File) f.append(cle, valeur, valeur.name);
    else f.append(cle, valeur);
  }
  return f;
}

function corpsDeLaPiece(f: ReturnType<typeof doublerFetch>) {
  return JSON.parse((f.mock.calls[1][1] as RequestInit).body as string);
}

const VIDE = { echec: null, fait: null };
const DEPOT = { dossier: "M081234567890P", fichier: fichier() };

beforeEach(() => vi.unstubAllGlobals());

describe("Ce qui est refusé sans rien envoyer", () => {
  it("refuse un dépôt sans dossier", async () => {
    const f = doublerFetch();
    const etat = await deposerUnePiece(VIDE, formulaire({ dossier: "", fichier: fichier() }));
    expect(etat.echec).toContain("Dossier");
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse un dépôt sans fichier, ou avec un fichier vide", async () => {
    const f = doublerFetch();
    // ⚠️ Un fichier de zéro octet arrive quand la prise de vue a échoué : le
    // champ est « rempli », et rien n'est dedans.
    for (const f2 of [undefined, fichier(0)]) {
      const donnees = formulaire({ dossier: "M081234567890P" });
      if (f2) donnees.append("fichier", f2, f2.name);
      const etat = await deposerUnePiece(VIDE, donnees);
      expect(etat.echec).toContain("une photo ou un PDF");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuse au-delà de 20 Mo en disant quoi faire", async () => {
    const f = doublerFetch();
    const etat = await deposerUnePiece(
      VIDE,
      formulaire({ dossier: "M081234567890P", fichier: fichier(20 * 1024 * 1024 + 1) }),
    );
    // ⚠️ Le message donne la SORTIE : photographier en qualité normale, ou
    // envoyer un PDF allégé. « Fichier trop volumineux » laisse l'adhérent
    // devant un mur.
    expect(etat.echec).toContain("20 Mo");
    expect(etat.echec).toContain("qualité normale");
    // Rien n'est monté : envoyer 20 Mo pour se les faire refuser coûte le
    // forfait de l'adhérent.
    expect(f).not.toHaveBeenCalled();
  });

  it("accepte exactement 20 Mo, la borne étant inclusive", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    const etat = await deposerUnePiece(
      VIDE,
      formulaire({ dossier: "M081234567890P", fichier: fichier(20 * 1024 * 1024) }),
    );
    expect(etat.echec).toBeNull();
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("Le montant, tel qu'on l'écrit ici", () => {
  it("accepte les espaces des milliers et la virgule décimale", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    await deposerUnePiece(VIDE, formulaire({ ...DEPOT, montant_ttc: "125 000,50" }));
    expect(corpsDeLaPiece(f).montant_ttc).toBe("125000.50");
  });

  it("refuse un montant qui n'est pas un nombre, avec un exemple", async () => {
    const f = doublerFetch();
    const etat = await deposerUnePiece(VIDE, formulaire({ ...DEPOT, montant_ttc: "environ 125000" }));
    // Un exemple vaut mieux qu'une règle : « écrivez-le en chiffres, par
    // exemple 125000 ».
    expect(etat.echec).toContain("125000");
    expect(f).not.toHaveBeenCalled();
  });

  it("envoie `null` quand le montant n'est pas renseigné", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    await deposerUnePiece(VIDE, formulaire(DEPOT));
    // ⚠️ `null` dit « non renseigné ». Une chaîne vide dirait « un montant, et
    // il est vide », que le backend ne peut pas distinguer d'une saisie ratée.
    expect(corpsDeLaPiece(f).montant_ttc).toBeNull();
  });
});

describe("Les deux appels du dépôt", () => {
  it("envoie le fichier, puis déclare la pièce avec l'empreinte rendue", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    await deposerUnePiece(VIDE, formulaire(DEPOT));

    expect(String(f.mock.calls[0][0])).toContain("/collecte/fichiers");
    expect(String(f.mock.calls[1][0])).toContain("/collecte/pieces");
    // ⚠️ L'empreinte vient du BACKEND, qui l'a calculée sur les octets reçus.
    // Une empreinte forgée par la page serait refusée : le backend relit le
    // fichier et recalcule.
    expect(corpsDeLaPiece(f).empreinte).toBe("abc123");
    expect(corpsDeLaPiece(f).nom_fichier).toBe("facture.pdf");
  });

  it("laisse le backend dater le dépôt de l'adhérent", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    await deposerUnePiece(VIDE, formulaire(DEPOT));
    // ⚠️ `null` : le backend pose aujourd'hui. Une date déclarée n'est envoyée
    // que par le cabinet, pour une pièce reçue plus tôt et saisie maintenant.
    expect(corpsDeLaPiece(f).depose_le).toBeNull();
  });

  it("retombe sur un type indéterminé plutôt que de laisser le champ vide", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    await deposerUnePiece(VIDE, formulaire(DEPOT));
    expect(corpsDeLaPiece(f).type).toBe("INDETERMINE");
  });

  it("échappe le dossier dans l'adresse du premier appel", async () => {
    const f = doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    await deposerUnePiece(VIDE, formulaire({ ...DEPOT, dossier: "../pieces" }));
    expect(String(f.mock.calls[0][0])).toContain("..%2Fpieces");
  });
});

describe("Ce que l'adhérent lit après coup", () => {
  it("dit que c'était déjà arrivé, quand la file rejoue", async () => {
    doublerFetch(FICHIER_RENDU, {
      corps: { piece: { identifiant: "P-0042", reference_document: null }, suspicions: [], a_arbitrer: false, rejeu: true },
    });
    const etat = await deposerUnePiece(VIDE, formulaire(DEPOT));
    // ⚠️ La file hors ligne rejoue par construction. Sans ce message, l'adhérent
    // croit avoir envoyé deux fois le même document et appelle le cabinet.
    expect(etat.fait).toContain("déjà arrivé");
    expect(etat.fait).toContain("rien n'a été envoyé une seconde fois");
  });

  it("annonce un doublon possible sans accuser l'adhérent", async () => {
    doublerFetch(FICHIER_RENDU, {
      corps: { piece: { identifiant: "P-0042", reference_document: null }, suspicions: [{}], a_arbitrer: true, rejeu: false },
    });
    const etat = await deposerUnePiece(VIDE, formulaire(DEPOT));
    // « le cabinet vérifiera » : c'est une suspicion du moteur, pas une faute
    // de l'adhérent, et le ton doit le dire.
    expect(etat.fait).toContain("le cabinet vérifiera");
    expect(etat.echec).toBeNull();
  });

  it("dit à l'adhérent où retrouver sa pièce", async () => {
    doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    const etat = await deposerUnePiece(VIDE, formulaire(DEPOT));
    expect(etat.fait).toContain("vous la voyez ci-dessous");
  });
});

describe("La réception au cabinet", () => {
  it("exige de savoir comment la pièce est arrivée", async () => {
    const f = doublerFetch();
    const etat = await recevoirUnePieceAuCabinet(VIDE, formulaire({ ...DEPOT, canal: "" }));
    // Guichet, courriel ou WhatsApp : le canal est ce qui explique, six mois
    // plus tard, pourquoi la pièce n'est pas dans le portail.
    expect(etat.echec).toContain("au guichet, par courriel ou par WhatsApp");
    expect(f).not.toHaveBeenCalled();
  });

  it("n'accepte que les trois canaux du vocabulaire", async () => {
    const f = doublerFetch();
    // ⚠️ Le canal est une DONNÉE reprise dans les états du cabinet. Un canal
    // inventé — « GUICHET » au lieu de « DEPOT_CABINET », erreur que j'ai
    // faite en écrivant ces cas — produirait une ligne inclassable. L'écran
    // ne laisse passer que ce que le domaine connaît.
    for (const canal of ["GUICHET", "PORTAIL", "courriel", "AUTRE"]) {
      const etat = await recevoirUnePieceAuCabinet(VIDE, formulaire({ ...DEPOT, canal }));
      expect(etat.echec, `canal « ${canal} »`).toContain("Indiquez comment");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("accepte les trois canaux du cabinet, et eux seuls", async () => {
    for (const canal of ["DEPOT_CABINET", "COURRIEL", "WHATSAPP"]) {
      vi.unstubAllGlobals();
      doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
      const etat = await recevoirUnePieceAuCabinet(VIDE, formulaire({ ...DEPOT, canal }));
      expect(etat.echec, `canal « ${canal} »`).toBeNull();
    }
  });

  it("refuse une date de dépôt qui n'est pas une date", async () => {
    const f = doublerFetch();
    const etat = await recevoirUnePieceAuCabinet(
      VIDE,
      formulaire({ ...DEPOT, canal: "DEPOT_CABINET", depose_le: "la semaine dernière" }),
    );
    expect(etat.echec).toContain("jour, mois et année");
    expect(f).not.toHaveBeenCalled();
  });

  it("nomme la pièce et le dossier au cabinet, qui en reçoit cent par jour", async () => {
    doublerFetch(FICHIER_RENDU, PIECE_RENDUE);
    const etat = await recevoirUnePieceAuCabinet(VIDE, formulaire({ ...DEPOT, canal: "DEPOT_CABINET" }));
    expect(etat.fait).toContain("P-0042");
    expect(etat.fait).toContain("M081234567890P");
  });
});

describe("Classer une demande de pièce", () => {
  it("exige un motif, qui distingue une décision d'un abandon", async () => {
    const f = doublerFetch();
    const etat = await classerUneDemande(
      VIDE,
      formulaire({ demande: "D-001", motif: "non", confirmation: "oui" }),
    );
    expect(etat.echec).toContain("décision d'un abandon");
    expect(f).not.toHaveBeenCalled();
  });

  it("exige la confirmation, parce qu'une demande classée ne se relance plus", async () => {
    const f = doublerFetch();
    const etat = await classerUneDemande(
      VIDE,
      formulaire({ demande: "D-001", motif: "Pièce finalement inexistante, confirmé par l'adhérent.", confirmation: "non" }),
    );
    expect(etat.echec).toContain("ne se relance plus");
    expect(f).not.toHaveBeenCalled();
  });
});
