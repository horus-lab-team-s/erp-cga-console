import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { numeros, Paginer } from "./Paginer";

const lignes = (n: number) => Array.from({ length: n }, (_, i) => <p key={i}>ligne {i + 1}</p>);

describe("Paginer", () => {
  it("ne change rien sous le seuil", () => {
    render(<Paginer>{lignes(10)}</Paginer>);
    expect(screen.getAllByText(/^ligne /)).toHaveLength(10);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("montre dix lignes, puis les suivantes", () => {
    render(<Paginer>{lignes(23)}</Paginer>);
    expect(screen.getAllByText(/^ligne /)).toHaveLength(10);
    expect(screen.getByText("1–10 sur 23")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByText("ligne 11")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(screen.getAllByText(/^ligne /)).toHaveLength(3);
    expect(screen.getByText("21–23 sur 23")).toBeTruthy();
  });
});

describe("numeros", () => {
  it("abrège les longues suites", () => {
    expect(numeros(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(numeros(5, 12)).toEqual([0, null, 4, 5, 6, null, 11]);
  });
});
