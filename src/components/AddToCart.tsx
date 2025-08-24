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
    <button className="btn-primary mt-6" onClick={onClick} aria-label="Tambah ke keranjang">
      + Keranjang
    </button>
  );
}
