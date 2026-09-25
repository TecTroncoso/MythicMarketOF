// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

// The server action is stubbed; navigation is observed through the router
// mock. vi.hoisted() initializes these BEFORE the (hoisted) vi.mock factories
// run — plain `const` would hit a TDZ error.
const { mockSearchStore, mockPush } = vi.hoisted(() => ({
  mockSearchStore: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/actions/search", () => ({
  searchStore: mockSearchStore,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { NavbarSearch } from "./NavbarSearch";

const HIT = {
  id: "78-diamonds-8-bonus",
  name: "78 Diamonds",
  label: "78 Diamonds + 8 Bonus",
  category: "diamonds",
  categoryLabel: "Diamonds",
  image: "/products/diamantes.png",
};

async function flushMs(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockSearchStore.mockResolvedValue([HIT]);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("NavbarSearch", () => {
  it("does not search for queries shorter than 2 chars", async () => {
    render(<NavbarSearch />);
    fireEvent.change(screen.getByLabelText("Buscar en la tienda"), { target: { value: "7" } });
    await flushMs(500);
    expect(mockSearchStore).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows debounced results and navigates on click", async () => {
    render(<NavbarSearch />);
    fireEvent.change(screen.getByLabelText("Buscar en la tienda"), { target: { value: "diamonds" } });
    await flushMs(300);

    expect(mockSearchStore).toHaveBeenCalledWith("diamonds");
    const option = screen.getByRole("option", { name: /78 Diamonds \+ 8 Bonus/ });
    fireEvent.click(option);

    expect(mockPush).toHaveBeenCalledWith("/topup/mlbb?product=78-diamonds-8-bonus");
  });

  it("hides the dropdown when the search returns nothing", async () => {
    mockSearchStore.mockResolvedValueOnce([]);
    render(<NavbarSearch />);
    fireEvent.change(screen.getByLabelText("Buscar en la tienda"), { target: { value: "zzz" } });
    await flushMs(300);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes the dropdown on Escape", async () => {
    render(<NavbarSearch />);
    fireEvent.change(screen.getByLabelText("Buscar en la tienda"), { target: { value: "diamonds" } });
    await flushMs(300);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText("Buscar en la tienda"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
