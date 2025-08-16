'use client';

type Props = { slug: string };
type CartItem = { slug: string; qty: number };

export default function AddToCart({ slug }: Props) {
  const onClick = () => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    const exist = cart.find((it) => it.slug === slug);
    if (exist) exist.qty += 1; else cart.push({ slug, qty: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Ditambahkan ke keranjang!');
  };

  return (
    <button className="mt-6 px-5 py-3 rounded-xl bg-black text-white" onClick={onClick}>
      Tambah ke Keranjang
    </button>
  );
}
