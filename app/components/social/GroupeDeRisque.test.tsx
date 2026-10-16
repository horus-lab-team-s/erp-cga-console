import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/actions-social", () => ({
  enregistrerLeGroupeDeRisque: vi.fn(async () => ({ echec: null, fait: null })),
}));

import { GroupeDeRisque } from "./GroupeDeRisque";

describe("GroupeDeRisque", () => {
  it("dit que le groupe A est supposé tant que la notification n'est pas enregistrée", () => {
    render(
      <GroupeDeRisque dossier="N" etat={{ groupe: null, notifie_le: null }} peutEnregistrer aujourdhui="2026-10-16" />,
    );
    expect(screen.getByText("Groupe de risque CNPS non renseigné.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le groupe" }));
    expect(screen.getByLabelText("Date de la notification").getAttribute("max")).toBe("2026-10-16");
  });

  it("affiche le groupe notifié et sa date", () => {
    render(
      <GroupeDeRisque
        dossier="N"
        etat={{ groupe: "C", notifie_le: "2026-03-02" }}
        peutEnregistrer={false}
        aujourdhui="2026-10-16"
      />,
    );
    expect(screen.getByText("Groupe de risque CNPS : C")).toBeTruthy();
    expect(screen.getByText(/02\/03\/2026/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
