// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

// vi.hoisted: fixtures must exist before the hoisted vi.mock factories run.
const { mockSearchGames, mockPush } = vi.hoisted(() => ({
  mockSearchGames: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/actions/search", () => ({
  searchGames: mockSearchGames,
  // Not used by this component, but the module exports it.
  searchStore: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { HomeSearchBar } from "./HomeSearchBar";

const GAME_HIT = {
  id: "mlbb",
  name: "Mobile Legends: Bang Bang",
  shortName: "MLBB",
  image: "/mlbb.png",
  path: "/topup/mlbb",
};

async function flushMs(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockSearchGames.mockResolvedValue([GAME_HIT]);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("HomeSearchBar", () => {
  it("searches games (not packages) after a 300ms debounce", async () => {
    render(<HomeSearchBar />);
    fireEvent.change(screen.getByLabelText("Buscar juegos"), { target: { value: "mobile" } });
    await flushMs(300);

    expect(mockSearchGames).toHaveBeenCalledWith("mobile");
    const option = screen.getByRole("option", { name: /Mobile Legends/ });
    expect(option).toBeInTheDocument();
  });

  it("navigates to the game top-up page on click", async () => {
    render(<HomeSearchBar />);
    fireEvent.change(screen.getByLabelText("Buscar juegos"), { target: { value: "mlbb" } });
    await flushMs(300);

    fireEvent.click(screen.getByRole("option", { name: /Mobile Legends/ }));
    expect(mockPush).toHaveBeenCalledWith("/topup/mlbb");
  });

  it("renders no dropdown when there are no matches", async () => {
    mockSearchGames.mockResolvedValueOnce([]);
    render(<HomeSearchBar />);
    fireEvent.change(screen.getByLabelText("Buscar juegos"), { target: { value: "zzz" } });
    await flushMs(300);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
