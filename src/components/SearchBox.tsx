'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SearchBox() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  useEffect(() => { setQ(sp.get('q') ?? ''); }, [sp]);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q)}`); }}
      className="flex items-center gap-2"
      role="search"
      aria-label="Cari buket"
    >
      <div className="relative">
        <input
          className="w-72 rounded-full border px-4 py-2 text-sm pr-9 outline-none ring-0 bg-white/80 border-[#ffd1dc]
                     focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20 transition"
          placeholder="Cari buket dengan keyword…"
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="Ketik kata kunci"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
      </div>
      <button className="btn-secondary" aria-label="Jalankan pencarian">Cari</button>
    </form>
  );
}
