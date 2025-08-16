'use client';

import { useEffect, useState } from 'react';
import AICardMessage from '@/components/AICardMessage';

type CartLine = { slug: string; qty: number; };
type Product = { slug: string; name: string; price: number; image_url: string | null; };

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState({ name: '', email: '', address: '', note: '' });

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]') as CartLine[];
    setLines(cart);
    fetch('/api/products-by-slug', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: cart.map((c) => c.slug) })
    })
      .then(r => r.json()).then(d => setProducts(d.products))
      .finally(() => setLoading(false));
  }, []);

  const persist = (next: CartLine[]) => {
    setLines(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const inc = (slug: string) => {
    const next = lines.map(l => l.slug === slug ? { ...l, qty: l.qty + 1 } : l);
    persist(next);
  };
  const dec = (slug: string) => {
    const next = lines.map(l => l.slug === slug ? { ...l, qty: Math.max(1, l.qty - 1) } : l);
    persist(next);
  };
  const removeLine = (slug: string) => {
    const next = lines.filter(l => l.slug !== slug);
    persist(next);
  };

  const subtotal = lines.reduce((sum, l) => {
    const p = products.find(pr => pr.slug === l.slug);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);

  const placeOrder = async () => {
    if (!customer.name || !customer.email) { alert('Nama & email wajib diisi'); return; }
    if (lines.length === 0) { alert('Keranjang masih kosong'); return; }
    const res = await fetch('/api/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, lines })
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.removeItem('cart');
      alert(`Order dibuat! ID: ${data.orderId}`);
      window.location.href = '/';
    } else {
      alert('Gagal membuat order: ' + data.error);
    }
  };

  if (loading) return <p>Memuat...</p>;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Keranjang</h1>
        {lines.length === 0 ? <p>Keranjang kosong.</p> : (
          <ul className="space-y-4">
            {lines.map((l, i) => {
              const p = products.find(pr => pr.slug === l.slug);
              if (!p) return null;
              return (
                <li key={i} className="flex gap-4 items-center border rounded-xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url ?? ''} alt={p.name} className="w-20 h-20 object-cover rounded-lg border" />
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">Slug: /{p.slug}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="px-2 py-1 border rounded" onClick={() => dec(p.slug)}>-</button>
                      <span>Qty: {l.qty}</span>
                      <button className="px-2 py-1 border rounded" onClick={() => inc(p.slug)}>+</button>
                      <button className="ml-4 text-xs px-2 py-1 border rounded text-red-600" onClick={() => removeLine(p.slug)}>Hapus</button>
                    </div>
                  </div>
                  <div className="font-semibold">Rp {(p.price * l.qty).toLocaleString('id-ID')}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Checkout</h2>
        <div className="space-y-3">
          <input className="w-full border rounded-xl px-3 py-2" placeholder="Nama lengkap"
            value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })}/>
          <input className="w-full border rounded-xl px-3 py-2" placeholder="Email"
            value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })}/>
          <textarea className="w-full border rounded-xl px-3 py-2" placeholder="Alamat"
            value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })}/>
          <textarea className="w-full border rounded-xl px-3 py-2" placeholder="Catatan (opsional)"
            value={customer.note} onChange={e => setCustomer({ ...customer, note: e.target.value })}/>
        </div>

        <div className="mt-6">
          <AICardMessage />
        </div>

        <div className="mt-6 border rounded-2xl p-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">*MVP tanpa pembayaran online (dummy).</p>
          <button
            className="mt-4 w-full px-5 py-3 rounded-xl bg-black text-white disabled:opacity-50"
            disabled={lines.length === 0}
            onClick={placeOrder}
          >Buat Pesanan</button>
        </div>
      </div>
    </div>
  );
}
