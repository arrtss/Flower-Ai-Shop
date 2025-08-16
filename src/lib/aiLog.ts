import { supabaseAdmin } from './supabaseAdmin';

export async function logAI(args: {
  route: string;
  model: string;
  input: unknown;
  output: string;
  latencyMs: number;
}) {
  await supabaseAdmin.from('ai_logs').insert({
    route: args.route,
    model: args.model,
    input_json: JSON.stringify(args.input),
    output_text: args.output,
    latency_ms: Math.max(0, Math.round(args.latencyMs)),
  });
}
