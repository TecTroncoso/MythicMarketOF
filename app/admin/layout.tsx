import { Navbar } from "@/components/Navbar";

// Admin chrome: navbar on top. Pages bring their OWN sidebar menu (the orders
// panel keeps its generic one; the supplier prices game page has a dedicated
// section menu) — they must not share one.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070417] text-white font-sans">
      <Navbar />
      {children}
    </main>
  );
}
