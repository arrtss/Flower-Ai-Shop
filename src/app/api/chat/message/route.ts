import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAI } from '@/lib/aiLog';
// import 'server-only';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

type ToolPayload = {
  answer: string;
  action: 'add_to_cart' | 'none';
  slug?: string | null;
  qty?: number | null;
};

type Occasion =
  | 'get_well'
  | 'birthday'
  | 'anniversary'
  | 'romance'
  | 'graduation'
  | 'condolence'
  | 'new_baby'
  | 'thank_you';

type Slots = { occasion: Occasion | null; budget: number | null; colors?: string[] | null };

type ProductLite = { id: string; name: string; slug: string; price: number; image_url?: string | null };

// ---------- constants ----------
const RE_FENCE = /```(?:\s*json)?\s*([\s\S]*?)\s*```/i;
const BANNED_GET_WELL = /wreath|sympathy|condolence|funeral|graduation/i;

// ---------- tiny utils ----------
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const s = (o: Record<string, unknown>, k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined);
const n = (o: Record<string, unknown>, k: string) => (typeof o[k] === 'number' ? (o[k] as number) : undefined);
const nonneg = (x: number | null | undefined) => (typeof x === 'number' && x > 0 ? x : null);

const stripFence = (raw: string) =>
  (raw.match(RE_FENCE)?.[1] ?? raw).replace(/```(?:\s*json)?/gi, '').replace(/```/g, '').trim();

function parseToolJSON(raw: string): ToolPayload | null {
  const cleaned = stripFence(raw);
  const tryParse = (txt: string): ToolPayload | null => {
    try {
      const u = JSON.parse(txt) as unknown;
      if (isRecord(u) && typeof u.action === 'string') {
        const payload: ToolPayload = {
          answer: s(u, 'answer') ?? s(u, 'message') ?? s(u, 'text') ?? txt,
          action: u.action === 'add_to_cart' ? 'add_to_cart' : 'none',
          slug: 'slug' in u ? (s(u, 'slug') ?? null) : null,
          qty: 'qty' in u ? (n(u, 'qty') ?? null) : null,
        };
        // minimal guard
        if (typeof payload.answer === 'string' && (payload.action === 'add_to_cart' || payload.action === 'none')) return payload;
      }
      return null;
    } catch {
      return null;
    }
  };

  // 1) parse langsung
  const direct = tryParse(cleaned);
  if (direct) return direct;

  // 2) fallback: ambil {...} terluas
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  return a !== -1 && b > a ? tryParse(cleaned.slice(a, b + 1)) : null;
}

function mergeSlots(prev: Slots, next: Partial<Slots>): Slots {
  return {
    occasion: next.occasion ?? prev.occasion ?? null,
    budget: nonneg(next.budget) ?? prev.budget ?? null,
    colors: next.colors ?? prev.colors ?? null,
  };
}

// ---------- lightweight slot extractor (heuristic) ----------
function detectOccasion(text: string): Occasion | null {
  const t = text.toLowerCase();
  if (/(menjenguk|sakit|sembuh|rumah\s*sakit|hospital|\brs\b)/.test(t)) return 'get_well';
  if (/(duka|belasungkawa|wafat|jenazah|takziah)/.test(t)) return 'condolence';
  if (/wisuda|graduation/.test(t)) return 'graduation';
  if (/ulang\s*tahun|birthday/.test(t)) return 'birthday';
  if (/anniversary/.test(t)) return 'anniversary';
  if (/romantis|valentine|pacar/.test(t)) return 'romance';
  if (/bayi|newborn|lahir/.test(t)) return 'new_baby';
  if (/terima kasih|apresiasi|thank you/.test(t)) return 'thank_you';
  return null;
}

function detectBudget(text: string): number | null {
  const m = text.toLowerCase().match(/(\d[\d\.\,]*\s*[kK]?)/);
  if (!m) return null;
  let s = m[1].replace(/\s+/g, '');
  if (s.endsWith('k') || s.endsWith('K')) s = String(parseFloat(s) * 1000);
  const val = Number(s.replaceAll('.', '').replaceAll(',', ''));
  return Number.isFinite(val) && val > 0 ? val : null;
}

function detectColors(text: string): string[] | null {
  const map: Record<string, RegExp> = {
    white: /putih|white/i,
    yellow: /kuning|yellow/i,
    pink: /pink/i,
    purple: /ungu|lavender|purple/i,
    red: /merah|red/i,
    blue: /biru|blue/i,
    green: /hijau|green/i,
  };
  const picked = Object.entries(map)
    .filter(([, re]) => re.test(text))
    .map(([k]) => k);
  return picked.length ? picked : null;
}

function extractSlotsHeuristic(text: string): Partial<Slots> {
  return { occasion: detectOccasion(text), budget: detectBudget(text), colors: detectColors(text) };
}

// ---------- AI & product helpers ----------
async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_EMBED_MODEL
  )}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
  });
  const j = (await r.json()) as { embedding?: { values?: number[] } };
  if (!r.ok) throw new Error('Gemini embed error');
  return j.embedding?.values ?? [];
}

function filterOccasion(list: ProductLite[], occ: Occasion | null): ProductLite[] {
  return occ === 'get_well' ? list.filter((p) => !BANNED_GET_WELL.test(`${p.slug} ${p.name}`)) : list;
}

async function fallbackCandidates(slots: Slots): Promise<ProductLite[]> {
  // termurah sesuai budget + filter warna + anti-banned
  let q = supabase
    .from('products')
    .select('id,name,slug,price,image_url')
    .order('price', { ascending: true })
    .limit(24);
  if (slots.budget) q = q.lte('price', slots.budget * 1.1);

  const { data } = await q;
  let pool = filterOccasion((data ?? []) as ProductLite[], slots.occasion);

  if (slots.colors?.length) {
    const colorRe = new RegExp(slots.colors.join('|'), 'i');
    const colored = pool.filter((p) => colorRe.test(`${p.name} ${p.slug}`));
    if (colored.length) pool = colored;
  }
  if (!pool.length) {
    const { data: cheap } = await supabase
      .from('products')
      .select('id,name,slug,price,image_url')
      .order('price', { ascending: true })
      .limit(24);
    pool = filterOccasion((cheap ?? []) as ProductLite[], slots.occasion);
  }
  return pool.slice(0, 8);
}

// ---------- handler ----------
export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    const { sessionId, text } = (await req.json()) as { sessionId: string; text: string };
    if (!sessionId || !text?.trim()) return NextResponse.json({ ok: false, error: 'sessionId/text wajib' }, { status: 400 });

    // simpan user msg
    await supabaseAdmin.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: text });

    // slots lama + update dengan heuristik baru
    const sess = await supabaseAdmin.from('chat_sessions').select('slots').eq('id', sessionId).single();
    const prev: Slots = (sess.data?.slots as Slots) ?? { occasion: null, budget: null, colors: null };
    const slots = mergeSlots(prev, extractSlotsHeuristic(text));
    await supabaseAdmin.from('chat_sessions').update({ slots }).eq('id', sessionId);

    // history pendek
    const hist = await supabaseAdmin
      .from('chat_messages')
      .select('role,content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);
    const history: ChatMsg[] = (hist.data as ChatMsg[] | null) ?? [];

    // kandidat via ANN + fallback
    const qvec = await embed(text);
    const prodRes = await supabase.rpc('match_products_smart', {
      query_embedding: qvec,
      occ: slots.occasion,
      max_price: slots.budget,
      match_count: 8,
    });
    const ann = (prodRes.data as ProductLite[] | null) ?? [];
    let candidates = filterOccasion(ann, slots.occasion);

    let usedFallback = false;
    if (!candidates.length) {
      usedFallback = true;
      candidates = await fallbackCandidates(slots);
    }

    const prodList = candidates.map((p) => `- ${p.name} | slug:${p.slug} | harga:${p.price}`).join('\n');
    const allowedSlugs = candidates.map((p) => p.slug).join(', ');

    // KB opsional
    const kb = await supabase.rpc('match_kb', { query_embedding: qvec, match_count: 3 });
    const kbContext =
      ((kb.data as Array<{ content: string }> | null) ?? [])
        .map((m, i) => `KB#${i + 1}: ${m.content}`)
        .join('\n---\n') || '(tidak ada)';

    // prompt singkat & tegas
    const memory = history.map((m) => `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}`).join('\n');
    const guardGetWell =
      slots.occasion === 'get_well'
        ? `HINDARI 'wreath','sympathy','condolence','funeral','graduation'. Utamakan buket cerah (kuning/putih/pastel).`
        : '';

    const system = `Balas JSON murni:
{
  "answer": "balasan singkat ramah (ID), 1-3 kalimat",
  "action": "add_to_cart" | "none",
  "slug": "<slug jika add_to_cart>",
  "qty": <min 1 jika add_to_cart>
}
Aturan: pertimbangkan occasion=${slots.occasion ?? 'null'}, budget=${slots.budget ?? 'null'}, colors=${(slots.colors ?? []).join('/') || 'null'}.
Jika daftar DIIZINKAN tidak kosong → WAJIB pilih satu slug dari daftar (action="add_to_cart").
Slug HARUS salah satu dari: [${allowedSlugs || '-'}]. Jika daftar kosong → action="none". ${guardGetWell}`.trim();

    const userPrompt = `Pertanyaan: ${text}
Daftar produk DIIZINKAN:
${prodList || '(kosong)'}
Sumber Toko (KB):
${kbContext}
Riwayat:
${memory}`.trim();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: `${system}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 400, responseMimeType: 'application/json' },
    };

    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json();
    const raw = (j?.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? '';

    const parsed =
      parseToolJSON(raw) ??
      ({
        answer: stripFence(raw) || 'Maaf, aku belum menemukan jawabannya.',
        action: 'none',
        slug: null,
        qty: null,
      } as const);

    // simpan jawaban singkat
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: parsed.answer,
    });

    await logAI({
      route: '/api/chat/message',
      model: GEMINI_MODEL,
      input: { text, slots, usedFallback },
      output: `[${parsed.action}] ${parsed.answer}`.slice(0, 200),
      latencyMs: Date.now() - t0,
    });

    return NextResponse.json({
      ok: true,
      answer: parsed.answer,
      tool:
        parsed.action === 'add_to_cart'
          ? { action: 'add_to_cart' as const, slug: parsed.slug ?? null, qty: parsed.qty ?? null }
          : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await logAI({ route: '/api/chat/message', model: GEMINI_MODEL, input: { error: true }, output: msg, latencyMs: Date.now() - t0 });
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
