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
  // NOTE: di Next.js 15 params adalah Promise → tunggu dulu
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: product } = await supabase
    .from('products')
    .select('id,name,slug,description,price,image_url')
    .eq('slug', slug)
    .single();

  if (!product) return notFound();

  const p = product as ProductRow;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="rounded-2xl overflow-hidden border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image_url ?? ''} alt={p.name} className="w-full h-auto object-cover" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <p className="text-gray-500 mt-2">{p.description}</p>
        <p className="mt-4 text-xl font-bold">
          Rp {p.price.toLocaleString('id-ID')}
        </p>

        {/* Tombol interaktif dipindah ke Client Component */}
        <AddToCart slug={p.slug} />
      </div>
    </div>
  );
}
