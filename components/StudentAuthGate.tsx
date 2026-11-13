'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';

export default function StudentAuthGate({
  title = 'Vui Lòng Đăng Nhập Phòng Máy',
  description = 'Để đảm bảo học sinh chỉ truy cập đúng học liệu, bài tập và đề kiểm tra của lớp mình, hệ thống yêu cầu đăng nhập tài khoản học sinh hoặc giáo viên trước khi mở trang này.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{description}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors"
          >
            <span>Đăng nhập phòng máy ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
