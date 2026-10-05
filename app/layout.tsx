import type { Metadata } from 'next';
import { Bangers } from 'next/font/google';
import { WhatsAppWidget } from '@/components/WhatsAppWidget';
import './globals.css'; // Global styles

// Fuente display estilo brush/gruesa para títulos del hero.
const displayFont = Bangers({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Mythic Market | Recarga Diamantes Mobile Legends',
  description: 'Compra y recarga diamantes, Weekly Diamond Pass y Twilight Pass de Mobile Legends: Bang Bang. Entrega instantánea, pago seguro usando solo tu User ID.',
  keywords: ['Mobile Legends', 'Diamantes', 'MLBB', 'Recarga MLBB', 'Weekly Diamond Pass', 'Twilight Pass', 'Top-up MLBB', 'Mythic Market'],
  authors: [{ name: 'Mythic Market' }],
  creator: 'Mythic Market',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    title: 'Mythic Market | Recargar Diamantes MLBB',
    description: 'Recarga fácil, rápida y segura de diamantes para Mobile Legends usando solo tu User ID.',
    siteName: 'Mythic Market',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mythic Market | Diamantes de Mobile Legends',
    description: 'Recarga rápida de diamantes para MLBB. Entrega instantánea, pagos seguros.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={displayFont.variable}>
      <body suppressHydrationWarning>
        {/* Global backdrop as its own fixed layer instead of
            `background-attachment: fixed` on <body>: visually identical, but
            without the full-viewport repaint on every scroll frame that
            Safari mobile suffers from. Sits below the dark overlay and the
            scanlines defined in globals.css (same stacking order). */}
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/images/bg.webp')",
            zIndex: -20,
          }}
        />
        {children}
        <WhatsAppWidget />
      </body>
    </html>
  );
}
