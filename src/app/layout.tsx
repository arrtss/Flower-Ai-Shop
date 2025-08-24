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
      <body className="text-[--foreground] antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[--rose-50] text-[--color-primary]">🌸</span>
              <span className="font-semibold tracking-tight text-neutral-900">Bloomify</span>
            </Link>

            <div className="ml-auto hidden md:flex items-center gap-3 text-sm">
              <Link href="/" className="btn-secondary">Katalog</Link>
              <Link href="/cart" className="btn-secondary">Keranjang</Link>
            </div>

            <div className="hidden md:block">
              <Suspense>
                <SearchBox />
              </Suspense>
            </div>
          </nav>
          {/* bar gradasi tipis agar lebih hidup */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg,#ff6ea7 0%,#ffc36b 50%,#7cccb3 100%)' }}
          />
        </header>

        {/* Main */}
        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>

        {/* Floating Chat */}
        <ChatWidget />

        {/* Footer */}
        <footer className="mt-16">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-700 rounded-3xl card-bright">
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-900">Bloomify</h3>
                <p className="mt-2 text-gray-600">Buket segar, dikurasi AI. Cocok untuk ulang tahun, anniversary, dan kejutan spesial.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Bantuan</h3>
                <ul className="mt-2 space-y-1">
                  <li><Link href="/search" className="hover:text-[--color-primary]">Cari Buket</Link></li>
                  <li><Link href="/cart" className="hover:text-[--color-primary]">Lihat Keranjang</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Kontak</h3>
                <p className="mt-2 text-gray-600">CS WhatsApp • 09:00–18:00 WIB</p>
              </div>
            </div>
            <p className="mt-6 text-gray-500">© {new Date().getFullYear()} Bloomify.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
