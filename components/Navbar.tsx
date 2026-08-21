import Link from 'next/link';
import type { Session } from 'next-auth';
import { UserMenu } from './UserMenu';
import { BrandLogo } from './BrandLogo';

export function Navbar({ session }: { session?: Session | null }) {
  return (
    <header className="sticky top-0 z-50 bg-[#121824]/90 backdrop-blur-md border-b border-[#2a3441] shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <span className="cursor-not-allowed text-gray-500 flex items-center gap-1" title="Se implementará más tarde">
            Juegos <span className="text-[10px] bg-[#2a3441] text-gray-300 px-1.5 py-0.5 rounded-full">Próximamente</span>
          </span>
          <Link href="/" className="text-[#ffaa00]">Mobile Legends</Link>
        </nav>
        <div className="flex items-center gap-4">
          <UserMenu initialSession={session} />
        </div>
      </div>
    </header>
  );
}