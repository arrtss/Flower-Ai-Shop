import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';
const REINDEX_SECRET = process.env.REINDEX_SECRET!;

function chunkText(t: string, size = 500) {
  const out: string[] = [];
  for (let i = 0; i < t.length; i += size) out.push(t.slice(i, i + size));
  return out;
}

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_EMBED_MODEL)}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = { content: { parts: [{ text }] } };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini embed error: ${await res.text()}`);
  const data = (await res.json()) as { embedding: { values: number[] } };
  return data.embedding.values;
}

async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('secret') !== REINDEX_SECRET) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: docs, error } = await supabase.from('kb_docs').select('id,content,slug');
    if (error) throw new Error(error.message);

    for (const d of docs ?? []) {
      const chunks = chunkText(d.content as string);
      for (let idx = 0; idx < chunks.length; idx++) {
        const vec = await embed(chunks[idx]);
        const { error: upErr } = await supabase.from('kb_embeddings').upsert({
          doc_id: d.id as string,
          chunk_index: idx,
          content: chunks[idx],
          embedding: vec,
        });
        if (upErr) throw new Error(upErr.message);
        await new Promise((r) => setTimeout(r, 120));
      }
    }
    return NextResponse.json({ ok: true, countDocs: docs?.length ?? 0 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
export const GET = handler;
export const POST = handler;
