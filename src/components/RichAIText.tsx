'use client';

import Link from 'next/link';

function extractSlugs(raw: string) {
  // 1) bersihkan formatting yang umum dipakai model
  const text = raw
    .replace(/\*\*/g, '')     // **bold**
    .replace(/`/g, '')        // `code`
    .replace(/\r/g, '')
    .replace(/\u2014/g, '-'); // em-dash → dash biasa

  const set = new Set<string>();

  // 2) tangkap pola: "slug:xxx", "slug: xxx", "Slug: xxx", "**Slug:** xxx", dll.
  //    - case-insensitive
  //    - boleh ada spasi setelah "slug" dan setelah ":" / "："
  //    - hanya huruf kecil, angka, dan dash (sesuai slug produk kita)
  const re = /\bslug\b\W*[:=]\W*([a-z0-9-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    set.add(m[1].toLowerCase());
  }

  return Array.from(set);
}

export default function RichAIText({ text }: { text: string }) {
  const slugs = extractSlugs(text);

  return (
    <div>
      {/* Teks AI asli */}
      <div className="whitespace-pre-wrap text-sm">{text}</div>

      {/* Chip slug + tombol tambah keranjang */}
      {slugs.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Produk disebut:</div>
          <div className="flex flex-wrap gap-2">
            {slugs.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center gap-2 border rounded-full px-3 py-1 text-sm"
                title={slug}
              >
                <Link className="underline" href={`/product/${slug}`}>/{slug}</Link>
                <button
                  className="text-xs px-2 py-0.5 border rounded-full"
                  onClick={() => {
                    const cart = JSON.parse(localStorage.getItem('cart') || '[]') as Array<{ slug: string; qty: number }>;
                    const exist = cart.find((c) => c.slug === slug);
                    if (exist) exist.qty += 1; else cart.push({ slug, qty: 1 });
                    localStorage.setItem('cart', JSON.stringify(cart));
                    alert(`Ditambahkan: ${slug}`);
                  }}
                >
                  + Keranjang
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
