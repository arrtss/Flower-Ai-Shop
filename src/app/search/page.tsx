import { Suspense } from 'react';
import SearchClient from './SearchClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Mengambil parameter…</div>}>
      <SearchClient />
    </Suspense>
  );
}
