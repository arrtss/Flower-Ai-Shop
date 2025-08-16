'use client';

import { useState } from 'react';
import RichAIText from './RichAIText';

export default function AIChat() {
  const [form, setForm] = useState({ occasion: '', budget: '', colors: '', recipient: '' });
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');

  const ask = async () => {
    setLoading(true); setAnswer('');
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    setAnswer(data.ok ? data.text : ('Gagal AI: ' + data.error));
  };

  return (
    <div className="border rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-2">Butuh rekomendasi AI?</h2>
      <div className="space-y-2">
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Occasion (ulang tahun, anniversary, wisuda...)"
          value={form.occasion} onChange={e => setForm({ ...form, occasion: e.target.value })} />
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Budget (mis. 300000)"
          value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Warna favorit (pink, putih, kuning...)"
          value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })} />
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Untuk siapa? (ibu, pasangan, sahabat...)"
          value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} />
        <button
          className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          onClick={ask}
          disabled={loading}
        >{loading ? 'Meminta rekomendasi...' : 'Dapatkan Rekomendasi'}</button>
      </div>
      {answer && (
        <div className="mt-4 bg-gray-50 border rounded-xl p-3">
          <RichAIText text={answer} />
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">
        *AI bisa menyebut <em>slug</em> produk. Klik slug atau gunakan tombol + Keranjang.
      </p>
    </div>
  );
}
