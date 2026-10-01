// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { PricesGameShell } from "./PricesGameShell";

const LIST = <div>CONTENIDO_LISTA_PRECIOS</div>;
const COMBOS = <div>CONTENIDO_COMBOS</div>;

afterEach(cleanup);

describe("PricesGameShell", () => {
  it("shows the price list by default (clean page)", () => {
    render(<PricesGameShell listContent={LIST} combosContent={COMBOS} />);

    const listPane = screen.getByText("CONTENIDO_LISTA_PRECIOS").closest("div[class*='transition-all']");
    const combosPane = screen.getByText("CONTENIDO_COMBOS").closest("div[class*='transition-all']");
    expect(listPane?.className).toContain("opacity-100");
    expect(combosPane?.className).toContain("opacity-0");
    expect(combosPane?.className).toContain("pointer-events-none");
    expect(screen.getAllByRole("button", { name: "Combos personalizados" })[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to the combos panel on click with the fade overlay", () => {
    render(<PricesGameShell listContent={LIST} combosContent={COMBOS} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Combos personalizados" })[0]);

    const combosWrapper = screen.getByText("CONTENIDO_COMBOS").closest("div[class*='transition-all']");
    const listWrapper = screen.getByText("CONTENIDO_LISTA_PRECIOS").closest("div[class*='transition-all']");
    expect(combosWrapper?.className).toContain("opacity-100");
    expect(listWrapper?.className).toContain("opacity-0");
    expect(listWrapper?.className).toContain("pointer-events-none");
  });

  it("switches back to the price list", () => {
    render(<PricesGameShell listContent={LIST} combosContent={COMBOS} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Combos personalizados" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Lista de precios" })[0]);

    const listWrapper = screen.getByText("CONTENIDO_LISTA_PRECIOS").closest("div[class*='transition-all']");
    expect(listWrapper?.className).toContain("opacity-100");
  });
});
