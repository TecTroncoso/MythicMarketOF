import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });

  if (!order) {
    return new Response("No encontrada", { status: 404 });
  }

  if (order.userId !== session.user.id) {
    return new Response("Prohibido", { status: 403 });
  }

  // Dynamic import keeps the renderer out of the initial route chunk; the
  // Node runtime generates the PDF buffer via renderInvoicePDF.
  const { renderInvoicePDF } = await import("@/lib/invoice-pdf");

  const buffer = await renderInvoicePDF(order, session.user.email ?? "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="factura-${order.orderNumber}.pdf"`,
    },
  });
}