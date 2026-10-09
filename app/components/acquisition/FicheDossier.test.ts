import { describe, expect, it } from "vitest";

import { messageWhatsapp, numeroWhatsapp } from "./FicheDossier";

/**
 * La voie WhatsApp de la proforma : le numéro et le message.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 *
 * Les deux fonctions étaient **exportées et jamais éprouvées**. Constaté le
 * 29 septembre en vérifiant le volet WhatsApp de bout en bout : l'export
 * annonçait l'intention de les tester, rien ne le faisait.
 *
 * Or `numeroWhatsapp` est exactement ce qui casse en silence. `wa.me` refuse le
 * `+`, les espaces et le zéro initial : un numéro mal formé n'échoue pas, il
 * ouvre une conversation avec le mauvais correspondant, ou avec personne. Le
 * responsable croit avoir envoyé la proposition, et le client ne reçoit rien.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("Le numéro que wa.me accepte", () => {
  it("ajoute l'indicatif camerounais à un numéro local à neuf chiffres", () => {
    expect(numeroWhatsapp("699887766")).toBe("237699887766");
  });

  it("retire le plus, les espaces et les points d'un numéro déjà international", () => {
    expect(numeroWhatsapp("+237 699 88 77 66")).toBe("237699887766");
    expect(numeroWhatsapp("+237.699.887.766")).toBe("237699887766");
  });

  it("laisse tel quel un numéro étranger déjà complet", () => {
    // Un fondateur qui vit à Paris reste joignable : on ne lui colle pas 237.
    expect(numeroWhatsapp("+33612345678")).toBe("33612345678");
  });
});

describe("Le message envoyé au client", () => {
  const message = messageWhatsapp("Sylvie NGONO", "PRO-2026-0042", "250000", "https://exemple.cm/p");

  it("nomme le client, la proforma, le montant et le lien", () => {
    expect(message).toContain("Sylvie NGONO");
    expect(message).toContain("PRO-2026-0042");
    expect(message).toContain("https://exemple.cm/p");
  });

  it("écrit le montant groupé, comme le client le lit sur sa proforma", () => {
    // ⚠️ `250000` brut dans un message qui réclame de l'argent se lit mal et
    // s'interprète mal. `toLocaleString("fr-FR")` insère l'espace des milliers ;
    // ce cas fige le résultat plutôt que la méthode, parce que c'est le texte
    // reçu qui compte.
    const groupe = (250000).toLocaleString("fr-FR");
    expect(message).toContain(`${groupe} FCFA`);
    expect(message).not.toContain("250000 FCFA");
  });

  it("reprend le modèle soumis à la plateforme, mot pour mot", () => {
    // ⚠️ Le texte de `Docs/referentiel/messagerie/modeles/cga_envoi_proforma.yaml`.
    // Le jour où l'envoi passera par la plateforme, le client doit lire la même
    // chose — sinon deux clients reçoivent deux messages pour un même geste.
    expect(message).toContain("votre proforma n° PRO-2026-0042 est prête");
    expect(message).toContain("Vous pouvez la consulter ici");
    expect(message).toContain("Répondez à ce message");
  });
});
