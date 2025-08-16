'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Item = {
  id: string; name: string; slug: string;
  description: string | null; price: number;
  image_url: string | null; similarity: number;
};

export default function SearchClient() {
  const sp = useSearchParams();
  const q = sp.get('q') ?? '';
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState<string>('');

  const run = useCallback(async () => {
    if (!q) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, maxPrice: budget ? Number(budget) : undefined })
      });
      const data = (await res.json()) as { items?: Item[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [q, budget]);

  useEffect(() => { run(); }, [run]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Hasil AI Search</h1>
      <div className="flex gap-2 mb-4">
        <input className="border rounded-xl px-3 py-2" placeholder="Maksimum budget (Rp)"
          value={budget} onChange={e => setBudget(e.target.value)} />
        <button className="px-4 py-2 rounded-xl border" onClick={run}>Terapkan</button>
      </div>
      {loading ? <p>Mencari…</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(p => (
            <Link key={p.id} href={`/product/${p.slug}`} className="border rounded-2xl overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url ?? ''} alt={p.name} className="aspect-[4/3] w-full object-cover"/>
              <div className="p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500 line-clamp-2">{p.description}</div>
                <div className="mt-1 font-semibold">Rp {p.price.toLocaleString('id-ID')}</div>
                <div className="text-xs text-gray-400">Skor: {(p.similarity*100).toFixed(0)}%</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {!loading && items.length === 0 && q && <p>Tidak ada hasil. Coba deskripsi lain.</p>}
    </div>
  );
}
