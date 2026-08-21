"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PackageOpen, Search, Loader2 } from 'lucide-react';
import { PRODUCTS } from '@/lib/catalog';
import { formatAmount, ORDER_STATUS_LABELS } from '@/lib/orders';
import { PAYMENT_METHOD_LABELS, buildComprobanteUrl } from '@/lib/payments';
import { searchAdminOrders, setOrderStatus, deleteOrder } from '@/lib/actions/admin';
import type { AdminOrderFilters, AdminOrderRow, AdminStats } from '@/lib/admin-orders';

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/40",
  paid: "bg-green-500/10 text-green-400 border-green-500/40",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/40",
};

const INPUT_STYLES =
  "bg-[#0a0f1a] border border-[#2a3441] rounded-lg px-3 py-2 text-sm text-gray-200 " +
  "placeholder:text-gray-600 focus:outline-none focus:border-[#ffaa00]/50 transition-colors";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

interface StatsCardProps {
  label: string;
  value: string;
  valueClass?: string;
}

function StatsCard({ label, value, valueClass = "text-white" }: StatsCardProps) {
  return (
    <div className="bg-[#121824] rounded-2xl p-5 border border-[#1c2534] shadow-xl">
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

export function AdminOrdersPanel({
  initialOrders,
  initialStats,
  initialFilters,
}: {
  initialOrders: AdminOrderRow[];
  initialStats: AdminStats;
  initialFilters: AdminOrderFilters;
}) {
  const [filters, setFilters] = useState<AdminOrderFilters>(initialFilters);
  const [data, setData] = useState({ orders: initialOrders, stats: initialStats });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sequence guard: only the latest in-flight request may write state, so a
  // slow response can never overwrite a newer one.
  const seqRef = useRef(0);
  // The first render already shows server-fetched data; skip its debounce.
  const skipFirstRef = useRef(true);

  const load = useCallback(async (f: AdminOrderFilters) => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const result = await searchAdminOrders(f);
      if (seqRef.current === seq) {
        setData(result);
        setError(null);
      }
    } catch {
      if (seqRef.current === seq) setError('No se pudieron cargar las órdenes.');
    } finally {
      if (seqRef.current === seq) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      void load(filters);
    }, 300);
    return () => clearTimeout(t);
  }, [filters, load]);

  async function handleStatusChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await setOrderStatus(formData);
    if (result?.error) {
      // Surface the failure instead of swallowing it silently.
      setError(result.error);
      return;
    }
    // Refetch authoritative data; the action's revalidatePath stays in place.
    void load(filters);
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const orderNumber = form.getAttribute("data-order-number") ?? "";
    if (!window.confirm(`¿Borrar la orden ${orderNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const formData = new FormData(form);
    const result = await deleteOrder(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    void load(filters);
  }

  // Opens the wa.me link that pre-fills the payment receipt message to the
  // store's WhatsApp for Bizum and PayPal orders. The admin query does not
  // select paymentDetail, so the buyer phone falls back to empty until the row
  // includes it.
  function openComprobante(order: AdminOrderRow) {
    const withDetail = order as AdminOrderRow & { paymentDetail?: string };
    window.open(
      buildComprobanteUrl({
        orderNumber: order.orderNumber,
        productName: order.productName,
        amountCents: order.amountCents,
        currency: order.currency as "EUR" | "USD",
        mlbbUserId: order.mlbbUserId,
        zoneId: order.zoneId,
        buyerPhone: withDetail.paymentDetail ?? "",
        // The admin query does not expose the buyer name; keep it empty.
        buyerName: "",
        methodLabel: order.paymentMethod === "paypal" ? "PayPal" : "Bizum",
      }),
      "_blank"
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatsCard label="Órdenes" value={String(data.stats.totalCount)} />
        <StatsCard
          label="Monto total"
          value={formatAmount(data.stats.totalAmountCents, "USD")}
          valueClass="text-[#ffaa00]"
        />
        <StatsCard
          label="Pendientes"
          value={String(data.stats.pendingCount)}
          valueClass="text-amber-400"
        />
        <StatsCard label="Pagadas" value={String(data.stats.paidCount)} valueClass="text-green-400" />
        <StatsCard
          label="Canceladas"
          value={String(data.stats.cancelledCount)}
          valueClass="text-red-400"
        />
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="bg-[#121824] rounded-2xl p-5 border border-[#1c2534] shadow-xl mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Estado
          </span>
          <select
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
            className={INPUT_STYLES}
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Producto
          </span>
          <select
            value={filters.productId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value || undefined }))}
            className={INPUT_STYLES}
          >
            <option value="">Todos</option>
            {PRODUCTS.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Fecha desde
          </span>
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
            className={INPUT_STYLES}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Fecha hasta
          </span>
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
            className={INPUT_STYLES}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Buscar
          </span>
          <input
            type="text"
            value={filters.q ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
            placeholder="Email, Nº orden o ID MLBB"
            className={INPUT_STYLES}
          />
        </label>
        <div className="flex gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#ffaa00]">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando…
            </span>
          ) : (
            <span className="text-sm text-gray-500">Los filtros se aplican automáticamente</span>
          )}
          <button
            type="button"
            onClick={() => setFilters({})}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-[#1c2534] hover:bg-[#2a3441] border border-[#2a3441] px-4 py-2 rounded-lg transition-all"
          >
            <Search className="w-4 h-4" />
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-[#2a1215] border border-red-500/40 rounded-2xl p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      <div className={`transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        {data.orders.length === 0 ? (
          <div className="bg-[#121824] rounded-2xl p-10 border border-[#1c2534] shadow-xl flex flex-col items-center text-center gap-4">
            <PackageOpen className="w-12 h-12 text-gray-600" />
            <p className="text-gray-400 font-medium">No hay órdenes que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="bg-[#121824] rounded-2xl border border-[#1c2534] shadow-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[1050px]">
              <thead>
                <tr className="border-b border-[#1c2534] text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Orden</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 font-semibold">Cuenta MLBB</th>
                  <th className="px-4 py-3 font-semibold text-right">Importe</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#1c2534] last:border-0 hover:bg-[#0a0f1a]/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#ffaa00] whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{order.email}</td>
                    <td className="px-4 py-3 text-gray-300">{order.productName}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      <span className="font-mono text-gray-300">{order.mlbbUserId}</span> · Zona{" "}
                      <span className="font-mono text-gray-300">{order.zoneId}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#ffaa00] whitespace-nowrap">
                      {formatAmount(order.amountCents, order.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          STATUS_BADGE_STYLES[order.status] ??
                          "bg-gray-500/10 text-gray-400 border-gray-500/40"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        {(order.paymentMethod === "bizum" || order.paymentMethod === "paypal") && (
                          <button
                            type="button"
                            onClick={() => openComprobante(order)}
                            className="text-xs font-semibold bg-transparent text-gray-300 border border-[#2a3441] hover:bg-[#1c2534] px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Enviar comprobante
                          </button>
                        )}
                        {order.status !== "paid" && (
                          <form onSubmit={handleStatusChange}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="status" value="paid" />
                            <button
                              type="submit"
                              className="text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/40 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Aprobar
                            </button>
                          </form>
                        )}
                        {order.status !== "cancelled" && (
                          <form onSubmit={handleStatusChange}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="status" value="cancelled" />
                            <button
                              type="submit"
                              className="text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/40 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </form>
                        )}
                        <form onSubmit={handleDelete} data-order-number={order.orderNumber}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/40 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Borrar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
