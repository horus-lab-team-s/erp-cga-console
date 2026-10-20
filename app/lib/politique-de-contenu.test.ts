import { describe, expect, it } from "vitest";

import { politiqueDeContenu } from "./politique-de-contenu";

/**
 * La politique de contenu. Le 15 octobre 2026, `object-src` est passé de `'none'` à
 * `blob:` à la demande du cabinet (lecteur PDF de Chrome en secours de pdf.js) : ce test
 * garde que l'ouverture s'arrête là.
 */
describe("politiqueDeContenu", () => {
  const directives = new Map(
    politiqueDeContenu("NONCE")
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .map(([nom, ...valeurs]) => [nom, valeurs] as const),
  );

  it("n'admet en objet que les fichiers déjà reçus par la page", () => {
    expect(directives.get("object-src")).toEqual(["blob:"]);
    // Chrome monte son lecteur PDF dans un cadre : la même ouverture, et pas plus.
    expect(directives.get("frame-src")).toEqual(["blob:"]);
  });

  it("garde le reste fermé : scripts au nonce, aucune connexion vers un tiers, aucun cadre", () => {
    expect(directives.get("script-src")).toEqual(["'self'", "'nonce-NONCE'", "'strict-dynamic'"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("default-src")).toEqual(["'self'"]);
  });
});
