import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';            // read-only (rpc)
import { supabaseAdmin } from '@/lib/supabaseAdmin';  // write bypass RLS
import { logAI } from '@/lib/aiLog';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

type ChatMsg = { role: 'user' | 'assistant'; content: string };
type KbMatch = { doc_id: string; content: string; chunk_index: number; similarity: number };
type ProdMatch = { name: string; slug: string; price: number };

type ToolPayload = {
  answer: string;
  action: 'add_to_cart' | 'none';
  slug?: string;
  qty?: number;
};

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_EMBED_MODEL
  )}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = { content: { parts: [{ text }] } };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { embedding?: { values: number[] } };
  if (!r.ok || !j.embedding?.values) throw new Error('Gemini embed error');
  return j.embedding.values;
}

/** Type guard: validasi bentuk JSON tool tanpa any */
function isToolPayload(obj: unknown): obj is ToolPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const validAction = o.action === 'add_to_cart' || o.action === 'none';
  const validAnswer = typeof o.answer === 'string';
  const validSlug = o.slug === undefined || typeof o.slug === 'string';
  const validQty = o.qty === undefined || typeof o.qty === 'number';
  return validAnswer && validAction && validSlug && validQty;
}

/** Ambil JSON murni dari output model (tahan terhadap ```json ... ``` atau teks campuran) */
function parseToolJSON(raw: string): ToolPayload | null {
  const cleaned = raw.replace(/```json|```/g, '').trim();

  // Coba parse seluruh string
  try {
    const parsed = JSON.parse(cleaned);
    if (isToolPayload(parsed)) return parsed;
  } catch {
    /* ignore */
  }

  // Fallback: cari blok {...} pertama
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const parsed = JSON.parse(m[0]);
      if (isToolPayload(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const { sessionId, text } = (await req.json()) as { sessionId: string; text: string };
    if (!sessionId || !text?.trim()) {
      return NextResponse.json({ ok: false, error: 'sessionId/text wajib' }, { status: 400 });
    }

    // 1) simpan pesan user (ADMIN)
    await supabaseAdmin
      .from('chat_messages')
      .insert({ session_id: sessionId, role: 'user', content: text });

    // 2) ambil memori singkat
    const histRes = await supabaseAdmin
      .from('chat_messages')
      .select('role,content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const history: ChatMsg[] = (histRes.data as ChatMsg[] | null) ?? [];

    // 3) RAG: KB + Produk (pakai embedding dari teks user)
    const qvec = await embed(text);

    const kbRes = await supabase.rpc('match_kb', { query_embedding: qvec, match_count: 3 });
    const kbMatches: KbMatch[] = (kbRes.data as KbMatch[] | null) ?? [];
    const kbContext = kbMatches.map((m, i) => `KB#${i + 1}: ${m.content}`).join('\n---\n');

    const prodRes = await supabase.rpc('match_products', {
      query_embedding: qvec,
      match_count: 5,
    });
    const prodMatches: ProdMatch[] = (prodRes.data as ProdMatch[] | null) ?? [];
    const prodList = prodMatches
      .map((p) => `- ${p.name} | slug:${p.slug} | harga: ${p.price}`)
      .join('\n');
    const allowedSlugs = prodMatches.map((p) => p.slug).join(', ');

    // 4) Prompt minta JSON saja
    const system = `Kamu chatbot toko bunga. Balas dalam JSON murni (tanpa teks lain).
Skema:
{
  "answer": "jawaban singkat ramah (bahasa Indonesia)",
  "action": "add_to_cart" | "none",
  "slug": "<slug-produk jika action add_to_cart>",
  "qty": <angka minimal 1 jika add_to_cart>
}
Ketentuan:
- Jika user tampak siap membeli, pilih satu produk dari daftar slug yang DIIZINKAN dan set action=add_to_cart.
- Jika tidak yakin atau tidak ada slug yang cocok, action="none".
- slug HARUS salah satu dari: [${allowedSlugs || '-'}].
- Jika ada info kebijakan, gunakan konten 'Sumber Toko' dan jangan mengarang.`;

    const memory = history
      .map((m) => `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}`)
      .join('\n');
    const user = `Pertanyaan: ${text}
Produk relevan (gunakan salah satu slug):
${prodList || '(tidak ada)'}
Sumber Toko (KB):
${kbContext || '(tidak ada)'}
Riwayat:
${memory}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = (await r.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!r.ok) throw new Error('Gemini generate error');

    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed =
      parseToolJSON(raw) ??
      ({
        answer: raw || 'Maaf, aku belum menemukan jawabannya.',
        action: 'none',
      } as const);

    // 6) simpan balasan (ADMIN)
    await supabaseAdmin
      .from('chat_messages')
      .insert({ session_id: sessionId, role: 'assistant', content: parsed.answer });

    await logAI({
      route: '/api/chat/message',
      model: GEMINI_MODEL,
      input: { text },
      output: `[${parsed.action}] ${parsed.answer}`.slice(0, 200),
      latencyMs: Date.now() - t0,
    });

    return NextResponse.json({
      ok: true,
      answer: parsed.answer,
      tool:
        parsed.action === 'add_to_cart'
          ? {
              action: 'add_to_cart',
              slug: parsed.slug,
              qty: Math.max(1, Number(parsed.qty) || 1),
            }
          : null,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await logAI({
      route: '/api/chat/message',
      model: GEMINI_MODEL,
      input: { error: true },
      output: errMsg,
      latencyMs: Date.now() - t0,
    });
    return NextResponse.json({ ok: false, error: errMsg }, { status: 400 });
  }
}
