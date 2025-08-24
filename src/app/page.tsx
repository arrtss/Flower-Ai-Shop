import { supabase } from '@/lib/supabase';
import ProductCard, { type Product } from '@/components/ProductCard';
import AIChat from '@/components/AIChat';

export const revalidate = 0;

export default async function HomePage() {
  const { data: products } = await supabase
    .from('products')
    .select('id,name,slug,description,price,image_url')
    .order('created_at', { ascending: false });

  return (
    <div className="grid md:grid-cols-[1fr_380px] gap-8">
      <div>
        {/* HERO cerah */}
        <section className="mb-8 relative overflow-hidden rounded-3xl hero-candy p-6 md:p-10">
          <div className="max-w-xl">
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-neutral-900">
              Buket bunga cantik, dikurasi <span className="text-[--color-primary]">AI</span>
            </h1>
            <p className="mt-2 text-neutral-700">
              Ceritakan momenmu—AI kami akan merekomendasikan buket terbaik sesuai budget, warna, dan penerima.
            </p>
            <div className="mt-4 inline-flex items-center gap-3 text-sm text-neutral-700 flex-wrap">
              <span className="inline-flex items-center gap-1"><span>✔️</span><span>Pengantaran cepat</span></span>
              <span className="inline-flex items-center gap-1"><span>✔️</span><span>Kartu ucapan gratis</span></span>
              <span className="inline-flex items-center gap-1"><span>✔️</span><span>Dikurasi florist</span></span>
            </div>
          </div>
        </section>

        {/* KATALOG */}
        <h2 className="text-2xl font-semibold mb-4 text-neutral-900">Katalog</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(products as Product[] | null)?.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>

      {/* AI chat tetap sticky di desktop */}
      <div className="md:sticky md:top-24 h-max">
        <AIChat />
      </div>
    </div>
  );
}
