import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MiniEditeur } from "./MiniEditeur";

describe("MiniEditeur", () => {
  it("met la sélection en gras, et l'aperçu montre ce que lira le candidat", () => {
    render(<MiniEditeur nom="qualifications" libelle="Qualifications" valeurInitiale="Trois ans" />);
    const zone = screen.getByLabelText("Qualifications") as HTMLTextAreaElement;
    zone.setSelectionRange(0, 9);
    fireEvent.click(screen.getByRole("button", { name: "Gras" }));
    expect(zone.value).toBe("**Trois ans**");
    fireEvent.click(screen.getByRole("button", { name: "Aperçu" }));
    expect(screen.getByText("Trois ans").tagName).toBe("STRONG");
  });

  it("transforme les lignes choisies en liste", () => {
    render(<MiniEditeur nom="q" libelle="Q" valeurInitiale={"Licence\nPermis B"} />);
    const zone = screen.getByLabelText("Q") as HTMLTextAreaElement;
    zone.setSelectionRange(0, zone.value.length);
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(zone.value).toBe("- Licence\n- Permis B");
  });
});
