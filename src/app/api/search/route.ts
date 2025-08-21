// src/app/api/search/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

type SearchReq = { q: string; k?: number; maxPrice?: number };

export type RpcMatchRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  similarity: number; // 0..1
};

type Intent =
  | 'graduation'
  | 'condolence'
  | 'birthday'
  | 'romance'
  | 'thank_you'
  | 'get_well'
  | null;

const OCC = {
  graduation: [
    'wisuda',
    'kelulusan',
    'lulus',
    'toga',
    'sarjana',
    'graduation',
    'yudisium',
    'congrats',
    'selamat',
  ],
  condolence: [
    'duka',
    'duka cita',
    'belasungkawa',
    'pemakaman',
    'takziah',
    'wreath',
    'sympathy',
    'condolence',
    'rip',
  ],
  birthday: ['ulang tahun', 'ultah', 'birthday', 'happy birthday'],
  romance: ['romantis', 'valentine', 'anniversary', 'cinta', 'romance'],
  thank_you: ['terima kasih', 'apresiasi', 'thank you'],
  get_well: ['lekas sembuh', 'get well', 'cepat sembuh'],
} as const;

const norm = (s: string) => (s || '').toLowerCase();

function guessOccasion(q: string): Intent {
  const x = norm(q);
  if (OCC.graduation.some((w) => x.includes(w))) return 'graduation';
  if (OCC.condolence.some((w) => x.includes(w))) return 'condolence';
  if (OCC.birthday.some((w) => x.includes(w))) return 'birthday';
  if (OCC.romance.some((w) => x.includes(w))) return 'romance';
  if (OCC.thank_you.some((w) => x.includes(w))) return 'thank_you';
  if (OCC.get_well.some((w) => x.includes(w))) return 'get_well';
  return null;
}

function expandQuery(q: string) {
  const intent = guessOccasion(q);
  const expanded = intent ? `${q} ${OCC[intent].join(' ')}` : q;
  return { intent, expanded };
}

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(
    GEMINI_API_KEY,
  )}`;
  const body = { model: `models/${GEMINI_EMBED_MODEL}`, content: { parts: [{ text }] } };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini embed error: ${await res.text()}`);
  const data = (await res.json()) as { embedding: { values: number[] } };
  return data.embedding.values;
}

/** Type guard agar tidak perlu `any` */
function isRpcMatchRowArray(x: unknown): x is RpcMatchRow[] {
  return (
    Array.isArray(x) &&
    x.every(
      (it) =>
        typeof it === 'object' &&
        it !== null &&
        'id' in it &&
        'similarity' in it,
    )
  );
}

export async function POST(req: Request) {
  try {
    const { q, k, maxPrice } = (await req.json()) as SearchReq;
    if (!q || !q.trim()) return NextResponse.json({ ok: true, items: [] });

    const { intent, expanded } = expandQuery(q);
    const v = await embed(expanded);

    // Tanpa generic → kompatibel di semua setup supabase-js
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: v,
      match_count: typeof k === 'number' ? k : 24,
      max_price: typeof maxPrice === 'number' ? maxPrice : null,
    });

    if (error) throw new Error(error.message);

    const rows: RpcMatchRow[] = isRpcMatchRowArray(data) ? data : [];

    const items: RpcMatchRow[] = rows
      .map((p): RpcMatchRow => {
        const txt = norm(`${p.name} ${p.description ?? ''}`);
        let bonus = 0;
        let malus = 0;

        if (intent === 'graduation') {
          if (OCC.graduation.some((w) => txt.includes(w))) bonus += 0.2;
          if (OCC.condolence.some((w) => txt.includes(w))) malus += 0.4;
        } else if (intent === 'condolence') {
          if (OCC.condolence.some((w) => txt.includes(w))) bonus += 0.2;
          if (OCC.graduation.some((w) => txt.includes(w))) malus += 0.25;
        }

        const finalScore = (p.similarity ?? 0) + bonus - malus;
        return { ...p, similarity: finalScore };
      })
      .sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'search error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export const revalidate = 0;
