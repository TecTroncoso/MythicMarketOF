// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import {
  SUPPORT_FALLBACK_NUMBER,
  SUPPORT_WELCOME_MESSAGE,
} from "@/lib/support-schedule";
import { WhatsAppWidget } from "./WhatsAppWidget";

const waUrl = (message: string, number = SUPPORT_FALLBACK_NUMBER) =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

const openSpy = () => vi.spyOn(window, "open").mockImplementation(() => null);

const fetchOk = (body: object) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body });

const openButton = () =>
  screen.getByRole("button", { name: "Contactar por WhatsApp" });

const openPanel = () => fireEvent.click(openButton());

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

describe("WhatsAppWidget", () => {
  it("renders the floating button and no panel initially", () => {
    render(<WhatsAppWidget />);
    expect(openButton()).toBeInTheDocument();
    expect(screen.queryByText(SUPPORT_WELCOME_MESSAGE)).not.toBeInTheDocument();
  });

  it("opens the panel with the welcome message and input", () => {
    render(<WhatsAppWidget />);
    openPanel();

    expect(
      screen.getByRole("dialog", { name: "Chat de soporte por WhatsApp" })
    ).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_WELCOME_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Escribe tu mensaje...")
    ).toBeInTheDocument();
  });

  it("fetches the on-duty info once when the panel opens", async () => {
    const fetchMock = fetchOk({
      number: "5491136799182",
      label: "A",
      isOpen: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<WhatsAppWidget />);
    openPanel();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/support/on-duty");
    expect(screen.getByText("En línea")).toBeInTheDocument();
  });

  it("opens wa.me with the typed message using the on-duty number", async () => {
    const open = openSpy();
    vi.stubGlobal(
      "fetch",
      fetchOk({ number: "5491136799182", label: "A", isOpen: true })
    );

    render(<WhatsAppWidget />);
    openPanel();
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText("Escribe tu mensaje...");
    fireEvent.change(input, { target: { value: "Quiero hacer una compra" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      waUrl("Quiero hacer una compra", "5491136799182"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("opens wa.me with the typed message using the fallback number", async () => {
    const open = openSpy();
    // Resolves but without a number: fallback must be kept.
    vi.stubGlobal("fetch", fetchOk({}));

    render(<WhatsAppWidget />);
    openPanel();

    const input = screen.getByPlaceholderText("Escribe tu mensaje...");
    fireEvent.change(input, { target: { value: "Hola, consulta sobre MLBB" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      waUrl("Hola, consulta sobre MLBB"),
      "_blank",
      "noopener,noreferrer"
    );
    expect(input).toHaveValue("");
  });

  it("disables the send button when the input is empty", () => {
    render(<WhatsAppWidget />);
    openPanel();
    expect(screen.getByRole("button", { name: "Enviar mensaje" })).toBeDisabled();
  });

  it("falls back to the fallback number when fetch fails", async () => {
    const open = openSpy();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<WhatsAppWidget />);
    openPanel();

    const input = screen.getByPlaceholderText("Escribe tu mensaje...");
    fireEvent.change(input, { target: { value: "Hola" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      waUrl("Hola"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("shows the off-hours status when isOpen is false but sending still works", async () => {
    const open = openSpy();
    vi.stubGlobal(
      "fetch",
      fetchOk({ number: "5491136799182", label: null, isOpen: false })
    );

    render(<WhatsAppWidget />);
    openPanel();

    await waitFor(() =>
      expect(screen.getAllByText(/Fuera de horario/).length).toBeGreaterThan(0)
    );

    const input = screen.getByPlaceholderText("Escribe tu mensaje...");
    fireEvent.change(input, { target: { value: "Estado de mi pedido" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      waUrl("Estado de mi pedido", "5491136799182"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("closes the panel when the close button is clicked", () => {
    render(<WhatsAppWidget />);
    openPanel();
    expect(screen.getByText(SUPPORT_WELCOME_MESSAGE)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar chat" }));
    expect(screen.queryByText(SUPPORT_WELCOME_MESSAGE)).not.toBeInTheDocument();
  });

  it("sends the typed message when Enter is pressed in the input", async () => {
    const open = openSpy();

    render(<WhatsAppWidget />);
    openPanel();

    const input = screen.getByPlaceholderText("Escribe tu mensaje...");
    fireEvent.change(input, { target: { value: "Quiero hacer una compra" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open).toHaveBeenCalledWith(
      waUrl("Quiero hacer una compra"),
      "_blank",
      "noopener,noreferrer"
    );
    expect(input).toHaveValue("");
  });
});
