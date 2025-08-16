'use client';

import { useEffect, useRef, useState } from 'react';

type Tool = { action: 'add_to_cart'; slug?: string; qty?: number } | null;
type Msg = { role: 'user' | 'assistant'; content: string; tool?: Tool };

function addToCartLocal(slug: string, qty: number) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]') as Array<{ slug: string; qty: number }>;
  const found = cart.find(c => c.slug === slug);
  if (found) found.qty += qty; else cart.push({ slug, qty });
  localStorage.setItem('cart', JSON.stringify(cart));
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // start session (retry ringan)
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const r = await fetch('/api/chat/start', { method: 'POST' });
        const j = await r.json();
        if (!cancelled && j.ok) setSessionId(j.sessionId);
      } catch {
        setTimeout(() => { if (!cancelled && !sessionId) start(); }, 1000);
      }
    }
    if (!sessionId) start();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || !sessionId) return;
    setMsgs(m => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    const res = await fetch('/api/chat/message', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, text })
    });
    const data = await res.json();
    setLoading(false);
    setMsgs(m => [...m, { role: 'assistant', content: data.ok ? data.answer : ('Gagal: ' + data.error), tool: data.tool || null }]);
  }

  function handleTool(m: Msg) {
    if (!m.tool || m.tool.action !== 'add_to_cart' || !m.tool.slug) return null;
    const slug = m.tool.slug;
    const qty = Math.max(1, Number(m.tool.qty) || 1);
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-600">Tambah <code>/{slug}</code> x{qty} ke Keranjang?</span>
        <button
          className="text-xs px-2 py-1 border rounded"
          onClick={() => { addToCartLocal(slug, qty); alert(`Ditambahkan: ${slug} x${qty}`); }}
        >+ Keranjang</button>
        <button className="text-xs px-2 py-1 border rounded">Batal</button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 rounded-full px-5 py-3 shadow-lg border bg-white"
      >
        {open ? 'Tutup Chat' : 'Butuh Bantuan?'}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white border rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b font-medium">Chatbot Bloomify</div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl ${m.role === 'user' ? 'bg-black text-white ml-auto' : 'bg-gray-100'}`}>
                <div>{m.content}</div>
                {m.role === 'assistant' && handleTool(m)}
              </div>
            ))}
            {loading && <div className="text-xs text-gray-500">Mengetik…</div>}
            <div ref={endRef} />
          </div>
          <form className="p-2 border-t flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input
              className="flex-1 border rounded-xl px-3 py-2 text-sm"
              placeholder="Tulis pesan…"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button className="px-3 py-2 border rounded-xl text-sm" disabled={!sessionId || loading}>
              {!sessionId ? 'Menyiapkan…' : (loading ? 'Mengirim…' : 'Kirim')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
