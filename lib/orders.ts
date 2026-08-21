// Client-safe formatting helpers: no node: imports, safe for both the server
// and client bundles. Order-number generation lives in lib/order-number.ts
// (it requires node:crypto).

export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagada",
  cancelled: "Cancelada",
};
