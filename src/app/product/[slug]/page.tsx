import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import AddToCart from '@/components/AddToCart';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: p } = await supabase
    .from('products')
    .select('id,name,slug,description,price,image_url')
    .eq('slug', slug)
    .maybeSingle<ProductRow>();

  if (!p) notFound();

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="rounded-2xl overflow-hidden card-bright">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image_url ?? ''} alt={p.name} className="w-full h-auto object-cover" />
      </div>

      <div className="flex flex-col">
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-neutral-900">{p.name}</h1>
        {p.description && <p className="mt-3 text-neutral-700">{p.description}</p>}

        <div className="mt-5 flex items-center gap-3">
          <span className="text-2xl md:text-3xl font-bold text-[--color-primary]">
            Rp {p.price.toLocaleString('id-ID')}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-[--rose-50] text-[--color-primary]">Siap dikirim</span>
        </div>

        <AddToCart slug={p.slug} />

        <div className="mt-8 grid gap-3 text-sm text-neutral-700">
          <div className="flex items-center gap-2"><span>🚚</span> <span>Pengantaran di hari yang sama (area tertentu)</span></div>
          <div className="flex items-center gap-2"><span>🎁</span> <span>Kartu ucapan gratis</span></div>
          <div className="flex items-center gap-2"><span>🌿</span> <span>Bunga segar berkualitas</span></div>
        </div>
      </div>
    </div>
  );
}
