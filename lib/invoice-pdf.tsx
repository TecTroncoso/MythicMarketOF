import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatAmount, ORDER_STATUS_LABELS } from "@/lib/orders";
import type { Order } from "@/lib/db/schema";

// Brand palette (matches the site: dark navy + gold)
const NAVY = "#0f172a";
const NAVY_SOFT = "#1e293b";
const GOLD = "#ffaa00";
const INK = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const STATUS_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
  pending: { bg: "#fef3c7", fg: "#b45309", border: "#f59e0b" },
  paid: { bg: "#d1fae5", fg: "#047857", border: "#10b981" },
  cancelled: { bg: "#fee2e2", fg: "#b91c1c", border: "#ef4444" },
};

interface InvoicePDFProps {
  order: Order;
  email: string;
}

export function renderInvoicePDF(order: Order, email: string): Promise<Buffer> {
  return renderToBuffer(<InvoicePDF order={order} email={email} />);
}

export function InvoicePDF({ order, email }: InvoicePDFProps) {
  const date = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(order.createdAt);

  const status = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;

  return (
    <Document>
      <Page
        size="A4"
        style={{
          padding: 36,
          fontFamily: "Helvetica",
          fontSize: 11,
          color: INK,
        }}
      >
        {/* Header band */}
        <View
          style={{
            backgroundColor: NAVY,
            borderRadius: 10,
            padding: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: GOLD, letterSpacing: 0.5 }}>
              MythicMarket
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: "#94a3b8",
                marginTop: 3,
                letterSpacing: 0.4,
              }}
            >
              MOBILE LEGENDS: BANG BANG — TOP-UPS
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: 3,
              }}
            >
              FACTURA
            </Text>
            <View
              style={{
                backgroundColor: NAVY_SOFT,
                borderRadius: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  color: GOLD,
                  fontWeight: "bold",
                  letterSpacing: 0.5,
                }}
              >
                Nº {order.orderNumber}
              </Text>
            </View>
          </View>
        </View>

        {/* Meta row: billed to + status */}
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 8,
              padding: 12,
              marginRight: 12,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "bold",
                color: MUTED,
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              FACTURADO A
            </Text>
            <Text style={{ fontSize: 11 }}>{email}</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{date}</Text>
          </View>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 8,
              padding: 12,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "bold",
                color: MUTED,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              ESTADO
            </Text>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: statusStyle.bg,
                borderWidth: 1,
                borderColor: statusStyle.border,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "bold", color: statusStyle.fg }}>
                {status}
              </Text>
            </View>
          </View>
        </View>

        {/* Order details table */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 8,
              fontWeight: "bold",
              color: MUTED,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            DETALLE DEL PEDIDO
          </Text>
          <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 8, overflow: "hidden" }}>
            {/* Table header */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: NAVY,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  flex: 3,
                  fontSize: 9,
                  fontWeight: "bold",
                  color: "#e2e8f0",
                  letterSpacing: 0.6,
                }}
              >
                PRODUCTO
              </Text>
              <Text
                style={{
                  flex: 2,
                  fontSize: 9,
                  fontWeight: "bold",
                  color: "#e2e8f0",
                  letterSpacing: 0.6,
                }}
              >
                CUENTA MLBB
              </Text>
              <Text
                style={{
                  flex: 1.2,
                  fontSize: 9,
                  fontWeight: "bold",
                  color: GOLD,
                  letterSpacing: 0.6,
                  textAlign: "right",
                }}
              >
                IMPORTE
              </Text>
            </View>
            {/* Table body */}
            <View
              style={{
                flexDirection: "row",
                paddingVertical: 12,
                paddingHorizontal: 12,
                backgroundColor: "#ffffff",
              }}
            >
              <View style={{ flex: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold" }}>{order.productName}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={{ fontSize: 11 }}>ID {order.mlbbUserId}</Text>
                <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>Zona {order.zoneId}</Text>
              </View>
              <Text
                style={{
                  flex: 1.2,
                  fontSize: 11,
                  fontWeight: "bold",
                  textAlign: "right",
                }}
              >
                {formatAmount(order.amountCents, order.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Total */}
        <View style={{ alignItems: "flex-end" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#fff7e6",
              borderWidth: 1,
              borderColor: GOLD,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: INK,
                letterSpacing: 0.5,
                marginRight: 28,
              }}
            >
              TOTAL
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#b45309" }}>
              {formatAmount(order.amountCents, order.currency)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View
          style={{
            marginTop: 48,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: BORDER,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 9, color: MUTED }}>
            MythicMarket · Top-ups de Mobile Legends
          </Text>
          <Text style={{ fontSize: 9, color: MUTED }}>
            ¿Dudas? Contáctanos por WhatsApp · {order.orderNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
}