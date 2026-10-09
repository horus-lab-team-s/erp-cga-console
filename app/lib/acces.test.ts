import { describe, expect, it } from "vitest";

import type { Acces, Permission, Role } from "./acces";
import { detient, initiales, LIBELLES_ROLE, voit } from "./acces";

/**
 * Ce qu'une session permet, éprouvé sur la distinction qui coûte le plus cher.
 *
 * ⚠️ CES FONCTIONS NE PROTÈGENT RIEN, et c'est écrit dans leur en-tête : la
 * protection est côté serveur, à chaque appel. Elles servent à ne pas PROPOSER
 * ce qui sera refusé. Un défaut ici ne crée donc pas une faille — il crée un
 * bouton qui échoue, ce qui est pire qu'un bouton absent, ou un écran vide pour
 * quelqu'un qui avait le droit.
 */

function accesDe(partiel: Partial<Acces>): Acces {
  return {
    compte: "a.bouba",
    locataire: "cabinet-brcg",
    session: "jeton",
    nom_complet: "Aïcha BOUBA",
    roles: ["REVISEUR"],
    permissions: [],
    dossiers: [],
    facteur_fort: false,
    second_facteur_enrole: false,
    a_la_date: "2026-09-24",
    transverse: false,
    interne: true,
    ...partiel,
  };
}

describe("Le périmètre des dossiers", () => {
  it("distingue « tout le portefeuille » de « aucun dossier »", () => {
    const reviseur = accesDe({ dossiers: null });
    const nouveau = accesDe({ dossiers: [] });

    // ⚠️ LA DISTINCTION QUI COMMANDE TOUT. `null` veut dire « tout le cabinet »
    // — un réviseur, la direction. Une liste vide veut dire « aucun dossier »,
    // l'état d'un collaborateur habilité mais pas encore affecté. Les confondre
    // ferait voir TOUT LE CABINET à quelqu'un qui ne devait rien voir.
    expect(voit(reviseur, "M081234567890P")).toBe(true);
    expect(voit(nouveau, "M081234567890P")).toBe(false);
  });

  it("s'en tient à la liste quand elle existe", () => {
    const charge = accesDe({ dossiers: ["M081234567890P"] });

    expect(voit(charge, "M081234567890P")).toBe(true);
    expect(voit(charge, "P027788990011M")).toBe(false);
  });

  it("ne voit rien sans session", () => {
    expect(voit(null, "M081234567890P")).toBe(false);
  });
});

describe("Les permissions", () => {
  it("se lisent dans la liste rendue par le backend, jamais déduites du rôle", () => {
    // ⚠️ Un rôle ne vaut pas une permission. La correspondance vit au backend et
    // change avec lui : la déduire ici ferait afficher un geste que le serveur
    // refuse, ou cacher un geste permis.
    const reviseur = accesDe({
      roles: ["REVISEUR"],
      permissions: ["DEPOSER_DECLARATION", "REVISER_DOSSIER"] as Permission[],
    });

    expect(detient(reviseur, "DEPOSER_DECLARATION")).toBe(true);
    expect(detient(reviseur, "CLOTURER_EXERCICE")).toBe(false);
  });

  it("ne détient rien sans session", () => {
    expect(detient(null, "LIRE_DOSSIER")).toBe(false);
  });
});

describe("Les libellés de rôle", () => {
  it("nomment les neuf rôles comme le cabinet les nomme", () => {
    const attendus: Role[] = [
      "CHARGE_CLIENTELE",
      "COMPTABLE",
      "REVISEUR",
      "FISCALISTE",
      "CHARGE_FORMALITES",
      "DIRECTION",
      "ADMINISTRATEUR",
      "ADHERENT",
      "INSPECTEUR",
    ];
    expect(Object.keys(LIBELLES_ROLE).sort()).toEqual([...attendus].sort());
  });

  it("ne donnent jamais deux rôles le même nom", () => {
    // Deux rôles portant le même libellé rendraient l'écran des comptes
    // impossible à relire : on ne saurait plus qui peut quoi.
    const libelles = Object.values(LIBELLES_ROLE);
    expect(new Set(libelles).size).toBe(libelles.length);
  });

  it("n'affichent jamais le code technique", () => {
    for (const [code, libelle] of Object.entries(LIBELLES_ROLE)) {
      expect(libelle).not.toBe(code);
      expect(libelle).not.toMatch(/_/);
    }
  });
});

describe("Les initiales de la pastille d'identité", () => {
  it("prennent la première lettre des deux premiers mots", () => {
    expect(initiales("Aïcha BOUBA")).toBe("AB");
    expect(initiales("Jean-Paul NKOA")).toBe("JN");
  });

  it("s'arrêtent à deux, même sur un nom composé de quatre mots", () => {
    // Trois lettres déborderaient de la pastille, qui est ronde et fixe.
    expect(initiales("Marie Claire Estelle NGONO")).toBe("MC");
  });

  it("se contentent d'un mot", () => {
    expect(initiales("Bouba")).toBe("B");
  });

  it("ne rendent pas « undefined » sur une chaîne vide ou en blancs", () => {
    // ⚠️ Un nom manquant vient d'un compte mal renseigné, pas d'un bogue. La
    // pastille doit rester vide, pas afficher « UN ».
    expect(initiales("")).toBe("");
    expect(initiales("   ")).toBe("");
  });

  it("gardent l'accent en majuscule", () => {
    expect(initiales("Émile ATANGANA")).toBe("ÉA");
  });
});
