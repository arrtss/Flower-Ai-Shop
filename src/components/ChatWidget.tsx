'use client';

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';

type Tool =
  | { action: 'add_to_cart'; slug: string | null; qty: number | null }
  | null;

type Msg = { role: 'user' | 'assistant'; content: string; tool?: Tool };

function addToCartLocal(slug: string, qty: number) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]') as Array<{ slug: string; qty: number }>;
  const found = cart.find((c) => c.slug === slug);
  if (found) found.qty += qty;
  else cart.push({ slug, qty });
  localStorage.setItem('cart', JSON.stringify(cart));
}

// ✅ helper aman untuk baca pesan error dari `unknown`
function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const r = await fetch('/api/chat/start', { method: 'POST' });
        const j = await r.json();
        if (!cancelled && j.ok) setSessionId(j.sessionId as string);
      } catch {
        setTimeout(() => {
          if (!cancelled && !sessionId) start();
        }, 1200);
      }
    }
    if (!sessionId) start();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || !sessionId) return;

    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, text }),
      });
      const data = await res.json();

      if (data.ok) {
        const tool: Tool =
          data.tool && data.tool.action === 'add_to_cart'
            ? {
                action: 'add_to_cart',
                slug: data.tool.slug ?? null,
                qty: data.tool.qty ?? null,
              }
            : null;

        setMsgs((m) => [
          ...m,
          {
            role: 'assistant',
            content: (data.answer as string) ?? 'Maaf, ada kesalahan.',
            tool,
          },
        ]);
      } else {
        setMsgs((m) => [...m, { role: 'assistant', content: `Gagal: ${data.error}` }]);
      }
    } catch (e: unknown) {
      // ⛳️ perbaikan utama: tidak pakai `any`
      const msg = toErrorMessage(e);
      setMsgs((m) => [...m, { role: 'assistant', content: `Gagal: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function ToolCard({ tool }: { tool: Exclude<Tool, null> }) {
    if (tool.action !== 'add_to_cart' || !tool.slug) return null;
    const qty = Math.max(1, Number(tool.qty) || 1);

    return (
      <div className="mt-2 rounded-lg border bg-white px-3 py-2 text-xs">
        <div className="font-medium mb-1">Rekomendasi cocok untukmu</div>
        <div className="mb-2">
          Produk: <span className="font-mono">{tool.slug}</span>
          <br />
          Qty: {qty}
        </div>
        <button
          className="rounded-md border px-3 py-1 text-xs"
          onClick={() => {
            addToCartLocal(tool.slug!, qty);
            setMsgs((m) => [...m, { role: 'assistant', content: `✅ Ditambahkan ke keranjang: ${tool.slug} × ${qty}` }]);
          }}
        >
          Tambahkan ke Keranjang
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 rounded-full px-5 py-3 shadow-lg border bg-white"
      >
        {open ? 'Tutup Chat' : 'Butuh Bantuan?'}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white border rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b font-medium">Chatbot Bloomify</div>

          <div className="flex-1 p-3 space-y-2 overflow-y-auto text-sm">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                  m.role === 'user' ? 'bg-black text-white ml-auto' : 'bg-gray-100'
                }`}
              >
                <div>{m.content}</div>
                {m.role === 'assistant' && m.tool && <ToolCard tool={m.tool as Exclude<Tool, null>} />}
              </div>
            ))}

            {loading && <div className="text-xs text-gray-500">Mengetik…</div>}
            <div ref={endRef} />
          </div>

          <form
            className="p-2 border-t flex gap-2"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="flex-1 border rounded-xl px-3 py-2 text-sm"
              placeholder="Tulis pesan…"
              value={input}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            />
            <button className="px-3 py-2 border rounded-xl text-sm" disabled={!sessionId || loading}>
              {!sessionId ? 'Menyiapkan…' : loading ? 'Mengirim…' : 'Kirim'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
