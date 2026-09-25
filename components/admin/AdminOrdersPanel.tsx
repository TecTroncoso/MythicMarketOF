"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Loader2,
  PackageOpen,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { PRODUCTS } from '@/lib/catalog';
import { formatAmount, ORDER_STATUS_LABELS } from '@/lib/orders';
import { PAYMENT_METHOD_LABELS, buildComprobanteUrl } from '@/lib/payments';
import { searchAdminOrders, setOrderStatus, deleteOrder } from '@/lib/actions/admin';
import type { AdminOrderFilters, AdminOrderRow, AdminStats } from '@/lib/admin-orders';

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/40",
  paid: "bg-green-500/10 text-green-400 border-green-500/40",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/40",
};

// Maqueta: inputs oscuros sobre panel violeta.
const INPUT_STYLES =
  "w-full bg-[#070417] border border-purple-800/40 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-200 " +
  "placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/60 focus:shadow-[0_0_10px_rgba(217,70,239,0.25)] transition-all";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// ---------------------------------------------------------------------------
// Delta badges (real figures from stats.today / stats.yesterday)
// ---------------------------------------------------------------------------

interface DeltaBadgeProps {
  today: number;
  yesterday: number;
}

/** "+25% vs. ayer" — real daily percentage change for the stat card. */
function PercentDelta({ today, yesterday }: DeltaBadgeProps) {
  const flat = { text: "0% vs. ayer", cls: "text-gray-500" };
  if (yesterday === 0 && today === 0)
    return <span className={`text-xs font-bold ${flat.cls}`}>Sin cambios vs. ayer</span>;
  if (yesterday === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
        <TrendingUp className="w-3 h-3" /> Nuevo hoy
      </span>
    );
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
        <TrendingUp className="w-3 h-3" /> +{pct}% vs. ayer
      </span>
    );
  if (pct < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
        <TrendingDown className="w-3 h-3" /> {pct}% vs. ayer
      </span>
    );
  return <span className={`text-xs font-bold ${flat.cls}`}>{flat.text}</span>;
}

function TodayCounter({ count, toneClass }: { count: number; toneClass: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${toneClass}`}>
      <TrendingUp className="w-3 h-3" /> +{count} hoy
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat cards (maqueta: icono en círculo de color + etiqueta + valor + delta)
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Colored ring around the icon, e.g. "border-sky-500/50 text-sky-400". */
  iconClass: string;
  /** Border tint, e.g. "border-sky-500/40". */
  borderClass: string;
  valueClass?: string;
  delta: React.ReactNode;
}

function StatCard({ label, value, icon: Icon, iconClass, borderClass, valueClass = "text-white", delta }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border ${borderClass} bg-[#0d0824]/80 backdrop-blur-sm px-5 py-4 flex flex-col gap-3 shadow-[0_0_18px_rgba(0,0,0,0.4)]`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-black leading-none ${valueClass}`}>{value}</p>
      {delta}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner frame (marca las esquinas del contenedor, estilo maqueta)
// ---------------------------------------------------------------------------

function CornerFrame() {
  const base = "pointer-events-none absolute w-5 h-5 border-purple-500/60";
  return (
    <>
      <span className={`${base} top-0 left-0 border-t-2 border-l-2 rounded-tl-lg`} />
      <span className={`${base} top-0 right-0 border-t-2 border-r-2 rounded-tr-lg`} />
      <span className={`${base} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg`} />
      <span className={`${base} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg`} />
    </>
  );
}

// ---------------------------------------------------------------------------

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

  const { stats } = data;

  return (
    <>
      {/* ======== Stat cards (maqueta: icono + valor + delta real) ======== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Órdenes"
          value={String(stats.totalCount)}
          icon={Users}
          iconClass="border-sky-500/50 text-sky-400"
          borderClass="border-sky-500/30"
          valueClass="text-sky-300"
          delta={<PercentDelta today={stats.today.totalCount} yesterday={stats.yesterday.totalCount} />}
        />
        <StatCard
          label="Monto total"
          value={formatAmount(stats.totalAmountCents, "USD")}
          icon={CircleDollarSign}
          iconClass="border-fuchsia-500/50 text-fuchsia-400"
          borderClass="border-fuchsia-500/30"
          valueClass="text-fuchsia-200"
          delta={
            <PercentDelta
              today={stats.today.totalAmountCents}
              yesterday={stats.yesterday.totalAmountCents}
            />
          }
        />
        <StatCard
          label="Pendientes"
          value={String(stats.pendingCount)}
          icon={Loader2}
          iconClass="border-amber-500/50 text-amber-400"
          borderClass="border-amber-500/30"
          valueClass="text-amber-300"
          delta={<TodayCounter count={stats.today.pendingCount} toneClass="text-amber-400" />}
        />
        <StatCard
          label="Pagadas"
          value={String(stats.paidCount)}
          icon={CreditCard}
          iconClass="border-emerald-500/50 text-emerald-400"
          borderClass="border-emerald-500/30"
          valueClass="text-emerald-300"
          delta={<TodayCounter count={stats.today.paidCount} toneClass="text-emerald-400" />}
        />
        <StatCard
          label="Canceladas"
          value={String(stats.cancelledCount)}
          icon={XCircle}
          iconClass="border-rose-500/50 text-rose-400"
          borderClass="border-rose-500/30"
          valueClass="text-rose-300"
          delta={<TodayCounter count={stats.today.cancelledCount} toneClass="text-rose-400" />}
        />
      </div>

      {/* ======== Barra de filtros ======== */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="rounded-xl border border-purple-900/40 bg-[#0d0824]/80 p-4 mb-8 flex flex-wrap items-end gap-3 shadow-xl"
      >
        <label className="flex flex-col gap-1.5 min-w-36 flex-1 sm:flex-none">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Estado</span>
          <div className="relative">
            <select
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
              className="appearance-none w-full bg-[#070417] border border-purple-800/40 rounded-lg px-3 pr-8 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-fuchsia-500/60 transition-all cursor-pointer"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">▾</span>
          </div>
        </label>

        <label className="flex flex-col gap-1.5 min-w-36 flex-1 sm:flex-none">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Producto</span>
          <div className="relative">
            <select
              value={filters.productId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value || undefined }))}
              className="appearance-none w-full bg-[#070417] border border-purple-800/40 rounded-lg px-3 pr-8 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-fuchsia-500/60 transition-all cursor-pointer"
            >
              <option value="">Todos</option>
              {PRODUCTS.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">▾</span>
          </div>
        </label>

        <label className="flex flex-col gap-1.5 min-w-40">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Fecha desde</span>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
              className={INPUT_STYLES}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 min-w-40">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Fecha hasta</span>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
              className={INPUT_STYLES}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 flex-1 min-w-52">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Buscar</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={filters.q ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
              placeholder="Email, Nº orden o ID..."
              className={INPUT_STYLES}
            />
          </div>
        </label>

        <button
          type="button"
          onClick={() => setFilters({})}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-300 border border-purple-800/50 hover:border-fuchsia-500/60 hover:text-fuchsia-300 px-4 py-2.5 rounded-lg transition-all bg-[#070417]"
        >
          <RotateCcw className="w-4 h-4" />
          Limpiar
        </button>
      </form>

      {loading && (
        <p className="inline-flex items-center gap-2 text-xs font-bold text-fuchsia-300 mb-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
        </p>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-4 text-rose-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* ======== Tabla / empty state con marco de esquinas ======== */}
      <div className={`transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        {data.orders.length === 0 ? (
          <div className="relative rounded-xl border border-purple-900/40 bg-[#0d0824]/80 py-20 flex flex-col items-center text-center gap-4">
            <CornerFrame />
            <span className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.25)]">
              <PackageOpen className="w-8 h-8 text-cyan-400" />
            </span>
            <p className="text-gray-400 font-medium">No hay órdenes que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="relative rounded-xl border border-purple-900/40 bg-[#0d0824]/80 shadow-xl overflow-x-auto">
            <CornerFrame />
            <table className="w-full text-sm min-w-[1050px]">
              <thead>
                <tr className="border-b border-purple-900/40 text-left text-[11px] uppercase tracking-widest text-gray-500">
                  <th className="px-4 py-3 font-bold">Fecha</th>
                  <th className="px-4 py-3 font-bold">Orden</th>
                  <th className="px-4 py-3 font-bold">Cliente</th>
                  <th className="px-4 py-3 font-bold">Producto</th>
                  <th className="px-4 py-3 font-bold">Cuenta MLBB</th>
                  <th className="px-4 py-3 font-bold text-right">Importe</th>
                  <th className="px-4 py-3 font-bold">Pago</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-purple-900/20 last:border-0 hover:bg-purple-500/[0.04] transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-fuchsia-300 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{order.email}</td>
                    <td className="px-4 py-3 text-gray-300">{order.productName}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      <span className="font-mono text-gray-300">{order.mlbbUserId}</span> · Zona{" "}
                      <span className="font-mono text-gray-300">{order.zoneId}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-300 whitespace-nowrap">
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
                            className="text-xs font-semibold bg-transparent text-gray-300 border border-purple-800/50 hover:bg-purple-500/10 px-3 py-1.5 rounded-lg transition-colors"
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
                              className="text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/40 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </form>
                        )}
                        <form onSubmit={handleDelete} data-order-number={order.orderNumber}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 px-3 py-1.5 rounded-lg transition-colors"
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
