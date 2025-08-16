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
        <h1 className="text-2xl font-semibold mb-4">Katalog</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(products as Product[] | null)?.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
      <div className="md:sticky md:top-24 h-max">
        <AIChat />
      </div>
    </div>
  );
}
