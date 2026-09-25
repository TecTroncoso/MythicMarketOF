import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Navbar } from "@/components/Navbar";

// Shared admin chrome: the site's navbar on top and the maqueta-style
// sidebar down the left for every /admin/* page. Each page renders only its
// own hero + content inside the right-hand column.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070417] text-white font-sans">
      <Navbar />
      <div className="flex min-h-[calc(100vh-100px)]">
        <AdminSidebar />
        <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 pb-16">
          {children}
        </div>
      </div>
    </main>
  );
}
