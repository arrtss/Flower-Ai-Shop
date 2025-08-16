import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cacheKey, getFromCache, saveToCache } from '@/lib/aiCache';
import { logAI } from '@/lib/aiLog'; 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export async function POST(req: Request) {
    const t0 = Date.now(); // ⬅
  try {
    const input = await req.json() as { occasion?: string; budget?: string; colors?: string; recipient?: string };

    const key = cacheKey('/api/ai', GEMINI_MODEL, input);
    const cached = await getFromCache(key);
    if (cached) {
      // log juga cache hit (latency sangat kecil)
      await logAI({ route: '/api/ai', model: GEMINI_MODEL, input, output: '[CACHE] ' + cached.slice(0, 200), latencyMs: Date.now() - t0 }); // ⬅
      return NextResponse.json({ ok: true, text: cached, cached: true });
    }

    const { data: products } = await supabase
      .from('products')
      .select('name,slug,description,price')
      .limit(20);

    const list = (products ?? [])
      .map(p => `- ${p.name} (Rp ${p.price.toLocaleString('id-ID')}) — slug:${p.slug}`)
      .join('\n');

    const system = `Kamu asisten florist.
Berikan 3 rekomendasi, dalam bahasa Indonesia, berpoin.
Wajib untuk tiap opsi:
- Sertakan baris: slug:<slug-produk> (tanpa spasi setelah titik dua, huruf kecil semua).
- Jika tidak ada produk yang cocok, tulis slug:-.
Contoh format 1 poin:
Nama — alasan — harga
slug:classic-white-vase
Akhiri jawaban dengan tips perawatan singkat.`;

    const user = `Occasion: ${input.occasion || '-'}
Budget: Rp ${input.budget || '-'}
Warna: ${input.colors || '-'}
Untuk: ${input.recipient || '-'}
Produk:
${list}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = { contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }]}], generationConfig: { temperature: 0.7, maxOutputTokens: 600 } };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Tidak ada respons dari AI.';

    await saveToCache(key, '/api/ai', GEMINI_MODEL, input, text);
    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
