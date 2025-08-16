import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

type SearchReq = { q: string; k?: number; maxPrice?: number };

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_EMBED_MODEL)}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = { content: { parts: [{ text }] } };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini embed error: ${await res.text()}`);
  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

export async function POST(req: Request) {
  try {
    const { q, k, maxPrice } = (await req.json()) as SearchReq;
    if (!q || !q.trim()) return NextResponse.json({ ok: true, items: [] });

    const v = await embed(q);
    const { data, error } = await supabase
      .rpc('match_products', {
        query_embedding: v,
        match_count: k ?? 8,
        max_price: maxPrice ?? null
      });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, items: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'search error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export const revalidate = 0;
