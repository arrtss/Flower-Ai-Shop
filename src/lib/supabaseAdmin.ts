import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,          // URL boleh pakai yang public
  process.env.SUPABASE_SERVICE_ROLE_KEY!          // KEY server-side (super power)
);
