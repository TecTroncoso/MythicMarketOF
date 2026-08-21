"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Send, X } from "lucide-react";
import {
  SUPPORT_FALLBACK_NUMBER,
  SUPPORT_WELCOME_MESSAGE,
} from "@/lib/support-schedule";

type OnDutyResponse = {
  number?: string;
  label?: string | null;
  isOpen?: boolean;
};

export function WhatsAppWidget() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [supportNumber, setSupportNumber] = useState(SUPPORT_FALLBACK_NUMBER);
  const [supportOpen, setSupportOpen] = useState(true);
  const [message, setMessage] = useState("");
  const fetchedRef = useRef(false);

  // Graceful degradation: a failing API must never block contact, so any
  // error keeps the fallback number and the "open" status.
  const loadOnDuty = useCallback(async () => {
    try {
      const res = await fetch("/api/support/on-duty");
      if (!res.ok) return;
      const data = (await res.json()) as OnDutyResponse;
      if (data.number) setSupportNumber(data.number);
      if (data.isOpen === false) setSupportOpen(false);
    } catch {
      // keep fallback
    }
  }, []);

  const togglePanel = () => {
    if (!panelOpen && !fetchedRef.current) {
      fetchedRef.current = true;
      void loadOnDuty();
    }
    setPanelOpen((prev) => !prev);
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    window.open(
      `https://wa.me/${supportNumber}?text=${encodeURIComponent(trimmed)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setMessage("");
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage(message);
  };

  const timestamp = new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Contactar por WhatsApp"
        aria-expanded={panelOpen}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-colors hover:bg-[#1fb958]"
      >
        <svg
          viewBox="0 0 448 512"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
        </svg>
      </button>

      {panelOpen && (
        <section
          role="dialog"
          aria-label="Chat de soporte por WhatsApp"
          className="fixed bottom-24 right-5 z-50 flex h-[min(70vh,520px)] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <header className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-[#075E54] to-[#128C7E] px-4 py-3 text-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-[#075E54]">
              M
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold leading-tight">
                MythicMarket
              </h2>
              <p className="truncate text-xs text-white/80">
                {supportOpen
                  ? "En línea"
                  : "Fuera de horario — respondemos en el próximo turno"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Cerrar chat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#ECE5DD] p-3">
            {!supportOpen && (
              <p className="text-center text-xs text-gray-500">
                Fuera de horario — te respondemos en el próximo turno
              </p>
            )}
            <div className="flex">
              <div className="max-w-[85%] rounded-lg bg-white p-3 shadow-sm">
                <p className="text-sm leading-relaxed text-gray-800">
                  {SUPPORT_WELCOME_MESSAGE}
                </p>
                <p className="mt-1 text-right text-[10px] text-gray-400">
                  {timestamp}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 bg-white p-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Escribe tu mensaje..."
              aria-label="Escribe tu mensaje..."
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#25D366]"
            />
            <button
              type="button"
              onClick={() => sendMessage(message)}
              disabled={!message.trim()}
              aria-label="Enviar mensaje"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#1fb958] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <footer className="shrink-0 bg-white pb-2 text-center text-[11px] text-gray-500">
            Normalmente responde en unos minutos.
          </footer>
        </section>
      )}
    </>
  );
}
