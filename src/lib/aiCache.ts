import { createHash } from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

export function cacheKey(route: string, model: string, input: unknown) {
  const raw = JSON.stringify({ route, model, input });
  return createHash('sha256').update(raw).digest('hex');
}

export async function getFromCache(key: string, maxAgeSeconds = 7 * 24 * 3600) {
  const { data, error } = await supabaseAdmin
    .from('ai_cache')
    .select('output_text, created_at, hits')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) return null;
  const age = (Date.now() - new Date(data.created_at).getTime()) / 1000;
  if (age > maxAgeSeconds) return null;

  await supabaseAdmin.from('ai_cache').update({ hits: (data.hits ?? 0) + 1 }).eq('key', key);
  return data.output_text as string;
}

export async function saveToCache(
  key: string, route: string, model: string, input: unknown, output: string
) {
  await supabaseAdmin.from('ai_cache').upsert({
    key, route, model, input_json: JSON.stringify(input), output_text: output
  });
}