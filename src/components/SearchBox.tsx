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
      className="hidden md:flex items-center gap-2"
    >
      <input
        className="border rounded-xl px-3 py-1.5 text-sm"
        placeholder="Cari buket pakai bahasa alami…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <button className="px-3 py-1.5 rounded-xl border text-sm">Cari</button>
    </form>
  );
}
