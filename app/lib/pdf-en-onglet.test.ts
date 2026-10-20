import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => {
  class ErreurApi extends Error {
    constructor(
      message: string,
      readonly statut: number | null,
    ) {
      super(message);
    }
  }
  return {
    ErreurApi,
    telecharger: vi.fn(async (chemin: string) => {
      if (chemin === "/refuse") throw new ErreurApi("Habilitation insuffisante.", 403);
      return { nom: "reçu « R-PRO-2026-0001 ».pdf", typeMime: "application/pdf", octets: new Uint8Array([37, 80, 68, 70]) };
    }),
  };
});

import { dispositionEnLigne, servirUnPdf } from "./pdf-en-onglet";

describe("servirUnPdf", () => {
  it("sert le PDF en ligne, sans cache ni devinette de type", async () => {
    const r = await servirUnPdf("/document");
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("rend le refus du backend, avec son statut", async () => {
    const r = await servirUnPdf("/refuse");
    expect(r.status).toBe(403);
    expect(await r.text()).toBe("Habilitation insuffisante.");
  });
});

describe("dispositionEnLigne", () => {
  it("encode un nom accentué, et garde un repli ASCII sans guillemet", () => {
    const d = dispositionEnLigne('reçu "R".pdf');
    expect(d).toContain(`filename="recu R.pdf"`);
    expect(d).toContain(`filename*=UTF-8''re%C3%A7u%20%22R%22.pdf`);
    // L'en-tête entier reste en ASCII : sinon le serveur le refuse.
    expect(/^[\x20-\x7e]*$/.test(d)).toBe(true);
  });
});
