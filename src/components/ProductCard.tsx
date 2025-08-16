import Link from 'next/link';

export type Product = {
  id: string; name: string; slug: string;
  description: string | null; price: number; image_url: string | null;
};

export default function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/product/${p.slug}`} className="group block rounded-2xl border overflow-hidden hover:shadow-lg transition">
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image_url ?? ''} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{p.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>
        <p className="mt-2 font-semibold">Rp {p.price.toLocaleString('id-ID')}</p>
      </div>
    </Link>
  );
}
