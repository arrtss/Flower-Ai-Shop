import Link from 'next/link';

export type Product = {
  id: string; name: string; slug: string;
  description: string | null; price: number; image_url: string | null;
};

const rupiah = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

export default function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      href={`/product/${p.slug}`}
      className="group block rounded-2xl border overflow-hidden card-bright hover:shadow-xl transition"
      aria-label={p.name}
    >
      <div className="relative aspect-[4/3] bg-white overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image_url ?? ''}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover transition group-hover:scale-[1.02]"
        />
        <div className="absolute left-3 top-3 text-xs px-2 py-1 rounded-full bg-[--rose-50] text-[--color-primary] shadow-sm">
          Baru
        </div>
      </div>

      <div className="p-4 space-y-1">
        <h3 className="font-semibold leading-tight line-clamp-2 text-neutral-900">{p.name}</h3>
        {p.description && (
          <p className="text-sm text-neutral-600 line-clamp-2">{p.description}</p>
        )}
        <div className="pt-2 flex items-center justify-between">
          <span className="font-semibold text-neutral-900">{rupiah(p.price)}</span>
          <span className="text-xs text-neutral-500 group-hover:text-[--color-primary] transition">Lihat detail →</span>
        </div>
      </div>
    </Link>
  );
}
