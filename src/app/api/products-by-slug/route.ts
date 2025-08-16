import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { slugs } = await req.json() as { slugs: string[] };
  const { data, error } = await supabase
    .from('products')
    .select('slug,name,price,image_url')
    .in('slug', slugs || []);
  if (error) return NextResponse.json({ products: [], error: error.message }, { status: 400 });
  return NextResponse.json({ products: data });
}
