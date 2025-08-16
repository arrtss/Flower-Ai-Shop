import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';
const REINDEX_SECRET = process.env.REINDEX_SECRET!;

type ProductRow = { id: string; name: string; description: string | null };

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_EMBED_MODEL)}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = { content: { parts: [{ text }] } };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini embed error: ${await res.text()}`);
  const data = await res.json() as { embedding: { values: number[] } };
  return data.embedding.values;
}

async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const s = searchParams.get('secret');
    if (!REINDEX_SECRET || s !== REINDEX_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id,name,description')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    const list = (products ?? []) as ProductRow[];

    for (const p of list) {
      const text = `${p.name}\n\n${p.description ?? ''}`;
      const vec = await embed(text);
      const { error: upErr } = await supabase
        .from('product_embeddings')
        .upsert({ product_id: p.id, embedding: vec });
      if (upErr) throw new Error(upErr.message);
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({ ok: true, count: list.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'reindex error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export const POST = handler;
export const GET = handler;
export const revalidate = 0;
