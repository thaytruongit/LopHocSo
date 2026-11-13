'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, Star, Search, ArrowRight, Crown, Medal } from 'lucide-react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import { getClassesByTenant, getStudentsByTenant } from '@/lib/domain/data-repository';
import { ClassItem, GradeLevel, Student } from '@/lib/domain/types';

export default function AchievementsPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [filterScope, setFilterScope] = useState<'all' | 'grade' | 'class'>('all');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(7);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    const current = getCurrentUser();
    setUser(current);

    Promise.all([
      getClassesByTenant(current.tenantId),
      getStudentsByTenant(current.tenantId),
    ]).then(([clsList, stList]) => {
      setClasses(clsList);
      setStudents(stList);

      if (current.role === 'student' && current.studentGrade) {
        setSelectedGrade(current.studentGrade);
        const matchCls = clsList.find(
          (c) =>
            c.name === current.studentClass ||
            current.studentClass?.includes(c.name.replace('Lớp ', ''))
        );
        if (matchCls) {
          setSelectedClassId(matchCls.id);
          setFilterScope('class');
        }
      } else if (clsList[0]) {
        setSelectedClassId(clsList[0].id);
      }
    });
  }, []);

  const classesInGrade = useMemo(
    () => classes.filter((c) => c.grade === selectedGrade),
    [classes, selectedGrade]
  );

  const rankedStudents = useMemo(() => {
    let list = [...students];
    if (filterScope === 'class' && selectedClassId) {
      list = list.filter((s) => s.classId === selectedClassId);
    } else if (filterScope === 'grade') {
      const ids = new Set(classesInGrade.map((c) => c.id));
      list = list.filter((s) => ids.has(s.classId));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.totalXp - a.totalXp || b.averageGrade - a.averageGrade);
  }, [students, filterScope, selectedClassId, classesInGrade, searchQuery]);

  const myStudentData = useMemo(() => {
    if (!user?.studentCode) return null;
    return students.find((s) => s.studentCode === user.studentCode) || null;
  }, [students, user]);

  const myRank = useMemo(() => {
    if (!user?.studentCode) return null;
    const idx = rankedStudents.findIndex((s) => s.studentCode === user.studentCode);
    return idx >= 0 ? idx + 1 : null;
  }, [rankedStudents, user]);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-semibold">
        Đang tải bảng vàng thi đua...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Bảng Vàng Thi Đua · {user?.tenantName} · {students.length} Học Sinh
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            THÀNH TÍCH HỌC TẬP &amp; XẾP HẠNG XP
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Tuyên dương học sinh tích lũy điểm kinh nghiệm (XP) cao từ phiếu khám phá cặp đôi, luyện tập 7 câu và kiểm tra định kỳ.
          </p>
        </div>

        {myStudentData && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs shrink-0 space-y-2 min-w-[230px]">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>{myStudentData.fullName}</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white font-mono font-bold text-[10px]">
                {myRank ? `Hạng ${myRank}` : 'Tham gia'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1.5 border-t border-blue-200">
              <div>
                <div className="text-base font-extrabold font-mono text-blue-700 tabular-nums">
                  {myStudentData.totalXp}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold">Điểm XP</div>
              </div>
              <div>
                <div className="text-base font-extrabold font-mono text-amber-600 flex items-center justify-center gap-0.5 tabular-nums">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{myStudentData.badgesCount}</span>
                </div>
                <div className="text-[10px] text-slate-600 font-semibold">Huy hiệu</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOP 3 PODIUM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rankedStudents.slice(0, 3).map((st, idx) => (
          <div
            key={st.id}
            className={`rounded-2xl p-5 border flex flex-col justify-between gap-3 ${
              idx === 0
                ? 'bg-amber-50 border-amber-300'
                : idx === 1
                ? 'bg-slate-50 border-slate-300'
                : 'bg-orange-50/70 border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                Hạng #{idx + 1}
              </span>
              {idx === 0 ? (
                <Crown className="w-5 h-5 text-amber-500" />
              ) : (
                <Medal className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <div className="font-extrabold text-base text-slate-900">{st.fullName}</div>
              <div className="text-xs text-slate-600">
                {st.className} · Mã {st.studentCode}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 font-mono text-xs font-bold">
              <span className="text-blue-700 tabular-nums">{st.totalXp} XP</span>
              <span className="text-slate-700 tabular-nums">TB: {st.averageGrade}/10</span>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'grade', 'class'] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setFilterScope(sc)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
                filterScope === sc
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sc === 'all' ? 'Toàn trường' : sc === 'grade' ? 'Theo Khối' : 'Theo Lớp'}
            </button>
          ))}

          {filterScope !== 'all' && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value) as GradeLevel)}
              className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
            >
              {[6, 7, 8, 9].map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          )}

          {filterScope === 'class' && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
            >
              {classesInGrade.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm họ tên hoặc mã học sinh..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300"
          />
        </div>
      </div>

      {/* RANKING TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-center w-16">Hạng</th>
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4 text-center">Cấp Độ</th>
                <th className="py-3 px-4 text-right">Điểm XP</th>
                <th className="py-3 px-4 text-right">TB Môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedStudents.slice(0, 60).map((st, idx) => (
                <tr key={st.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{st.studentCode}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{st.fullName}</td>
                  <td className="py-3 px-4">{st.className}</td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums">Cấp {st.level}</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700 tabular-nums">
                    {st.totalXp} XP
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    {st.averageGrade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rankedStudents.length > 60 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
            Đang hiển thị Top 60 / {rankedStudents.length} học sinh. Dùng ô tìm kiếm hoặc bộ lọc Khối/Lớp để tra cứu nhanh.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Link
          href="/in-class"
          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Trophy className="w-4 h-4" />
          <span>Quay lại Lớp Học Số tích lũy thêm XP</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
