import './globals.css';
import Link from 'next/link';
import { Suspense } from 'react';              
import SearchBox from '@/components/SearchBox';
import ChatWidget from '@/components/ChatWidget';

export const metadata = {
  title: 'Bloomify — Toko Bunga + AI',
  description: 'Rekomendasi buket bunga dengan bantuan AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-white text-gray-800">
        <header className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b">
          <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">Bloomify</Link>
            <div className="flex items-center gap-4">
              <Suspense fallback={null}>
            <SearchBox />
          </Suspense>
              <Link href="/" className="hover:underline">Katalog</Link>
              <Link href="/cart" className="hover:underline">Keranjang</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <ChatWidget />   
        <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-gray-500">
          © {new Date().getFullYear()} Bloomify. Dibuat untuk MVP skripsi.
        </footer>
      </body>
    </html>
  );
}
