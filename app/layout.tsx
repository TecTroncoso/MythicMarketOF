import type {Metadata} from 'next';
import { WhatsAppWidget } from '@/components/WhatsAppWidget';
import './globals.css'; // Global styles

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

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        {children}
        <WhatsAppWidget />
      </body>
    </html>
  );
}
