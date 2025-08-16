import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

type Line = { slug: string; qty: number };
type Product = { name: string; slug: string; price: number };

export async function POST(req: Request) {
  try {
    const { lines, budgetExtra } = (await req.json()) as { lines: Line[]; budgetExtra?: number };

    const slugs = lines.map(l => l.slug);
    const { data: cartProducts, error: e1 } = await supabase
      .from('products').select('name,slug,price').in('slug', slugs);

    if (e1) throw new Error(e1.message);

    const { data: all, error: e2 } = await supabase
      .from('products').select('name,slug,price');

    if (e2) throw new Error(e2.message);

    const cartList = (cartProducts ?? []).map((p: Product) => `- ${p.name} (slug:${p.slug}, Rp ${p.price})`).join('\n');
    const pool = (all ?? []).map((p: Product) => `- ${p.name} (slug:${p.slug}, Rp ${p.price})`).join('\n');

    const system = `Kamu adalah asisten penjualan florist. Beri 1-3 rekomendasi upsell singkat yang cocok untuk isi keranjang. 
Pertimbangkan kecocokan tema & harga. Jawab bahasa Indonesia, poin-poin:
- Nama produk — alasan singkat — harga — slug
Jika budgetExtra ada, usahakan total rekomendasi <= budgetExtra.`;
    const user = `Isi keranjang:
${cartList || '(kosong)'}
Daftar produk yang tersedia:
${pool}
Budget tambahan maksimal: Rp ${budgetExtra ?? 'tidak ditentukan'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = { contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }]}] };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Tidak ada saran.';
    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'upsell error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
