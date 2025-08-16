'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CartItem = { slug: string; qty: number };
type Product = { id: string; name: string; slug: string; price: number; image_url: string | null };

export default function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('cart') || '[]';
    const arr = JSON.parse(raw) as CartItem[];
    setItems(arr);
    (async () => {
      if (arr.length === 0) { setLoading(false); return; }
      const slugs = arr.map(i => i.slug);
      const res = await fetch('/api/products/by-slugs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs })
      });
      const data = (await res.json()) as { items: Product[] };
      const map: Record<string, Product> = {};
      for (const p of data.items) map[p.slug] = p;
      setProducts(map);
      setLoading(false);
    })();
  }, []);

  function remove(slug: string) {
    const next = items.filter(i => i.slug !== slug);
    setItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
  }

  const total = items.reduce((acc, it) => acc + (products[it.slug]?.price || 0) * it.qty, 0);

  if (loading) return <div>Memuat keranjang…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Keranjang</h1>
      {items.length === 0 ? (
        <p>Keranjang kosong. <Link className="underline" href="/">Belanja sekarang</Link></p>
      ) : (
        <div className="space-y-3">
          {items.map(it => {
            const p = products[it.slug];
            return (
              <div key={it.slug} className="flex items-center gap-3 border rounded-xl p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p?.image_url ?? ''} alt={p?.name ?? it.slug} className="w-20 h-16 object-cover rounded-lg"/>
                <div className="flex-1">
                  <div className="font-medium">{p?.name ?? it.slug}</div>
                  <div className="text-sm text-gray-500">/{it.slug} × {it.qty}</div>
                </div>
                <div className="font-semibold">Rp {(p ? p.price * it.qty : 0).toLocaleString('id-ID')}</div>
                <button className="text-sm px-3 py-1 border rounded-lg" onClick={() => remove(it.slug)}>Hapus</button>
              </div>
            );
          })}
          <div className="text-right font-semibold text-lg">Total: Rp {total.toLocaleString('id-ID')}</div>
        </div>
      )}
    </div>
  );
}
