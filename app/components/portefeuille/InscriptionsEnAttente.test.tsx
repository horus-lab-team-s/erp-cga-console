import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/actions-portefeuille", () => ({
  inscrireAuPortefeuille: vi.fn(async () => ({ echec: null, fait: null })),
}));

import type { EtatDeLInscription } from "@/app/lib/inscription-etats";
import { InscriptionsEnAttente } from "./InscriptionsEnAttente";

const ETAT: EtatDeLInscription = {
  reference: "dos-1",
  service: "PAIE",
  inscriptible: true,
  motif: null,
  inscrit_sous: null,
  proposition: {
    denomination: "Briqueterie du Wouri",
    telephone: "699221100",
    regime: "REEL",
    groupe_risque_cnps: "B",
    numero_cnps_employeur: "0912345678",
  },
};

describe("InscriptionsEnAttente", () => {
  it("préremplit le formulaire de ce que le dossier commercial sait déjà", () => {
    render(<InscriptionsEnAttente attente={[ETAT]} finDAnnee="2026-12-31" />);
    fireEvent.click(screen.getByRole("button", { name: "Inscrire au portefeuille" }));
    expect((screen.getByLabelText("Raison sociale") as HTMLInputElement).value).toBe("Briqueterie du Wouri");
    expect((screen.getByLabelText("Régime fiscal") as HTMLSelectElement).value).toBe("REEL");
    expect((screen.getByLabelText("Groupe de risque CNPS") as HTMLSelectElement).value).toBe("B");
    expect((screen.getByLabelText("N° employeur CNPS") as HTMLInputElement).value).toBe("0912345678");
    expect((screen.getByLabelText("NIU") as HTMLInputElement).value).toBe("");
  });
});
