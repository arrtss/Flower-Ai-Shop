import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

type Line = { slug: string; qty: number; };

export async function POST(req: Request) {
  try {
    const { customer, lines } = await req.json() as {
      customer: { name: string; email: string; address?: string; note?: string };
      lines: Line[];
    };

    if (!customer?.name || !customer?.email || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ ok: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const slugs = lines.map(l => l.slug);
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id,slug,price')
      .in('slug', slugs);

    if (prodErr) throw new Error(prodErr.message);
    if (!products || products.length === 0) throw new Error('Produk tidak ditemukan');

    let total = 0;
    const orderItems = lines.map(l => {
      const p = products.find(pr => pr.slug === l.slug);
      if (!p) throw new Error('Produk tidak valid: ' + l.slug);
      total += p.price * l.qty;
      return { product_id: p.id, quantity: l.qty, price: p.price };
    });

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_name: customer.name,
        customer_email: customer.email,
        address: customer.address || '',
        total,
        note: customer.note || ''
      })
      .select('id')
      .single();

    if (orderErr) throw new Error(orderErr.message);

    const payload = orderItems.map(oi => ({ ...oi, order_id: order!.id }));
    const { error: itemsErr } = await supabase.from('order_items').insert(payload);
    if (itemsErr) throw new Error(itemsErr.message);

    return NextResponse.json({ ok: true, orderId: order!.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
