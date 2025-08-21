import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';
const REINDEX_SECRET = process.env.REINDEX_SECRET!;

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  occasion_tags?: string[] | null; // bila ada di DB
};

const TAG_SYNONYMS: Record<string,string[]> = {
  graduation: ['wisuda','kelulusan','lulus','toga','sarjana','graduation','yudisium','congrats','selamat'],
  condolence: ['duka','duka cita','belasungkawa','pemakaman','takziah','wreath','sympathy','condolence','rip'],
  birthday: ['ulang tahun','ultah','birthday','happy birthday'],
  romance: ['romantis','valentine','anniversary','cinta','romance'],
  thank_you: ['terima kasih','apresiasi','thank you'],
  get_well: ['lekas sembuh','get well','cepat sembuh']
};

const norm = (s: string) => (s || '').toLowerCase();

function detectOccasions(text: string): string[] {
  const x = norm(text);
  const tags: string[] = [];
  for (const key of Object.keys(TAG_SYNONYMS)) {
    if (TAG_SYNONYMS[key].some(w => x.includes(w))) tags.push(key);
  }
  return Array.from(new Set(tags));
}

function tagsText(tags?: string[] | null) {
  const t = tags ?? [];
  const syns = t.flatMap(tag => [tag, ...(TAG_SYNONYMS[tag] ?? [])]);
  return syns.join(' ');
}

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    model: `models/${GEMINI_EMBED_MODEL}`,
    content: { parts: [{ text }] }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gemini embed error: ${await res.text()}`);
  const data = (await res.json()) as { embedding: { values: number[] } };
  return data.embedding.values;
}

async function handler(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const url = new URL(req.url);
    const secretFromQuery = url.searchParams.get('secret');
    if (![REINDEX_SECRET, secretFromQuery].includes(REINDEX_SECRET) && bearer !== REINDEX_SECRET) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // Ambil produk (batasi bila perlu)
    const { data: list, error } = await supabase
      .from('products')
      .select('id,name,description,occasion_tags')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    for (const p of (list ?? []) as ProductRow[]) {
      const base = `${p.name}\n\n${p.description ?? ''}`;
      const heurTags = detectOccasions(base);
      // gabungkan: occasion_tags dari DB + hasil deteksi heuristik
      const mergedTags = Array.from(new Set([...(p.occasion_tags ?? []), ...heurTags]));
      const text = `${base}\n\n${tagsText(mergedTags)}`;

      const vec = await embed(text);

      // 1) simpan ke tabel product_embeddings (dipakai oleh RPC)
      const { error: upErr1 } = await supabase
        .from('product_embeddings')
        .upsert({ product_id: p.id, embedding: vec }, { onConflict: 'product_id' });
      if (upErr1) throw new Error(upErr1.message);

      // 2) optional: simpan juga ke kolom products.embedding (kalau diperlukan UI lain)
      const { error: upErr2 } = await supabase
        .from('products')
        .update({ embedding: vec, occasion_tags: mergedTags })
        .eq('id', p.id);
      if (upErr2) throw new Error(upErr2.message);

      // throttle kecil biar aman
      await new Promise(r => setTimeout(r, 150));
    }

    return NextResponse.json({ ok: true, count: list?.length ?? 0 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'reindex error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export const POST = handler;
export const GET = handler;
export const revalidate = 0;
