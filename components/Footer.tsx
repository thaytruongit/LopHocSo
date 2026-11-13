'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Monitor, ShieldCheck, Layers } from 'lucide-react';
import { getActiveTenantContext, getCurrentUser } from '@/lib/auth';
import { getAssetUrl } from '@/lib/asset-path';

export default function Footer() {
  const [tenantName, setTenantName] = useState('Trường THCS Mão Điền');
  const [teacherName, setTeacherName] = useState('Thầy Đỗ Mạnh Trường');
  const [role, setRole] = useState<'student' | 'teacher' | 'guest'>('guest');

  useEffect(() => {
    const sync = () => {
      const ctx = getActiveTenantContext();
      const user = getCurrentUser();
      setTenantName(ctx.tenantName);
      setTeacherName(ctx.teacherName);
      setRole(user.role);
    };
    sync();
    window.addEventListener('thso_session_change', sync);
    return () => window.removeEventListener('thso_session_change', sync);
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-7">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src={getAssetUrl('/images/tin_hoc_so_logo.jpg')}
              alt="Logo Tin học số"
              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-900 tracking-tight">
                TIN HỌC SỐ · {tenantName}
              </div>
              <p className="text-xs text-slate-500">
                Kiến trúc Multi-Tenant Sư phạm Chuẩn hóa · Phụ trách: <strong className="text-slate-700">{teacherName}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
            <Link href="/in-class" className="hover:text-blue-700 transition-colors">
              Lớp Học Số
            </Link>
            <Link href="/homework" className="hover:text-blue-700 transition-colors">
              Bài Tập Về Nhà
            </Link>
            <Link href="/self-study" className="hover:text-blue-700 transition-colors">
              Tự Học 116 Tiết
            </Link>
            <Link href="/exams" className="hover:text-blue-700 transition-colors">
              Kiểm Tra Định Kỳ
            </Link>
            <Link href="/achievements" className="hover:text-blue-700 transition-colors">
              Bảng Vàng XP
            </Link>
            <Link href="/gradebook" className="hover:text-blue-700 transition-colors">
              Sổ Điểm TT22
            </Link>
            {role === 'teacher' && (
              <Link href="/admin" className="text-blue-700 hover:text-blue-800 font-bold transition-colors">
                Quản Trị Multi-Tenant
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>116 Tiết (Khối 6–9) · 812 Câu hỏi củng cố · 8 Đề định kỳ</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cơ chế lưu trữ CDN Shard + IndexedDB 0 đồng</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Chương trình GDPT 2018 · Thông tư 22/2021/TT-BGDĐT</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
