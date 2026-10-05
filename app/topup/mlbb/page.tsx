import Link from 'next/link';
import { headers } from 'next/headers';
import { ChevronRight, Home } from 'lucide-react';
import { auth } from '@/auth';
import { Navbar } from '@/components/Navbar';
import { countryToRegion, PAYMENT_REGIONS } from '@/lib/payments';
import dynamic from 'next/dynamic';

const CheckoutSection = dynamic(() => import('@/components/CheckoutSection').then(mod => mod.CheckoutSection));

export default async function MobileLegendsStore({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  // Currency shown in the navbar = the visitor's region (EU -> EUR, LATAM -> USD),
  // same detection the checkout uses (edge geo headers).
  const h = await headers();
  const country = h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry');
  const region = countryToRegion(country);
  const currency = PAYMENT_REGIONS[region].currency;

  // Resolve the session ONCE on the server (JWT strategy: no DB hit) and hand
  // it to both the navbar and the checkout. Without this, UserMenu and
  // CheckoutSection each fetched /api/auth/session on every page view.
  const session = await auth();

  // Deep-link from the navbar search: ?product=<id> pre-selects the package.
  const { product: initialProductId } = await searchParams;

  return (
    <main className="min-h-screen bg-[#070417] text-white font-sans selection:bg-[#d946ef] selection:text-white pb-10">
      <Navbar session={session} currency={currency} />

      {/* Breadcrumbs + compartir (directamente sobre el hero) */}
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between text-xs text-slate-400 max-w-7xl mx-auto w-full">
        <nav className="flex items-center gap-1.5 min-w-0" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white transition-colors shrink-0" aria-label="Inicio">
            <Home className="w-3.5 h-3.5" />
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="hover:text-white cursor-pointer transition-colors whitespace-nowrap">Tienda</span>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="hover:text-white cursor-pointer transition-colors whitespace-nowrap truncate">
            Mobile Legends: Bang Bang
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-purple-300 whitespace-nowrap">Diamantes</span>
        </nav>
      </div>

      {/* Checkout premium: hero 2 columnas + tarjeta flotante + grid de diamantes */}
      <CheckoutSection
        isLoggedIn={Boolean(session?.user)}
        initialProductId={initialProductId}
      />
    </main>
  );
}