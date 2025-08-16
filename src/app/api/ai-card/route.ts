import { NextResponse } from 'next/server';
import { cacheKey, getFromCache, saveToCache } from '@/lib/aiCache';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export async function POST(req: Request) {
  try {
    const input = await req.json() as { occasion?: string; recipient?: string; tone?: 'romantis'|'formal'|'ceria'; maxWords?: number };

    const key = cacheKey('/api/ai-card', GEMINI_MODEL, input);
    const cached = await getFromCache(key);
    if (cached) return NextResponse.json({ ok: true, text: cached, cached: true });

    const system = `Tulis pesan kartu ucapan 1 paragraf, hangat, sopan, tanpa emoji, bahasa Indonesia.
Gaya: ${input.tone ?? 'romantis'}.
Panjang maks: ${input.maxWords ?? 35} kata.`;
    const user = `Occasion: ${input.occasion ?? 'anniversary'}
Untuk: ${input.recipient ?? 'pasangan'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const payload = { contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }]}] };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    await saveToCache(key, '/api/ai-card', GEMINI_MODEL, input, text);
    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'card error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
