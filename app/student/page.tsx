'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/achievements');
  }, [router]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center text-xs text-slate-500 font-semibold">
      Đang chuyển sang Bảng Vàng Thành Tích...
    </div>
  );
}
